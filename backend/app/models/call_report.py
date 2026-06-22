"""Post-call report models (Phases 15, 22-26): AI summaries, sentiment, outcome,
recording links, Google Sheets sync status, MDP states, reward scores, and
engagement tracking for completed calls."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.models.rl import EngagementScore, MDPState, RewardBreakdown
from app.models.telephony import TelephonyTurn


class CallSentiment(str, Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class CallOutcome(str, Enum):
    interested = "interested"
    callback = "callback"
    escalated = "escalated"
    not_interested = "not_interested"


class SheetSyncStatus(str, Enum):
    pending = "pending"
    synced = "synced"
    skipped = "skipped"
    failed = "failed"


class CallReport(BaseModel):
    id: str
    company_id: str
    from_number: str
    to_number: str
    started_at: datetime
    ended_at: datetime
    duration_seconds: float
    turns: list[TelephonyTurn] = Field(default_factory=list)
    recording_url: str = ""
    summary: str = ""
    sentiment: CallSentiment = CallSentiment.neutral
    outcome: CallOutcome = CallOutcome.callback
    sheet_sync_status: SheetSyncStatus = SheetSyncStatus.pending
    created_at: datetime
    # RL fields (Phases 22-26)
    reward_score: float = 0.0
    reward_breakdown: RewardBreakdown | None = None
    mdp_states: list[MDPState] = Field(default_factory=list)
    engagement_scores: list[EngagementScore] = Field(default_factory=list)
