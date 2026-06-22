"""Phase 26: Real-Time In-Call Engagement Tracker.

Computes a 0–1 engagement score per customer utterance and generates dynamic
adaptation instructions for the LLM when engagement drops below thresholds.
"""

from __future__ import annotations

import re

from app.models.rl import EngagementScore
from app.models.telephony import TelephonyTurn, TurnRole

_POSITIVE = re.compile(
    r"(yes|sure|great|interesting|tell me more|sounds good|okay|really|wow|perfect|definitely)", re.I
)
_QUESTION = re.compile(r"\?")
_NEGATIVE = re.compile(r"\b(no|not interested|busy|bye|stop|remove|don.t|can.t|never|maybe later)\b", re.I)

_ADAPT_THRESHOLD = 0.4
_EXIT_THRESHOLD = 0.2


def score_utterance(text: str) -> float:
    """Return a 0–1 engagement score for a single customer utterance."""
    score = 0.5
    if _POSITIVE.search(text):
        score += 0.2
    if _QUESTION.search(text):
        score += 0.15
    if _NEGATIVE.search(text):
        score -= 0.3
    if len(text) > 60:
        score += 0.1
    elif len(text) < 10:
        score -= 0.1
    return max(0.0, min(1.0, round(score, 2)))


def get_dynamic_instruction(score: float) -> str | None:
    """Return an adaptation instruction to append to the system prompt, or None."""
    if score < _EXIT_THRESHOLD:
        return (
            "The customer seems disengaged or unwilling to continue. "
            "Politely offer to call back at a better time and end gracefully."
        )
    if score < _ADAPT_THRESHOLD:
        return (
            "The customer's engagement is dropping. "
            "Immediately shorten your response and ask a direct open question to re-engage them."
        )
    return None


def compute_engagement_scores(turns: list[TelephonyTurn]) -> list[EngagementScore]:
    """Compute per-turn engagement scores for all caller turns in a completed call."""
    scores: list[EngagementScore] = []
    for idx, turn in enumerate(turns):
        if turn.role != TurnRole.caller:
            continue
        s = score_utterance(turn.text)
        scores.append(EngagementScore(turn_index=idx, score=s, triggered_adaptation=s < _ADAPT_THRESHOLD))
    return scores
