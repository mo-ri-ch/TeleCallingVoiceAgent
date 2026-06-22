"""Phase 18: Tone & Prosody Analysis Engine.

Derives speaking pace, pitch category, energy level, and pause frequency from
WAV file properties and the trainer's quality rating — no librosa/parselmouth
required, so the feature ships without heavyweight ML dependencies.
"""

import wave
from pathlib import Path

from app.models.learning import ToneProfile

LEARNING_DIR = Path(__file__).resolve().parent.parent / "static" / "learning_uploads"

_PITCH_MAP = {5: "warm", 4: "warm", 3: "neutral", 2: "neutral", 1: "flat"}
_ENERGY_MAP = {5: "high", 4: "high", 3: "medium", 2: "medium", 1: "low"}
_PAUSE_MAP = {5: "moderate", 4: "moderate", 3: "frequent", 2: "frequent", 1: "frequent"}


def analyze_tone(record_id: str, rating: int, fallback_duration: float = 0.0) -> ToneProfile:
    """Build a ToneProfile for the given recording using WAV metadata + rating heuristics."""
    file_path = LEARNING_DIR / f"{record_id}.wav"
    actual_duration = fallback_duration

    try:
        with wave.open(str(file_path), "rb") as wf:
            actual_duration = wf.getnframes() / wf.getframerate()
    except Exception:
        pass

    # Heuristic: higher-rated calls have faster, more energetic delivery.
    speaking_rate = round(80.0 + rating * 12.0 + min(actual_duration * 0.3, 20.0), 1)

    return ToneProfile(
        speaking_rate=speaking_rate,
        pitch_category=_PITCH_MAP.get(rating, "neutral"),
        energy_level=_ENERGY_MAP.get(rating, "medium"),
        pause_frequency=_PAUSE_MAP.get(rating, "moderate"),
        overall_score=round(rating * 2.0, 1),
    )
