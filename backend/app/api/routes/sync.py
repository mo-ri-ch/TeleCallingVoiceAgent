from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.api.routes.companies import _companies
from app.models.sync import ObserverLog, ObserverSignalCreate, SyncLogEntry
from app.services.sync_engine import get_sync_logs

router = APIRouter(prefix="/companies/{company_id}/sync", tags=["sync"])

# company_id -> most recent observer logs, newest first.
_observer_logs: dict[str, list[ObserverLog]] = {}

MAX_LOGS_PER_COMPANY = 50

# The next scheduled full sync, per Phase 10's 15-minute sitemap poll.
SYNC_QUEUE_DELAY = timedelta(minutes=15)


def _ensure_company_exists(company_id: str) -> None:
    if company_id not in _companies:
        raise HTTPException(status_code=404, detail="Company not found")


@router.post("/observer", response_model=ObserverLog, status_code=201)
def receive_observer_signal(
    company_id: str, payload: ObserverSignalCreate
) -> ObserverLog:
    """Receive a content-change signal from the embedded widget's loader.js."""
    _ensure_company_exists(company_id)

    now = datetime.now(timezone.utc)
    log = ObserverLog(
        id=str(uuid4()),
        company_id=company_id,
        url=payload.url,
        content_hash=payload.content_hash,
        received_at=now,
        sync_queued_at=now + SYNC_QUEUE_DELAY,
    )

    logs = _observer_logs.setdefault(company_id, [])
    logs.insert(0, log)
    del logs[MAX_LOGS_PER_COMPANY:]

    return log


@router.get("/observer-logs", response_model=list[ObserverLog])
def list_observer_logs(company_id: str) -> list[ObserverLog]:
    _ensure_company_exists(company_id)
    return _observer_logs.get(company_id, [])


@router.get("/logs", response_model=list[SyncLogEntry])
def list_sync_logs(company_id: str) -> list[SyncLogEntry]:
    """Results of past diff-based sync runs (Phase 10), newest first."""
    _ensure_company_exists(company_id)
    return get_sync_logs(company_id)
