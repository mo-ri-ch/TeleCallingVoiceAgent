"""Outbound campaign dialer queue (Phase 14).

A background loop scans every `active` campaign, checks whether the current
time falls inside its configured calling window, and -- if so -- places the
next outbound call via the Twilio REST API. Leads that come back busy or
unanswered are retried automatically, up to `max_retries` times, spaced out
by `retry_interval_minutes`.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.api.routes.campaigns import _campaigns
from app.api.routes.companies import _companies
from app.core.config import PUBLIC_BASE_URL
from app.models.campaign import Campaign, CampaignStatus, Lead, LeadStatus
from app.services import twilio_client
from app.services.twilio_client import TwilioError

# How often the dialer queue scans active campaigns for the next lead to call.
DIALER_TICK_SECONDS = 20

# Calls that never receive a Twilio status callback (e.g. a dropped webhook)
# stop blocking retries after this long.
IN_FLIGHT_TIMEOUT = timedelta(minutes=5)

# Maps a Twilio call's final CallStatus to the resulting lead status.
_CALL_STATUS_TO_LEAD_STATUS = {
    "completed": LeadStatus.answered,
    "busy": LeadStatus.busy,
    "no-answer": LeadStatus.failed,
    "failed": LeadStatus.failed,
    "canceled": LeadStatus.failed,
}

# lead_id -> time the outbound call was placed.
_in_flight: dict[str, datetime] = {}


def _to_e164(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit() or ch == "+")


def _within_calling_window(campaign: Campaign, now_utc: datetime) -> bool:
    try:
        local_time = now_utc.astimezone(ZoneInfo(campaign.time_zone)).time()
    except (ZoneInfoNotFoundError, ValueError):
        local_time = now_utc.time()

    try:
        start = datetime.strptime(campaign.calling_window_start, "%H:%M").time()
        end = datetime.strptime(campaign.calling_window_end, "%H:%M").time()
    except ValueError:
        return False

    if start <= end:
        return start <= local_time <= end
    # Overnight window (e.g. 22:00 - 06:00).
    return local_time >= start or local_time <= end


def _is_in_flight(lead_id: str, now_utc: datetime) -> bool:
    placed_at = _in_flight.get(lead_id)
    if placed_at is None:
        return False
    if now_utc - placed_at > IN_FLIGHT_TIMEOUT:
        del _in_flight[lead_id]
        return False
    return True


def _next_lead(campaign: Campaign, now_utc: datetime) -> Lead | None:
    retry_interval = timedelta(minutes=campaign.retry_interval_minutes)
    for lead in campaign.leads:
        if _is_in_flight(lead.id, now_utc):
            continue
        if lead.status == LeadStatus.not_contacted:
            return lead
        if lead.status in (LeadStatus.busy, LeadStatus.failed) and lead.call_attempts < campaign.max_retries:
            if lead.last_call_at is None or now_utc - lead.last_call_at >= retry_interval:
                return lead
    return None


def _recompute_status(campaign: Campaign) -> None:
    """Mark an active campaign completed once every lead has either answered
    or exhausted its retries."""
    if campaign.status != CampaignStatus.active:
        return

    for lead in campaign.leads:
        if lead.status == LeadStatus.answered:
            continue
        if lead.status in (LeadStatus.busy, LeadStatus.failed) and lead.call_attempts >= campaign.max_retries:
            continue
        return

    campaign.status = CampaignStatus.completed
    campaign.updated_at = datetime.now(timezone.utc)


async def _place_call(campaign: Campaign, lead: Lead, base_url: str) -> None:
    company = _companies.get(campaign.company_id)
    if company is None or not company.inbound_phone_number:
        return

    to_number = _to_e164(lead.phone_number)
    from_number = _to_e164(company.inbound_phone_number)
    if not to_number or not from_number:
        return

    query = urlencode({"campaign_id": campaign.id, "lead_id": lead.id})
    voice_url = f"{base_url}/api/v1/telephony/outbound-voice?{query}"
    status_url = f"{base_url}/api/v1/telephony/outbound-status?{query}"

    try:
        await asyncio.to_thread(twilio_client.create_call, to_number, from_number, voice_url, status_url)
    except TwilioError:
        return

    now = datetime.now(timezone.utc)
    lead.call_attempts += 1
    lead.last_call_at = now
    _in_flight[lead.id] = now
    campaign.updated_at = now


async def dialer_tick() -> None:
    """Scan every active campaign and place at most one outbound call per
    campaign per tick."""
    if not PUBLIC_BASE_URL:
        # Twilio needs a publicly reachable webhook to fetch TwiML from --
        # without one, leave campaigns active but don't attempt to dial.
        return

    base_url = PUBLIC_BASE_URL.rstrip("/")
    now = datetime.now(timezone.utc)

    for campaign in _campaigns.values():
        if campaign.status != CampaignStatus.active:
            continue
        if not _within_calling_window(campaign, now):
            continue

        lead = _next_lead(campaign, now)
        if lead is not None:
            await _place_call(campaign, lead, base_url)

        _recompute_status(campaign)


async def dialer_loop() -> None:
    while True:
        await asyncio.sleep(DIALER_TICK_SECONDS)
        try:
            await dialer_tick()
        except Exception:
            # Never let a transient error (e.g. a flaky Twilio call) kill
            # the background loop.
            pass


def resolve_call_outcome(campaign_id: str, lead_id: str, call_status: str) -> None:
    """Apply the final CallStatus from Twilio's status callback to a lead,
    then re-check whether the campaign is now complete."""
    _in_flight.pop(lead_id, None)

    campaign = _campaigns.get(campaign_id)
    if campaign is None:
        return

    lead = next((candidate for candidate in campaign.leads if candidate.id == lead_id), None)
    if lead is None:
        return

    new_status = _CALL_STATUS_TO_LEAD_STATUS.get(call_status)
    if new_status is not None:
        lead.status = new_status

    campaign.updated_at = datetime.now(timezone.utc)
    _recompute_status(campaign)
