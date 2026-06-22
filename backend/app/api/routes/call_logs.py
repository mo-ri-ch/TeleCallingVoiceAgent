"""Post-call reports (Phases 15, 22-26): AI summaries, sentiment, outcomes,
recording links, Google Sheets sync, MDP states, rewards, and engagement data."""

import math
from array import array
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.call_report import CallOutcome, CallReport, CallSentiment, SheetSyncStatus
from app.models.rl import EngagementScore, MDPState, RewardBreakdown, TurnReward
from app.models.telephony import TelephonyTurn, TurnRole
from app.services import storage
from app.services.audio_codec import TELEPHONY_SAMPLE_RATE, pcm16_to_wav

router = APIRouter(prefix="/call-logs", tags=["call-logs"])

MAX_REPORTS = 100

_call_reports: dict[str, CallReport] = {}
# Most recent call_sids first.
_call_report_order: list[str] = []


def add_report(report: CallReport) -> None:
    """Store a newly generated call report, most-recent first."""
    _call_reports[report.id] = report
    if report.id in _call_report_order:
        _call_report_order.remove(report.id)
    _call_report_order.insert(0, report.id)
    del _call_report_order[MAX_REPORTS:]


def _sample_tone_wav(duration_seconds: float = 2.0, frequency: float = 440.0) -> bytes:
    """A short sine-wave tone, used as a placeholder recording for seed data."""
    sample_count = int(TELEPHONY_SAMPLE_RATE * duration_seconds)
    amplitude = 8000
    samples = array(
        "h",
        (
            int(amplitude * math.sin(2 * math.pi * frequency * i / TELEPHONY_SAMPLE_RATE))
            for i in range(sample_count)
        ),
    )
    return pcm16_to_wav(samples, TELEPHONY_SAMPLE_RATE)


def _seed() -> None:
    recording_url = storage.save_recording("seed-call-1", _sample_tone_wav())

    seed_reports = [
        CallReport(
            id="seed-call-1",
            company_id="bridgeon-skillversity",
            from_number="+91 98470 00001",
            to_number="+91 80000 00001",
            started_at=datetime(2026, 6, 14, 11, 2, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 6, 14, 11, 5, 30, tzinfo=timezone.utc),
            duration_seconds=210,
            turns=[
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="Hello! Thank you for calling Bridgeon Skillversity. I'm Priya, how can I help you today?",
                    at=datetime(2026, 6, 14, 11, 2, 2, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.caller,
                    text="Hi, I wanted to know more about the MERN Stack course -- duration and fees.",
                    at=datetime(2026, 6, 14, 11, 2, 20, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="The MERN Stack course runs for 16 weeks and covers MongoDB, Express, React, and Node.js, with a placement-focused capstone project.",
                    at=datetime(2026, 6, 14, 11, 2, 35, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.caller,
                    text="That sounds great, please add me to the next batch.",
                    at=datetime(2026, 6, 14, 11, 5, 10, tzinfo=timezone.utc),
                ),
            ],
            recording_url=recording_url,
            summary=(
                "Caller asked about the MERN Stack course duration and fees.\n"
                "Agent explained the 16-week curriculum and placement-focused capstone.\n"
                "Caller asked to be added to the next batch."
            ),
            sentiment=CallSentiment.positive,
            outcome=CallOutcome.interested,
            sheet_sync_status=SheetSyncStatus.synced,
            created_at=datetime(2026, 6, 14, 11, 5, 31, tzinfo=timezone.utc),
            reward_score=0.78,
            reward_breakdown=RewardBreakdown(outcome_reward=0.7, micro_rewards=0.16, efficiency_penalty=0.0, total=0.78, turn_rewards=[TurnReward(turn_index=i, base_reward=0.04, td_credit=0.78*(0.9**i)) for i in range(4)]),
            mdp_states=[
                MDPState(turn_index=0, phase="opening", customer_sentiment="neutral", objections_raised=0),
                MDPState(turn_index=1, phase="discovery", customer_sentiment="positive", objections_raised=0),
                MDPState(turn_index=2, phase="pitch", customer_sentiment="positive", objections_raised=0),
                MDPState(turn_index=3, phase="closing", customer_sentiment="positive", objections_raised=0),
            ],
            engagement_scores=[
                EngagementScore(turn_index=1, score=0.70, triggered_adaptation=False),
                EngagementScore(turn_index=3, score=0.85, triggered_adaptation=False),
            ],
        ),
        CallReport(
            id="seed-call-2",
            company_id="bridgeon-skillversity",
            from_number="+91 98470 00002",
            to_number="+91 80000 00001",
            started_at=datetime(2026, 6, 14, 14, 18, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 6, 14, 14, 20, 45, tzinfo=timezone.utc),
            duration_seconds=165,
            turns=[
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="Hello! Thank you for calling Bridgeon Skillversity. I'm Priya, how can I help you today?",
                    at=datetime(2026, 6, 14, 14, 18, 2, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.caller,
                    text="I'm interested in the Data Science course but I'm a bit busy right now, can someone call me back tomorrow?",
                    at=datetime(2026, 6, 14, 14, 18, 30, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="Of course, I'll have our team call you back tomorrow with details about the Data Science course.",
                    at=datetime(2026, 6, 14, 14, 18, 45, tzinfo=timezone.utc),
                ),
            ],
            recording_url="",
            summary=(
                "Caller expressed interest in the Data Science course.\n"
                "Caller was busy and requested a callback the next day.\n"
                "Agent confirmed a follow-up call would be scheduled."
            ),
            sentiment=CallSentiment.neutral,
            outcome=CallOutcome.callback,
            sheet_sync_status=SheetSyncStatus.skipped,
            created_at=datetime(2026, 6, 14, 14, 20, 46, tzinfo=timezone.utc),
            reward_score=0.22,
            reward_breakdown=RewardBreakdown(outcome_reward=0.2, micro_rewards=0.08, efficiency_penalty=0.0, total=0.22, turn_rewards=[TurnReward(turn_index=i, base_reward=0.04, td_credit=0.22*(0.9**i)) for i in range(3)]),
            mdp_states=[
                MDPState(turn_index=0, phase="opening", customer_sentiment="neutral", objections_raised=0),
                MDPState(turn_index=1, phase="objections", customer_sentiment="neutral", objections_raised=1),
                MDPState(turn_index=2, phase="closing", customer_sentiment="neutral", objections_raised=1),
            ],
            engagement_scores=[
                EngagementScore(turn_index=1, score=0.45, triggered_adaptation=False),
            ],
        ),
        CallReport(
            id="seed-call-3",
            company_id="bridgeon-skillversity",
            from_number="+91 98470 00003",
            to_number="+91 80000 00001",
            started_at=datetime(2026, 6, 14, 16, 40, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 6, 14, 16, 44, 12, tzinfo=timezone.utc),
            duration_seconds=252,
            turns=[
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="Hello! Thank you for calling Bridgeon Skillversity. I'm Priya, how can I help you today?",
                    at=datetime(2026, 6, 14, 16, 40, 2, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.caller,
                    text="I paid for the UI/UX course last week but haven't received my login details. This is really frustrating, I want to talk to a manager.",
                    at=datetime(2026, 6, 14, 16, 40, 25, tzinfo=timezone.utc),
                ),
                TelephonyTurn(
                    role=TurnRole.agent,
                    text="I'm sorry for the trouble -- connecting you to one of our team members now, please hold.",
                    at=datetime(2026, 6, 14, 16, 40, 40, tzinfo=timezone.utc),
                ),
            ],
            recording_url="",
            summary=(
                "Caller paid for the UI/UX course but did not receive login details.\n"
                "Caller was frustrated and asked to speak with a manager.\n"
                "Agent escalated the call to a human team member."
            ),
            sentiment=CallSentiment.negative,
            outcome=CallOutcome.escalated,
            sheet_sync_status=SheetSyncStatus.failed,
            created_at=datetime(2026, 6, 14, 16, 44, 13, tzinfo=timezone.utc),
            reward_score=-0.08,
            reward_breakdown=RewardBreakdown(outcome_reward=-0.1, micro_rewards=0.02, efficiency_penalty=0.0, total=-0.08, turn_rewards=[TurnReward(turn_index=i, base_reward=-0.03, td_credit=-0.08*(0.9**i)) for i in range(3)]),
            mdp_states=[
                MDPState(turn_index=0, phase="opening", customer_sentiment="neutral", objections_raised=0),
                MDPState(turn_index=1, phase="objections", customer_sentiment="negative", objections_raised=1),
                MDPState(turn_index=2, phase="closing", customer_sentiment="negative", objections_raised=1),
            ],
            engagement_scores=[
                EngagementScore(turn_index=1, score=0.2, triggered_adaptation=True),
            ],
        ),
    ]

    for report in seed_reports:
        add_report(report)


_seed()


@router.get("", response_model=list[CallReport])
def list_call_reports(company_id: str | None = None) -> list[CallReport]:
    reports = [_call_reports[cid] for cid in _call_report_order if cid in _call_reports]
    if company_id is not None:
        reports = [report for report in reports if report.company_id == company_id]
    return reports


@router.get("/{call_id}", response_model=CallReport)
def get_call_report(call_id: str) -> CallReport:
    report = _call_reports.get(call_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Call report not found")
    return report
