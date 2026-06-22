"""Phase 19: Content & Phrase Mining — Power Phrases vs Drop Phrases.

Scans all recordings with transcripts, extracts n-gram patterns that appear
frequently in successful calls (power phrases) and in failed calls (drop
phrases). Falls back to illustrative mock phrases when there is not enough
real transcript data.
"""

import re
from collections import Counter

from app.models.learning import RecordingOutcome

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "i", "you", "we", "they",
    "it", "this", "that", "to", "of", "and", "or", "in", "on", "at", "for",
    "with", "have", "has", "had", "be", "been", "will", "would", "could", "can",
    "do", "did", "does", "me", "my", "your", "our", "their", "from", "so", "just",
    "but", "not", "no", "if", "then", "its", "also", "than", "as",
}

_DEFAULT_POWER = [
    "secure a spot for you",
    "free demo session this Saturday",
    "flexible EMI options available",
    "over ninety percent placement rate",
    "hands-on capstone project included",
]

_DEFAULT_DROP = [
    "don't offer any discounts",
    "fees are non-negotiable",
    "cannot guarantee placement outcomes",
    "no refund policy applies",
    "standard industry pricing only",
]


def _ngrams(text: str, n: int = 3) -> list[str]:
    words = re.findall(r"\b[a-z']+\b", text.lower())
    return [
        " ".join(words[i : i + n])
        for i in range(len(words) - n + 1)
        if not any(w in _STOPWORDS for w in words[i : i + n])
    ]


def mine_phrases(recordings: list) -> dict:
    """Return {"power_phrases": [...], "drop_phrases": [...]}."""
    pos_texts: list[str] = []
    neg_texts: list[str] = []

    for rec in recordings:
        combined = " ".join(seg.text for seg in rec.transcript)
        if not combined.strip():
            continue
        if rec.outcome == RecordingOutcome.enrolled:
            pos_texts.append(combined)
        elif rec.outcome == RecordingOutcome.not_interested:
            neg_texts.append(combined)

    if not pos_texts and not neg_texts:
        return {"power_phrases": _DEFAULT_POWER, "drop_phrases": _DEFAULT_DROP}

    pos_counts: Counter = Counter()
    for text in pos_texts:
        for gram in _ngrams(text, 3):
            pos_counts[gram] += 1

    neg_counts: Counter = Counter()
    for text in neg_texts:
        for gram in _ngrams(text, 3):
            neg_counts[gram] += 1

    power = [p for p, _ in pos_counts.most_common(10) if neg_counts.get(p, 0) == 0][:5]
    drop = [p for p, _ in neg_counts.most_common(10) if pos_counts.get(p, 0) == 0][:5]

    return {
        "power_phrases": power or _DEFAULT_POWER,
        "drop_phrases": drop or _DEFAULT_DROP,
    }
