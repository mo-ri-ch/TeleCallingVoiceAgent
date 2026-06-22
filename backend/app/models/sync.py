from datetime import datetime

from pydantic import BaseModel


class ObserverSignalCreate(BaseModel):
    """A content-change signal reported by the embedded widget's loader.js."""

    url: str
    content_hash: str


class ObserverLog(BaseModel):
    id: str
    company_id: str
    url: str
    content_hash: str
    received_at: datetime
    sync_queued_at: datetime


class SyncLogEntry(BaseModel):
    """Result of a diff-based sync run: which pages changed and how the
    vector store was surgically updated as a result."""

    id: str
    company_id: str
    triggered_at: datetime
    pages_checked: int
    pages_changed: int
    chunks_reindexed: int
    chunks_untouched: int
    summary: str
