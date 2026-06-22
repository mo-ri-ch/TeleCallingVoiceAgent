"""Call recording storage (Phase 15).

Uploads the WAV recording to AWS S3 if a bucket and credentials are
configured (requires the optional `boto3` dependency); otherwise saves it to
local disk under app/static/recordings, served by the API at /recordings/...
so the "Play Recording" button in the dashboard always works.
"""

from pathlib import Path

from app.core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_SECRET_ACCESS_KEY,
)

RECORDINGS_DIR = Path(__file__).resolve().parent.parent / "static" / "recordings"


def _save_locally(call_sid: str, wav_bytes: bytes) -> str:
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    path = RECORDINGS_DIR / f"{call_sid}.wav"
    path.write_bytes(wav_bytes)
    return f"/recordings/{call_sid}.wav"


def _upload_to_s3(call_sid: str, wav_bytes: bytes) -> str | None:
    try:
        import boto3
    except ImportError:
        return None

    key = f"recordings/{call_sid}.wav"
    client = boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )
    try:
        client.put_object(Bucket=AWS_S3_BUCKET, Key=key, Body=wav_bytes, ContentType="audio/wav")
    except Exception:
        return None
    return f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{key}"


def save_recording(call_sid: str, wav_bytes: bytes) -> str:
    """Save a call recording and return a URL the dashboard can play it from."""
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET:
        url = _upload_to_s3(call_sid, wav_bytes)
        if url is not None:
            return url

    return _save_locally(call_sid, wav_bytes)
