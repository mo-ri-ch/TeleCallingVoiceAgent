import csv
import io
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.campaign import Campaign, CampaignStatus, CampaignStatusUpdate, Lead, LeadStatus

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

_campaigns: dict[str, Campaign] = {}

# Campaigns can only be moved between these states via PATCH; "completed" is
# set automatically by the dialer once every lead is resolved.
_MANUAL_STATUSES = {CampaignStatus.draft, CampaignStatus.active, CampaignStatus.paused}


def _parse_leads_csv(raw: bytes) -> list[Lead]:
    """Parse an uploaded lead list. Expects columns Name, Phone Number,
    Language Preference, and Interest Tag (case-insensitive, spaces or
    underscores). Rows without a phone number are skipped."""
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="The CSV file must be UTF-8 encoded.")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return []

    headers = {name: name.strip().lower().replace(" ", "_") for name in reader.fieldnames}

    leads: list[Lead] = []
    for row in reader:
        fields = {
            headers[key]: (value or "").strip()
            for key, value in row.items()
            if key in headers
        }
        phone_number = fields.get("phone_number") or fields.get("phone") or ""
        if not phone_number:
            continue

        leads.append(
            Lead(
                id=str(uuid4()),
                name=fields.get("name", ""),
                phone_number=phone_number,
                language_preference=fields.get("language_preference", ""),
                interest_tag=fields.get("interest_tag", ""),
            )
        )

    return leads


def _seed() -> None:
    now = datetime(2026, 6, 12, 9, 0, 0, tzinfo=timezone.utc)

    leads = [
        Lead(
            id=str(uuid4()),
            name="Anjali Menon",
            phone_number="+91 98470 00001",
            language_preference="Malayalam",
            interest_tag="MERN Stack",
            status=LeadStatus.answered,
            call_attempts=1,
        ),
        Lead(
            id=str(uuid4()),
            name="Rahul Nair",
            phone_number="+91 98470 00002",
            language_preference="Malayalam",
            interest_tag="Data Science",
            status=LeadStatus.busy,
            call_attempts=1,
        ),
        Lead(
            id=str(uuid4()),
            name="Sandra Thomas",
            phone_number="+91 98470 00003",
            language_preference="English",
            interest_tag="MERN Stack",
            status=LeadStatus.failed,
            call_attempts=2,
        ),
        Lead(
            id=str(uuid4()),
            name="Vishnu Prasad",
            phone_number="+91 98470 00004",
            language_preference="Malayalam",
            interest_tag="UI/UX Design",
        ),
        Lead(
            id=str(uuid4()),
            name="Divya Pillai",
            phone_number="+91 98470 00005",
            language_preference="English",
            interest_tag="Data Science",
        ),
    ]

    campaign = Campaign(
        id="bridgeon-mern-leads-june",
        name="MERN Stack Cohort - June Outreach",
        company_id="bridgeon-skillversity",
        status=CampaignStatus.active,
        calling_window_start="10:00",
        calling_window_end="18:00",
        time_zone="Asia/Kolkata",
        leads=leads,
        created_at=now,
        updated_at=now,
    )
    _campaigns[campaign.id] = campaign


_seed()


@router.get("", response_model=list[Campaign])
def list_campaigns() -> list[Campaign]:
    return list(_campaigns.values())


@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(campaign_id: str) -> Campaign:
    campaign = _campaigns.get(campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("", response_model=Campaign, status_code=201)
async def create_campaign(
    name: str = Form(...),
    company_id: str = Form(...),
    calling_window_start: str = Form("10:00"),
    calling_window_end: str = Form("18:00"),
    time_zone: str = Form("Asia/Kolkata"),
    max_retries: int = Form(3),
    retry_interval_minutes: int = Form(15),
    leads_csv: UploadFile = File(...),
) -> Campaign:
    raw = await leads_csv.read()
    leads = _parse_leads_csv(raw)
    if not leads:
        raise HTTPException(
            status_code=400,
            detail="The CSV file did not contain any leads with a phone number.",
        )

    now = datetime.now(timezone.utc)
    campaign = Campaign(
        id=str(uuid4()),
        name=name,
        company_id=company_id,
        status=CampaignStatus.draft,
        calling_window_start=calling_window_start,
        calling_window_end=calling_window_end,
        time_zone=time_zone,
        max_retries=max_retries,
        retry_interval_minutes=retry_interval_minutes,
        leads=leads,
        created_at=now,
        updated_at=now,
    )
    _campaigns[campaign.id] = campaign
    return campaign


@router.patch("/{campaign_id}/status", response_model=Campaign)
def update_campaign_status(campaign_id: str, payload: CampaignStatusUpdate) -> Campaign:
    campaign = _campaigns.get(campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if payload.status not in _MANUAL_STATUSES:
        raise HTTPException(status_code=400, detail="Campaign status must be draft, active, or paused.")

    campaign.status = payload.status
    campaign.updated_at = datetime.now(timezone.utc)
    return campaign
