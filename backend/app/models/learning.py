"""Models for the Conversational Learning Studio (Phases 16-21).

Each RecordingUpload represents a human-to-human call recording that a trainer
has uploaded -- with a quality rating and outcome label -- to teach the AI
agent better tone, phrasing, and objection-handling patterns.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RecordingOutcome(str, Enum):
    enrolled = "enrolled"
    interested = "interested"
    not_interested = "not_interested"


class CallDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class RecordingStatus(str, Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class TranscriptSpeaker(str, Enum):
    agent = "AGENT"
    customer = "CUSTOMER"


class TranscriptSegment(BaseModel):
    speaker: TranscriptSpeaker
    text: str
    start_time: float = 0.0
    end_time: float = 0.0


class ToneProfile(BaseModel):
    speaking_rate: float = 0.0        # estimated words per minute
    pitch_category: str = "neutral"   # warm / neutral / flat
    energy_level: str = "medium"      # high / medium / low
    pause_frequency: str = "moderate" # frequent / moderate / rare
    overall_score: float = 5.0        # 1–10


class RecordingUpload(BaseModel):
    id: str
    label: str
    outcome: RecordingOutcome
    call_direction: CallDirection
    rating: int = Field(ge=1, le=5)
    file_name: str
    file_size: int
    file_url: str = ""
    duration_seconds: float = 0.0
    status: RecordingStatus = RecordingStatus.uploaded
    uploaded_at: datetime
    transcript: list[TranscriptSegment] = Field(default_factory=list)
    transcript_error: str = ""
    tone_profile: ToneProfile | None = None
