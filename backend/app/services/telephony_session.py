"""In-memory store for live and recent inbound telephony call sessions."""

from datetime import datetime, timezone

from app.models.telephony import (
    AgentState,
    CallState,
    CallStatus,
    TelephonyCallSession,
    TelephonyTurn,
    TurnRole,
)

MAX_SESSIONS = 50

_sessions: dict[str, TelephonyCallSession] = {}
# Most recent call_sids first.
_session_order: list[str] = []

# Accumulated mu-law/8kHz audio for the in-progress call, in chronological
# order (both caller and agent audio appended as it is sent/received), used
# by the post-call worker (Phase 15) to build the call recording.
_recordings: dict[str, bytearray] = {}

# Per-turn engagement scores (Phase 26): list of (turn_index, score) floats.
_engagement: dict[str, list[tuple[int, float]]] = {}


def start_session(
    call_sid: str, company_id: str, from_number: str, to_number: str
) -> TelephonyCallSession:
    """Get or create the session for a call leg's media stream.

    A call resumed after a failed warm transfer (Phase 12) reopens the same
    `call_sid`'s media stream -- reuse the existing session (and its turn
    history) instead of wiping it, and skip straight to `interacting`.
    """
    existing = _sessions.get(call_sid)
    if existing is not None:
        existing.status = CallStatus.in_progress
        existing.call_state = CallState.interacting
        existing.agent_state = AgentState.speaking
        existing.updated_at = datetime.now(timezone.utc)
        return existing

    now = datetime.now(timezone.utc)
    session = TelephonyCallSession(
        id=call_sid,
        company_id=company_id,
        from_number=from_number,
        to_number=to_number,
        status=CallStatus.in_progress,
        agent_state=AgentState.speaking,
        call_state=CallState.greeting,
        started_at=now,
        updated_at=now,
    )
    _sessions[call_sid] = session
    _session_order.insert(0, call_sid)
    del _session_order[MAX_SESSIONS:]
    return session


def get_session(call_sid: str) -> TelephonyCallSession | None:
    return _sessions.get(call_sid)


def add_turn(call_sid: str, role: TurnRole, text: str) -> None:
    session = _sessions.get(call_sid)
    if session is None:
        return
    session.turns.append(TelephonyTurn(role=role, text=text, at=datetime.now(timezone.utc)))
    session.updated_at = datetime.now(timezone.utc)


def set_agent_state(call_sid: str, state: AgentState) -> None:
    session = _sessions.get(call_sid)
    if session is None:
        return
    session.agent_state = state
    session.updated_at = datetime.now(timezone.utc)


def set_call_state(call_sid: str, state: CallState) -> None:
    session = _sessions.get(call_sid)
    if session is None:
        return
    session.call_state = state
    session.updated_at = datetime.now(timezone.utc)


def end_session(call_sid: str) -> None:
    session = _sessions.get(call_sid)
    if session is None:
        return
    now = datetime.now(timezone.utc)
    session.status = CallStatus.completed
    session.call_state = CallState.ended
    session.ended_at = now
    session.updated_at = now


def append_audio(call_sid: str, mulaw_bytes: bytes) -> None:
    """Append a chunk of mu-law/8kHz audio to the in-progress call recording."""
    _recordings.setdefault(call_sid, bytearray()).extend(mulaw_bytes)


def pop_audio(call_sid: str) -> bytes:
    """Return and clear the accumulated recording audio for a call."""
    return bytes(_recordings.pop(call_sid, b""))


def add_engagement_score(call_sid: str, turn_index: int, score: float) -> None:
    """Record a per-turn engagement score during an active call (Phase 26)."""
    _engagement.setdefault(call_sid, []).append((turn_index, score))


def pop_engagement_scores(call_sid: str) -> list[tuple[int, float]]:
    """Return and clear the engagement scores for a call."""
    return _engagement.pop(call_sid, [])


def list_sessions(company_id: str | None = None) -> list[TelephonyCallSession]:
    sessions = [_sessions[sid] for sid in _session_order if sid in _sessions]
    if company_id is not None:
        sessions = [session for session in sessions if session.company_id == company_id]
    return sessions
