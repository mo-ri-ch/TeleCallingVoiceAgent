"""Application configuration loaded from environment variables / .env."""

import os

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = "claude-sonnet-4-6"

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
SARVAM_STT_MODEL = "saarika:v2.5"
SARVAM_TTS_MODEL = "bulbul:v2"
SARVAM_TTS_SPEAKER = "anushka"

# Public HTTPS URL (e.g. an ngrok tunnel) this server is reachable at. Used
# only to display the Twilio webhook URL in the admin dashboard -- the actual
# <Stream> WebSocket URL is derived from the incoming webhook request's host.
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")

# Twilio REST API credentials, used by the warm-transfer flow (Phase 12) to
# redirect a live call into a <Dial> that rings the configured escalation
# number. Leave blank to disable real call transfers -- the AI will instead
# apologize and keep helping on the same call.
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")

# AWS S3, used by the post-call worker (Phase 15) to store call recordings.
# Leave blank to save recordings to local disk instead, served from
# /recordings by the API.
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")
AWS_S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")

# Google Sheets sync, used by the post-call worker (Phase 15) to append a row
# with each call's metrics to a connected spreadsheet. Leave blank to skip
# syncing -- the call report is still generated and stored locally.
GOOGLE_SHEETS_SPREADSHEET_ID = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "")
GOOGLE_SHEETS_RANGE = os.environ.get("GOOGLE_SHEETS_RANGE", "Sheet1!A1")
GOOGLE_SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "")

# Maps our PrimaryLanguage enum values to Sarvam AI's BCP-47 language codes.
SARVAM_LANGUAGE_CODES = {
    "malayalam": "ml-IN",
    "hindi": "hi-IN",
    "english": "en-IN",
    "tamil": "ta-IN",
    "kannada": "kn-IN",
}
