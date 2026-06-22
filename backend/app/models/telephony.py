from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"


class AgentState(str, Enum):
    listening = "listening"
    thinking = "thinking"
    speaking = "speaking"


class CallState(str, Enum):
    """Coarse-grained telephony call lifecycle (Phase 12)."""

    greeting = "greeting"
    interacting = "interacting"
    holding = "holding"
    escalating = "escalating"
    bridging = "bridging"
    ended = "ended"


class TurnRole(str, Enum):
    agent = "agent"
    caller = "caller"


class TelephonyTurn(BaseModel):
    role: TurnRole
    text: str
    at: datetime


class TelephonyCallSession(BaseModel):
    id: str
    company_id: str
    from_number: str
    to_number: str
    status: CallStatus
    agent_state: AgentState
    call_state: CallState
    started_at: datetime
    updated_at: datetime
    ended_at: datetime | None = None
    turns: list[TelephonyTurn] = Field(default_factory=list)


class TelephonyConfigUpdate(BaseModel):
    inbound_phone_number: str


class TelephonyConfig(BaseModel):
    company_id: str
    inbound_phone_number: str
    voice_webhook_url: str
    public_base_url: str
