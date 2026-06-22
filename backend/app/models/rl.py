"""Reinforcement Learning Engine models (Phases 22-28)."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ConversationPhase(str, Enum):
    opening = "opening"
    discovery = "discovery"
    pitch = "pitch"
    objections = "objections"
    closing = "closing"


class MDPState(BaseModel):
    turn_index: int
    phase: ConversationPhase
    customer_sentiment: str  # positive / neutral / negative
    objections_raised: int = 0
    duration_seconds: float = 0.0


class TurnReward(BaseModel):
    turn_index: int
    base_reward: float = 0.0
    td_credit: float = 0.0


class RewardBreakdown(BaseModel):
    outcome_reward: float = 0.0
    micro_rewards: float = 0.0
    efficiency_penalty: float = 0.0
    total: float = 0.0
    turn_rewards: list[TurnReward] = Field(default_factory=list)


class EngagementScore(BaseModel):
    turn_index: int
    score: float  # 0.0 – 1.0
    triggered_adaptation: bool = False


class PolicyVersion(BaseModel):
    id: str
    name: str
    description: str = ""
    is_baseline: bool = False
    epsilon: float = 0.3
    opening_strategy: str = "warm_question"
    pitch_angle: str = "placement"
    cta_variant: str = "book_counseling"
    created_at: datetime


class ABTest(BaseModel):
    id: str
    name: str
    campaign_id: str = ""
    policy_a_id: str
    policy_b_id: str
    split_ratio: float = 0.2  # fraction of calls routed to policy B
    is_active: bool = True
    calls_a: int = 0
    calls_b: int = 0
    conversions_a: int = 0
    conversions_b: int = 0
    created_at: datetime


class GuardrailEvent(BaseModel):
    id: str
    call_sid: str
    original_text: str
    blocked_reason: str
    replacement_text: str
    occurred_at: datetime
