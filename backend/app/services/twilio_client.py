"""Minimal Twilio REST API client (httpx, no SDK).

Used by the warm-transfer flow (Phase 12) to redirect a live inbound call
away from the AI media stream and into a <Dial> that rings the configured
escalation number.
"""

import httpx

from app.core.config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

API_BASE = "https://api.twilio.com/2010-04-01"


class TwilioError(Exception):
    """Raised when a Twilio REST API call cannot be completed."""


def redirect_call(call_sid: str, twiml: str) -> None:
    """Redirect a live call to new TwiML instructions, e.g. to start a
    warm-transfer <Dial>. Raises TwilioError if credentials are missing or
    the API call fails."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise TwilioError("Twilio REST API credentials are not configured on the server.")

    url = f"{API_BASE}/Accounts/{TWILIO_ACCOUNT_SID}/Calls/{call_sid}.json"

    try:
        response = httpx.post(
            url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"Twiml": twiml},
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise TwilioError(f"Could not reach the Twilio API: {exc}") from exc

    if response.status_code >= 400:
        raise TwilioError(f"Twilio API error ({response.status_code}): {response.text}")


def create_call(to: str, from_: str, twiml_url: str, status_callback_url: str) -> str:
    """Place a new outbound call (Phase 14's campaign dialer). Twilio will
    request TwiML from `twiml_url` once the call connects, and POST the
    final call status to `status_callback_url` when it ends. Returns the new
    call's SID. Raises TwilioError if credentials are missing or the API
    call fails."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise TwilioError("Twilio REST API credentials are not configured on the server.")

    url = f"{API_BASE}/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"

    try:
        response = httpx.post(
            url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={
                "To": to,
                "From": from_,
                "Url": twiml_url,
                "StatusCallback": status_callback_url,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise TwilioError(f"Could not reach the Twilio API: {exc}") from exc

    if response.status_code >= 400:
        raise TwilioError(f"Twilio API error ({response.status_code}): {response.text}")

    return response.json()["sid"]
