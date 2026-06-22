from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CampaignStatus(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    completed = "completed"


class LeadStatus(str, Enum):
    not_contacted = "not_contacted"
    busy = "busy"
    answered = "answered"
    failed = "failed"


class Lead(BaseModel):
    id: str
    name: str
    phone_number: str
    language_preference: str = ""
    interest_tag: str = ""
    status: LeadStatus = LeadStatus.not_contacted
    call_attempts: int = 0
    last_call_at: datetime | None = None


class CampaignBase(BaseModel):
    name: str
    company_id: str
    calling_window_start: str = "10:00"
    calling_window_end: str = "18:00"
    time_zone: str = "Asia/Kolkata"
    max_retries: int = 3
    retry_interval_minutes: int = 15


class Campaign(CampaignBase):
    id: str
    status: CampaignStatus = CampaignStatus.draft
    leads: list[Lead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CampaignStatusUpdate(BaseModel):
    status: CampaignStatus
