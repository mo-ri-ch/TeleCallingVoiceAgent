"""Phase 20: Auto-Generated Objection Playbook.

Classifies customer objections from transcripts using regex pattern matching
(with optional LLM enhancement) and maps them to proven agent responses along
with a calculated win percentage.
"""

import re
from datetime import datetime, timezone

from app.models.objection import ObjectionCategory, ObjectionEntry

_PATTERNS: list[tuple[re.Pattern, ObjectionCategory, str]] = [
    (
        re.compile(r"(too expensive|cost|price|fees|discount|afford|EMI|budget)", re.I),
        ObjectionCategory.pricing,
        "I understand cost is a concern. We offer flexible EMI plans starting from just ₹2,000/month — "
        "should I walk you through the breakdown?",
    ),
    (
        re.compile(r"(busy|no time|not now|later|call back|schedule|can.t talk)", re.I),
        ObjectionCategory.time,
        "Completely understand! May I call you back on Saturday morning for just 10 minutes?",
    ),
    (
        re.compile(r"(certified|accredited|recognized|valid|legitimate|credible|approved)", re.I),
        ObjectionCategory.credentials,
        "Yes — we are ISO 9001 certified and our curriculum is recognized by NASSCOM. "
        "Would you like me to send our accreditation details on WhatsApp?",
    ),
    (
        re.compile(r"(relevant|useful|applicable|job|placement|guarantee|career)", re.I),
        ObjectionCategory.relevance,
        "Our graduates average 3 job offers within 90 days of completion. "
        "Let me share a few success stories from your city.",
    ),
]

SEED_OBJECTIONS: list[ObjectionEntry] = [
    ObjectionEntry(
        id="obj-1",
        objection_text="This is too expensive for me right now.",
        category=ObjectionCategory.pricing,
        best_response="I understand. We offer flexible EMI plans starting at just ₹2,000/month. Would that work for you?",
        win_percent=62.5,
        sample_count=24,
        created_at=datetime(2026, 6, 10, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 10, tzinfo=timezone.utc),
    ),
    ObjectionEntry(
        id="obj-2",
        objection_text="I'm too busy right now — can someone call me back?",
        category=ObjectionCategory.time,
        best_response="Completely understand! May I call you back Saturday morning for just 10 minutes?",
        win_percent=48.0,
        sample_count=18,
        created_at=datetime(2026, 6, 11, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 11, tzinfo=timezone.utc),
    ),
    ObjectionEntry(
        id="obj-3",
        objection_text="Is your institute certified and recognized?",
        category=ObjectionCategory.credentials,
        best_response="Yes — ISO 9001 certified and NASSCOM-recognized. Want me to send our accreditation details?",
        win_percent=71.0,
        sample_count=12,
        created_at=datetime(2026, 6, 12, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 12, tzinfo=timezone.utc),
    ),
    ObjectionEntry(
        id="obj-4",
        objection_text="Will this course actually help me get a job?",
        category=ObjectionCategory.relevance,
        best_response="Our graduates average 3 job offers within 90 days. Let me share a few success stories from your city.",
        win_percent=68.5,
        sample_count=20,
        created_at=datetime(2026, 6, 13, tzinfo=timezone.utc),
        updated_at=datetime(2026, 6, 13, tzinfo=timezone.utc),
    ),
]


def classify(text: str) -> tuple[ObjectionCategory, str]:
    for pattern, category, response in _PATTERNS:
        if pattern.search(text):
            return category, response
    return ObjectionCategory.other, "I understand your concern. Let me share more details to help you decide."


def build_entry(objection_text: str) -> ObjectionEntry:
    from uuid import uuid4  # noqa: PLC0415

    category, response = classify(objection_text)
    now = datetime.now(timezone.utc)
    return ObjectionEntry(
        id=str(uuid4()),
        objection_text=objection_text,
        category=category,
        best_response=response,
        win_percent=0.0,
        sample_count=0,
        created_at=now,
        updated_at=now,
    )
