"""Google Sheets sync for post-call reports (Phase 15).

Appends a row with each call's metrics to a connected spreadsheet via the
Sheets API, authenticating as a service account (requires the optional
`google-auth` dependency). Leave GOOGLE_SHEETS_SPREADSHEET_ID or
GOOGLE_SERVICE_ACCOUNT_FILE unset to skip syncing -- the call report is still
generated and stored locally, just marked "skipped".
"""

import httpx

from app.core.config import (
    GOOGLE_SERVICE_ACCOUNT_FILE,
    GOOGLE_SHEETS_RANGE,
    GOOGLE_SHEETS_SPREADSHEET_ID,
)
from app.models.call_report import CallReport, SheetSyncStatus

SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def _get_access_token() -> str | None:
    if not GOOGLE_SERVICE_ACCOUNT_FILE:
        return None

    try:
        import google.auth.transport.requests
        from google.oauth2 import service_account
    except ImportError:
        return None

    try:
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        credentials.refresh(google.auth.transport.requests.Request())
    except Exception:
        return None

    return credentials.token


def append_call_row(company_name: str, report: CallReport) -> SheetSyncStatus:
    """Append a row with this call's metrics to the connected Google Sheet."""
    if not GOOGLE_SHEETS_SPREADSHEET_ID:
        return SheetSyncStatus.skipped

    token = _get_access_token()
    if token is None:
        return SheetSyncStatus.skipped

    row = [
        report.started_at.isoformat(),
        company_name,
        report.from_number,
        report.to_number,
        f"{report.duration_seconds:.0f}",
        report.summary,
        report.sentiment.value,
        report.outcome.value,
        report.recording_url,
    ]

    url = f"{SHEETS_API_BASE}/{GOOGLE_SHEETS_SPREADSHEET_ID}/values/{GOOGLE_SHEETS_RANGE}:append"

    try:
        response = httpx.post(
            url,
            params={"valueInputOption": "RAW"},
            headers={"Authorization": f"Bearer {token}"},
            json={"values": [row]},
            timeout=10.0,
        )
    except httpx.HTTPError:
        return SheetSyncStatus.failed

    return SheetSyncStatus.synced if response.status_code < 400 else SheetSyncStatus.failed
