"""Post-call background processing (Phases 15, 22-26).

After a call ends: saves the recording, generates an AI summary, syncs to
Google Sheets, classifies MDP states, calculates the composite reward,
and computes per-turn engagement scores -- all with graceful fallbacks.
"""

import asyncio
from datetime import datetime, timezone

from app.api.routes.call_logs import add_report
from app.api.routes.companies import _companies
from app.models.call_report import CallReport, SheetSyncStatus
from app.models.rl import EngagementScore, MDPState
from app.services import engagement_tracker, reward_engine, sheets_client, state_classifier, storage, telephony_session
from app.services.audio_codec import mulaw_to_wav8k
from app.services.llm import generate_call_report


async def process_completed_call(call_sid: str) -> None:
    """Build and store a call report for a just-ended call, and sync to Google Sheets."""
    session = telephony_session.get_session(call_sid)
    if session is None:
        return

    company = _companies.get(session.company_id)
    if company is None:
        return

    audio_bytes = telephony_session.pop_audio(call_sid)
    recording_url = ""
    if audio_bytes:
        wav_bytes = mulaw_to_wav8k(audio_bytes)
        recording_url = await asyncio.to_thread(storage.save_recording, call_sid, wav_bytes)

    started_at = session.started_at
    ended_at = session.ended_at or datetime.now(timezone.utc)
    duration_seconds = (ended_at - started_at).total_seconds()

    summary, sentiment, outcome = await asyncio.to_thread(
        generate_call_report, company, session.turns
    )

    # Phase 22: MDP state classification.
    mdp_states: list[MDPState] = await asyncio.to_thread(
        state_classifier.classify_turns, session.turns
    )

    # Phase 23: Composite reward calculation.
    breakdown = await asyncio.to_thread(
        reward_engine.calculate_reward, outcome, session.turns, duration_seconds, mdp_states
    )

    # Phase 26: Per-turn engagement scores.
    raw_scores = telephony_session.pop_engagement_scores(call_sid)
    if raw_scores:
        eng_scores = [
            EngagementScore(turn_index=ti, score=s, triggered_adaptation=s < 0.4)
            for ti, s in raw_scores
        ]
    else:
        eng_scores = await asyncio.to_thread(
            engagement_tracker.compute_engagement_scores, session.turns
        )

    report = CallReport(
        id=call_sid,
        company_id=session.company_id,
        from_number=session.from_number,
        to_number=session.to_number,
        started_at=started_at,
        ended_at=ended_at,
        duration_seconds=duration_seconds,
        turns=session.turns,
        recording_url=recording_url,
        summary=summary,
        sentiment=sentiment,
        outcome=outcome,
        sheet_sync_status=SheetSyncStatus.pending,
        created_at=datetime.now(timezone.utc),
        reward_score=breakdown.total,
        reward_breakdown=breakdown,
        mdp_states=mdp_states,
        engagement_scores=eng_scores,
    )

    report.sheet_sync_status = await asyncio.to_thread(
        sheets_client.append_call_row, company.name, report
    )

    add_report(report)
