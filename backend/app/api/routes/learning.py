"""Learning Studio routes (Phases 16-21).

Trainers upload human-to-human call recordings, trigger transcription and tone
analysis, mine Power/Drop phrases, manage the Objection Playbook, and approve
prompt updates that are compiled into the live agent.
"""

import asyncio
import math
import wave
from array import array
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi import Form as FastForm

from app.models.learning import (
    CallDirection,
    RecordingOutcome,
    RecordingStatus,
    RecordingUpload,
    TranscriptSegment,
    ToneProfile,
)
from app.models.objection import ObjectionEntry
from app.services import learning_compiler, objection_classifier, phrase_miner, tone_analyzer, transcription_worker

router = APIRouter(prefix="/learning", tags=["learning"])

LEARNING_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "learning_uploads"
ACCEPTED_EXTENSIONS = {".mp3", ".wav", ".mp4"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_RECORDINGS = 200

_recordings: dict[str, RecordingUpload] = {}
_recording_order: list[str] = []

# Objection Playbook store (Phase 20).
_objections: dict[str, ObjectionEntry] = {}
_objection_order: list[str] = []


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def add_recording(record: RecordingUpload) -> None:
    _recordings[record.id] = record
    if record.id in _recording_order:
        _recording_order.remove(record.id)
    _recording_order.insert(0, record.id)
    del _recording_order[MAX_RECORDINGS:]


def _detect_wav_duration(path: Path) -> float:
    try:
        with wave.open(str(path), "rb") as wf:
            return wf.getnframes() / wf.getframerate()
    except Exception:
        return 0.0


def _generate_tone_wav(duration_s: float = 2.0, frequency: float = 440.0, sample_rate: int = 8000) -> bytes:
    import io
    n = int(sample_rate * duration_s)
    amplitude = 8000
    samples = array(
        "h",
        (int(amplitude * math.sin(2 * math.pi * frequency * i / sample_rate)) for i in range(n)),
    )
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(samples.tobytes())
    return buf.getvalue()


def _seed() -> None:
    LEARNING_DIR.mkdir(parents=True, exist_ok=True)

    seed_data = [
        dict(
            id="seed-rec-1",
            label="Successful MERN Stack Enrollment",
            outcome=RecordingOutcome.enrolled,
            call_direction=CallDirection.outbound,
            rating=5,
            file_name="mern_enrollment_call.wav",
            frequency=523.25,
            duration=3.0,
            status=RecordingStatus.ready,
            uploaded_at=datetime(2026, 6, 10, 9, 0, 0, tzinfo=timezone.utc),
        ),
        dict(
            id="seed-rec-2",
            label="Interested Lead – Data Science Query",
            outcome=RecordingOutcome.interested,
            call_direction=CallDirection.inbound,
            rating=4,
            file_name="data_science_inbound.wav",
            frequency=392.0,
            duration=2.5,
            status=RecordingStatus.uploaded,
            uploaded_at=datetime(2026, 6, 11, 14, 30, 0, tzinfo=timezone.utc),
        ),
        dict(
            id="seed-rec-3",
            label="Lost Sale – Price Objection",
            outcome=RecordingOutcome.not_interested,
            call_direction=CallDirection.outbound,
            rating=2,
            file_name="price_objection_outbound.wav",
            frequency=261.63,
            duration=2.0,
            status=RecordingStatus.uploaded,
            uploaded_at=datetime(2026, 6, 12, 11, 15, 0, tzinfo=timezone.utc),
        ),
    ]

    for seed in seed_data:
        wav = _generate_tone_wav(seed["duration"], seed["frequency"])
        path = LEARNING_DIR / f"{seed['id']}.wav"
        path.write_bytes(wav)
        # Pre-populate transcript for "ready" seed recordings (Phase 17).
        seed_transcript: list[TranscriptSegment] = []
        if seed["status"] == RecordingStatus.ready:
            seed_transcript = transcription_worker._build_segments(seed["id"], seed["duration"])
        record = RecordingUpload(
            id=seed["id"],
            label=seed["label"],
            outcome=seed["outcome"],
            call_direction=seed["call_direction"],
            rating=seed["rating"],
            file_name=seed["file_name"],
            file_size=len(wav),
            file_url=f"/learning-uploads/{seed['id']}.wav",
            duration_seconds=seed["duration"],
            status=seed["status"],
            uploaded_at=seed["uploaded_at"],
            tone_profile=tone_analyzer.analyze_tone(seed["id"], seed["rating"], seed["duration"]),
            transcript=seed_transcript,
        )
        add_recording(record)

    # Seed objection playbook (Phase 20).
    for obj in objection_classifier.SEED_OBJECTIONS:
        _objections[obj.id] = obj
        if obj.id not in _objection_order:
            _objection_order.append(obj.id)


_seed()


# ---------------------------------------------------------------------------
# Recording endpoints (Phase 16)
# ---------------------------------------------------------------------------

@router.get("/recordings", response_model=list[RecordingUpload])
def list_recordings() -> list[RecordingUpload]:
    return [_recordings[rid] for rid in _recording_order if rid in _recordings]


@router.get("/recordings/{record_id}", response_model=RecordingUpload)
def get_recording(record_id: str) -> RecordingUpload:
    record = _recordings.get(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    return record


@router.post("/recordings", response_model=RecordingUpload, status_code=201)
async def upload_recording(
    file: UploadFile,
    label: str = FastForm(),
    outcome: RecordingOutcome = FastForm(),
    call_direction: CallDirection = FastForm(),
    rating: int = FastForm(ge=1, le=5),
) -> RecordingUpload:
    original_name = file.filename or "recording"
    ext = Path(original_name).suffix.lower()
    if ext not in ACCEPTED_EXTENSIONS:
        raise HTTPException(status_code=422, detail="File must be .mp3, .wav, or .mp4")

    LEARNING_DIR.mkdir(parents=True, exist_ok=True)
    record_id = str(uuid4())
    saved_name = f"{record_id}{ext}"
    saved_path = LEARNING_DIR / saved_name

    try:
        with open(saved_path, "wb") as out:
            while True:
                chunk = await file.read(65536)
                if not chunk:
                    break
                out.write(chunk)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not save the uploaded file.") from exc

    file_size = saved_path.stat().st_size
    if file_size > MAX_FILE_SIZE:
        saved_path.unlink(missing_ok=True)
        raise HTTPException(status_code=413, detail="File exceeds the 500 MB limit.")

    duration_seconds = _detect_wav_duration(saved_path) if ext == ".wav" else 0.0
    tone = tone_analyzer.analyze_tone(record_id, rating, duration_seconds)

    record = RecordingUpload(
        id=record_id,
        label=label.strip() or Path(original_name).stem,
        outcome=outcome,
        call_direction=call_direction,
        rating=rating,
        file_name=original_name,
        file_size=file_size,
        file_url=f"/learning-uploads/{saved_name}",
        duration_seconds=duration_seconds,
        status=RecordingStatus.uploaded,
        uploaded_at=datetime.now(timezone.utc),
        tone_profile=tone,
    )
    add_recording(record)

    # Phase 17: Start background transcription immediately.
    asyncio.create_task(transcription_worker.transcribe_recording(record_id))

    return record


# ---------------------------------------------------------------------------
# Transcription (Phase 17)
# ---------------------------------------------------------------------------

@router.post("/recordings/{record_id}/transcribe", response_model=RecordingUpload)
async def trigger_transcription(record_id: str) -> RecordingUpload:
    """Manually re-trigger transcription for a recording."""
    record = _recordings.get(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    asyncio.create_task(transcription_worker.transcribe_recording(record_id))
    return record


# ---------------------------------------------------------------------------
# Phrase Mining (Phase 19)
# ---------------------------------------------------------------------------

@router.get("/phrase-mine")
def get_phrase_mine() -> dict:
    all_recordings = [_recordings[rid] for rid in _recording_order if rid in _recordings]
    return phrase_miner.mine_phrases(all_recordings)


# ---------------------------------------------------------------------------
# Objection Playbook (Phase 20)
# ---------------------------------------------------------------------------

@router.get("/objections", response_model=list[ObjectionEntry])
def list_objections() -> list[ObjectionEntry]:
    return [_objections[oid] for oid in _objection_order if oid in _objections]


@router.post("/objections", response_model=ObjectionEntry, status_code=201)
def create_objection(body: dict) -> ObjectionEntry:
    text = str(body.get("objection_text", "")).strip()
    if not text:
        raise HTTPException(status_code=422, detail="objection_text is required")
    entry = objection_classifier.build_entry(text)
    _objections[entry.id] = entry
    _objection_order.insert(0, entry.id)
    return entry


@router.put("/objections/{objection_id}", response_model=ObjectionEntry)
def update_objection(objection_id: str, body: dict) -> ObjectionEntry:
    entry = _objections.get(objection_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Objection not found")
    if "best_response" in body:
        entry.best_response = str(body["best_response"])
    if "win_percent" in body:
        entry.win_percent = float(body["win_percent"])
    entry.updated_at = datetime.now(timezone.utc)
    return entry


@router.delete("/objections/{objection_id}", status_code=204)
def delete_objection(objection_id: str) -> None:
    if objection_id not in _objections:
        raise HTTPException(status_code=404, detail="Objection not found")
    del _objections[objection_id]
    if objection_id in _objection_order:
        _objection_order.remove(objection_id)


# ---------------------------------------------------------------------------
# Learning Integration Loop (Phase 21)
# ---------------------------------------------------------------------------

@router.get("/compiled-prompt")
def get_compiled_prompt() -> dict:
    """Return the diff of what will be injected into the live agent's system prompt."""
    all_recordings = [_recordings[rid] for rid in _recording_order if rid in _recordings]
    mined = phrase_miner.mine_phrases(all_recordings)
    all_objections = [_objections[oid] for oid in _objection_order if oid in _objections]
    return learning_compiler.compile_prompt_update(
        mined["power_phrases"],
        mined["drop_phrases"],
        all_objections,
    )


@router.post("/apply-update")
def apply_update(body: dict) -> dict:
    """Approve and inject the compiled prompt update into the live agent."""
    diff = str(body.get("diff", "")).strip()
    if not diff:
        raise HTTPException(status_code=422, detail="diff is required")
    learning_compiler.apply_update(diff)
    return {"status": "applied", "diff": diff}
