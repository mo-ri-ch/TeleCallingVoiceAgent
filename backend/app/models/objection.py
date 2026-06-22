"""Objection Playbook models (Phase 20): extracted objections and winning responses."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ObjectionCategory(str, Enum):
    pricing = "pricing"
    time = "time"
    credentials = "credentials"
    relevance = "relevance"
    other = "other"


class ObjectionEntry(BaseModel):
    id: str
    objection_text: str
    category: ObjectionCategory
    best_response: str
    win_percent: float = 0.0
    sample_count: int = 0
    created_at: datetime
    updated_at: datetime
