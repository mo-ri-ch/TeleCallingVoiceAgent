"""Phase 27: RL Safeguards & Guardrail Classifier.

Intercepts the LLM's generated response before it is converted to voice,
enforcing hard constraints: no exaggerated guarantees, no ignoring requests
for a human agent, and no high-pressure language.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

from app.models.rl import GuardrailEvent

_TRANSFER_PATTERN = re.compile(
    r"(transfer me|speak to (a |an )?(human|person|manager|supervisor|agent|representative)|"
    r"real person|human (agent|being)|customer (care|support|service)|connect me to|talk to (a |an )?human)",
    re.I,
)

_GUARANTEE_PATTERN = re.compile(
    r"(100\s*%\s*(placement|guarantee|job)|guaranteed\s+(job|placement|salary|offer)|"
    r"promise\s+(you|a\s+job)|we\s+guarantee\s+placement)",
    re.I,
)

_PRESSURE_PATTERN = re.compile(
    r"(last\s+(chance|seat|spot|offer)|limited\s+time\s+only|must\s+decide\s+now|"
    r"offer\s+expires\s+today|closing\s+today\s+only)",
    re.I,
)

_HUMAN_TRANSFER_RESPONSE = (
    "Of course! Let me transfer you to one of our career counselors right away. Please hold."
)
_SAFE_CLAIM_RESPONSE = (
    "Our students have achieved excellent results — I'd love to share some success stories with you."
)
_SAFE_CTA_RESPONSE = (
    "We have some great options — would you like me to book a free counseling call at a time that works for you?"
)

_events: list[GuardrailEvent] = []


def check_response(call_sid: str, text: str) -> tuple[str, bool]:
    """
    Validate the agent's response text against hard constraints.

    Returns (safe_text, was_blocked). If a violation is detected, the original
    text is replaced and a GuardrailEvent is recorded.
    """
    if _TRANSFER_PATTERN.search(text):
        _record(call_sid, text, "Customer requested a human agent", _HUMAN_TRANSFER_RESPONSE)
        return _HUMAN_TRANSFER_RESPONSE, True

    if _GUARANTEE_PATTERN.search(text):
        _record(call_sid, text, "Exaggerated placement guarantee", _SAFE_CLAIM_RESPONSE)
        return _SAFE_CLAIM_RESPONSE, True

    if _PRESSURE_PATTERN.search(text):
        _record(call_sid, text, "High-pressure sales language", _SAFE_CTA_RESPONSE)
        return _SAFE_CTA_RESPONSE, True

    return text, False


def get_events(limit: int = 50) -> list[GuardrailEvent]:
    return list(reversed(_events[-limit:]))


def _record(call_sid: str, original: str, reason: str, replacement: str) -> None:
    _events.append(
        GuardrailEvent(
            id=str(uuid4()),
            call_sid=call_sid,
            original_text=original,
            blocked_reason=reason,
            replacement_text=replacement,
            occurred_at=datetime.now(timezone.utc),
        )
    )
