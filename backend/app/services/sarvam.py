"""Client for Sarvam AI's Speech-to-Text (saarika) and Text-to-Speech (bulbul)
APIs, used to give the playground fluent, code-switched ("Manglish") Malayalam
voice support."""

import base64

import httpx

from app.core.config import (
    SARVAM_API_KEY,
    SARVAM_LANGUAGE_CODES,
    SARVAM_STT_MODEL,
    SARVAM_TTS_MODEL,
    SARVAM_TTS_SPEAKER,
)

STT_URL = "https://api.sarvam.ai/speech-to-text"
TTS_URL = "https://api.sarvam.ai/text-to-speech"

DEFAULT_LANGUAGE_CODE = "ml-IN"


class SarvamError(Exception):
    """Raised when a Sarvam AI API call cannot be completed."""


def language_code_for(primary_language: str) -> str:
    return SARVAM_LANGUAGE_CODES.get(primary_language, DEFAULT_LANGUAGE_CODE)


def transcribe(audio_bytes: bytes, language_code: str) -> str:
    """Transcribe PCM16 WAV audio to text using Sarvam Saarika STT.

    Saarika natively handles code-mixed ("Manglish") speech, transcribing
    Malayalam words in Malayalam script while keeping English words as-is.
    """
    if not SARVAM_API_KEY:
        raise SarvamError("SARVAM_API_KEY is not configured on the server.")

    headers = {"API-Subscription-Key": SARVAM_API_KEY}
    files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
    data = {"model": SARVAM_STT_MODEL, "language_code": language_code}

    try:
        response = httpx.post(STT_URL, headers=headers, files=files, data=data, timeout=30.0)
    except httpx.HTTPError as exc:
        raise SarvamError(f"Could not reach Sarvam STT API: {exc}") from exc

    if response.status_code != 200:
        raise SarvamError(f"Sarvam STT API error ({response.status_code}): {response.text}")

    transcript = response.json().get("transcript", "")
    return transcript.strip()


def synthesize(text: str, language_code: str) -> bytes:
    """Convert text to speech using Sarvam Bulbul TTS, returning WAV audio bytes."""
    if not SARVAM_API_KEY:
        raise SarvamError("SARVAM_API_KEY is not configured on the server.")

    headers = {
        "API-Subscription-Key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": language_code,
        "speaker": SARVAM_TTS_SPEAKER,
        "model": SARVAM_TTS_MODEL,
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.0,
        "speech_sample_rate": 16000,
        "enable_preprocessing": True,
    }

    try:
        response = httpx.post(TTS_URL, headers=headers, json=payload, timeout=30.0)
    except httpx.HTTPError as exc:
        raise SarvamError(f"Could not reach Sarvam TTS API: {exc}") from exc

    if response.status_code != 200:
        raise SarvamError(f"Sarvam TTS API error ({response.status_code}): {response.text}")

    audios = response.json().get("audios", [])
    if not audios:
        raise SarvamError("Sarvam TTS API returned no audio.")

    return base64.b64decode(audios[0])
