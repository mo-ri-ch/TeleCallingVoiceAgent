"""Exotel inbound voice webhook (ExoML-based).

Flow per call turn:
  1. POST /exotel/voice   → Sarvam TTS greeting → Play + Gather(speech)
  2. POST /exotel/gather  → SpeechResult → Claude LLM → Sarvam TTS reply → Play + Gather
  3. POST /exotel/status  → call ended → post-call worker
"""

import asyncio
import base64
import json
import uuid
from pathlib import Path
from xml.sax.saxutils import escape

from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect

from app.api.routes.companies import _companies
from app.core.config import PUBLIC_BASE_URL
from app.models.telephony import AgentState, CallState, TurnRole
from app.services import audio_codec, post_call_worker, sarvam, telephony_session
from app.services.llm import FALLBACK_REPLY, LLMError, build_system_prompt, get_chat_reply
from app.services.sarvam import SarvamError
from app.services.vector_store import search

router = APIRouter(prefix="/exotel", tags=["exotel"])

TTS_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "exotel_tts"
TTS_DIR.mkdir(parents=True, exist_ok=True)

# call_sid → {company_id, turn_index}
_sessions: dict[str, dict] = {}

# Pre-cached greeting audio: company_id → mulaw bytes (ready to stream instantly)
_greeting_cache: dict[str, bytes] = {}


def _greeting_text(company) -> str:
    return (f"Hello! Thank you for calling {company.name}. "
            f"I'm {company.agent_name}, how can I help you today?")


def _presynthesise_greetings() -> None:
    """Called at startup — synthesize greeting for every company so first audio
    is sent within milliseconds of the WebSocket start event."""
    for company in _companies.values():
        try:
            lang = sarvam.language_code_for(company.primary_language.value)
            wav = sarvam.synthesize(_greeting_text(company), lang)
            _greeting_cache[company.id] = audio_codec.wav_to_twilio_mulaw(wav)
        except Exception:
            pass


# Run at import time (companies seed runs before this module is imported)
_presynthesise_greetings()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _base_url(request: Request) -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL.rstrip("/")
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("host", request.url.netloc)
    return f"{proto}://{host}"


def _find_company(to_number: str):
    normalized = "".join(ch for ch in to_number if ch.isdigit())
    for company in _companies.values():
        if company.inbound_phone_number:
            if "".join(ch for ch in company.inbound_phone_number if ch.isdigit()) == normalized:
                return company
    # Demo fallback: use first company so test calls always connect
    return next(iter(_companies.values()), None)


def _gather_xml(base_url: str, call_sid: str, play_url: str = "", say_text: str = "") -> str:
    gather_url = f"{base_url}/api/v1/exotel/gather?call_sid={call_sid}"
    audio_tag = (
        f'<Play>{escape(play_url)}</Play>' if play_url
        else f'<Say voice="woman" language="en-IN">{escape(say_text)}</Say>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        + audio_tag
        + f'<Gather input="speech" action="{escape(gather_url)}" method="POST" '
        f'timeout="5" speechTimeout="2" language="en-IN hi-IN ml-IN">'
        "</Gather>"
        # If caller says nothing, re-prompt once then hangup
        + f'<Say voice="woman" language="en-IN">Sorry, I didn\'t catch that. Goodbye.</Say>'
        + "<Hangup/>"
        + "</Response>"
    )


async def _tts_file(text: str, language_code: str, filename: str) -> str | None:
    """Synthesize text to a WAV file in TTS_DIR. Returns file path or None."""
    try:
        audio_bytes = await asyncio.to_thread(sarvam.synthesize, text, language_code)
        path = TTS_DIR / filename
        path.write_bytes(audio_bytes)
        return filename
    except SarvamError:
        return None


def _build_history(call_sid: str) -> list[dict[str, str]]:
    session = telephony_session.get_session(call_sid)
    if session is None:
        return []
    turns = session.turns
    first_caller = next((i for i, t in enumerate(turns) if t.role == TurnRole.caller), None)
    if first_caller is None:
        return []
    role_map = {TurnRole.caller: "user", TurnRole.agent: "assistant"}
    return [{"role": role_map[t.role], "content": t.text} for t in turns[first_caller:]]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/voice")
async def exotel_voice(request: Request) -> Response:
    """Exotel calls this when a call arrives on the ExoPhone."""
    form = await request.form()
    call_sid = str(form.get("CallSid", str(uuid.uuid4())))
    from_number = str(form.get("From", "unknown"))
    to_number = str(form.get("To", ""))

    company = _find_company(to_number)
    if company is None:
        xml = ('<?xml version="1.0" encoding="UTF-8"?><Response>'
               '<Say>This number is not configured. Goodbye.</Say><Hangup/></Response>')
        return Response(content=xml, media_type="application/xml")

    _sessions[call_sid] = {"company_id": company.id, "turn_index": 0}
    telephony_session.start_session(
        call_sid=call_sid,
        company_id=company.id,
        from_number=from_number,
        to_number=to_number,
    )

    greeting = (
        f"Hello! Thank you for calling {company.name}. "
        f"I'm {company.agent_name}, how can I help you today?"
    )
    telephony_session.add_turn(call_sid, TurnRole.agent, greeting)

    language_code = sarvam.language_code_for(company.primary_language.value)
    base_url = _base_url(request)

    filename = await _tts_file(greeting, language_code, f"{call_sid}_0.wav")
    if filename:
        play_url = f"{base_url}/api/v1/exotel/audio/{filename}"
        xml = _gather_xml(base_url, call_sid, play_url=play_url)
    else:
        xml = _gather_xml(base_url, call_sid, say_text=greeting)

    return Response(content=xml, media_type="application/xml")


@router.post("/gather")
async def exotel_gather(request: Request, call_sid: str = "") -> Response:
    """Exotel calls this after the caller finishes speaking (Gather result)."""
    form = await request.form()
    if not call_sid:
        call_sid = str(form.get("CallSid", ""))

    speech_result = str(form.get("SpeechResult", "")).strip()
    session_data = _sessions.get(call_sid)

    if not session_data or not speech_result:
        xml = ('<?xml version="1.0" encoding="UTF-8"?><Response>'
               '<Say>Sorry, I couldn\'t hear you clearly. Please call again. Goodbye.</Say>'
               '<Hangup/></Response>')
        return Response(content=xml, media_type="application/xml")

    company_id = session_data["company_id"]
    company = _companies.get(company_id)
    if company is None:
        return Response(
            content='<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
            media_type="application/xml",
        )

    telephony_session.add_turn(call_sid, TurnRole.caller, speech_result)
    history = _build_history(call_sid)

    context_results = search(company_id, speech_result, top_k=5)
    system_prompt = build_system_prompt(company, context_results)

    try:
        reply_text = await asyncio.to_thread(get_chat_reply, system_prompt, history)
    except LLMError:
        reply_text = FALLBACK_REPLY

    telephony_session.add_turn(call_sid, TurnRole.agent, reply_text)
    session_data["turn_index"] += 1

    language_code = sarvam.language_code_for(company.primary_language.value)
    base_url = _base_url(request)
    turn = session_data["turn_index"]

    filename = await _tts_file(reply_text, language_code, f"{call_sid}_{turn}.wav")
    if filename:
        play_url = f"{base_url}/api/v1/exotel/audio/{filename}"
        xml = _gather_xml(base_url, call_sid, play_url=play_url)
    else:
        xml = _gather_xml(base_url, call_sid, say_text=reply_text)

    return Response(content=xml, media_type="application/xml")


@router.get("/audio/{filename}")
async def serve_audio(filename: str) -> Response:
    """Serve Sarvam TTS audio files to Exotel's <Play> verb."""
    # Prevent path traversal
    safe = Path(filename).name
    path = TTS_DIR / safe
    if not path.exists():
        return Response(status_code=404)
    return Response(content=path.read_bytes(), media_type="audio/wav")


@router.websocket("/stream")
async def exotel_stream(websocket: WebSocket) -> None:
    """Exotel AgentStream WebSocket — same pipeline as Twilio Media Streams."""
    await websocket.accept()

    SILENCE_RMS = 500
    MIN_SPEECH = 8
    SILENCE_TO_FINALIZE = 35

    state: dict = {
        "company": None, "company_id": "", "call_sid": "",
        "stream_sid": "", "buffer": bytearray(),
        "speech_frames": 0, "silence_frames": 0, "processing": False,
    }

    async def _send_audio(wav_bytes: bytes) -> None:
        mulaw = audio_codec.wav_to_twilio_mulaw(wav_bytes)
        telephony_session.append_audio(state["call_sid"], mulaw)
        payload = base64.b64encode(mulaw).decode()
        await websocket.send_text(json.dumps({
            "event": "media",
            "streamSid": state["stream_sid"],
            "media": {"payload": payload},
        }))

    async def _process(utterance: bytes) -> None:
        call_sid = state["call_sid"]
        company = state["company"]
        company_id = state["company_id"]
        try:
            telephony_session.set_agent_state(call_sid, AgentState.thinking)
            language_code = sarvam.language_code_for(company.primary_language.value)
            wav = audio_codec.twilio_audio_to_wav16k(utterance)
            try:
                transcript = await asyncio.to_thread(sarvam.transcribe, wav, language_code)
            except SarvamError:
                transcript = ""
            if not transcript:
                telephony_session.set_agent_state(call_sid, AgentState.listening)
                return
            telephony_session.add_turn(call_sid, TurnRole.caller, transcript)
            session = telephony_session.get_session(call_sid)
            turns = session.turns if session else []
            first = next((i for i, t in enumerate(turns) if t.role == TurnRole.caller), None)
            history = []
            if first is not None:
                rm = {TurnRole.caller: "user", TurnRole.agent: "assistant"}
                history = [{"role": rm[t.role], "content": t.text} for t in turns[first:]]
            ctx = search(company_id, transcript, top_k=5)
            system_prompt = build_system_prompt(company, ctx)
            try:
                reply = await asyncio.to_thread(get_chat_reply, system_prompt, history)
            except LLMError:
                reply = FALLBACK_REPLY
            telephony_session.add_turn(call_sid, TurnRole.agent, reply)
            telephony_session.set_agent_state(call_sid, AgentState.speaking)
            try:
                audio = await asyncio.to_thread(sarvam.synthesize, reply, language_code)
                await _send_audio(audio)
            except SarvamError:
                pass
            telephony_session.set_call_state(call_sid, CallState.interacting)
            telephony_session.set_agent_state(call_sid, AgentState.listening)
        finally:
            state["processing"] = False

    _debug_log = Path(__file__).resolve().parent.parent.parent / "static" / "exotel_debug.jsonl"
    _debug_count = 0

    # Write immediately so we know the handler started
    with _debug_log.open("a") as f:
        f.write('{"event":"handler_started"}\n')

    try:
        while True:
            # Accept both text and binary frames from Exotel
            data = await websocket.receive()
            if "text" in data:
                raw = data["text"]
            elif "bytes" in data:
                raw = data["bytes"].decode("utf-8", errors="replace")
            else:
                # disconnect frame
                break

            # Log raw message for inspection (first 20 only, truncate media payloads)
            if _debug_count < 20:
                try:
                    log_msg = json.loads(raw)
                    if log_msg.get("event") == "media":
                        log_msg["media"] = {"payload": "...(truncated)"}
                    with _debug_log.open("a") as f:
                        f.write(json.dumps(log_msg) + "\n")
                except Exception:
                    with _debug_log.open("a") as f:
                        f.write(f"RAW: {raw[:300]}\n")
                _debug_count += 1

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            event = msg.get("event")

            if event == "connected":
                continue

            elif event == "start":
                start = msg.get("start", {})
                params = start.get("customParameters") or {}
                call_sid = start.get("callSid", str(uuid.uuid4()))
                from_number = params.get("from") or start.get("from", "")
                to_number = params.get("to") or start.get("to", "")
                company_id = params.get("company_id", "")

                state["call_sid"] = call_sid
                state["stream_sid"] = start.get("streamSid", msg.get("streamSid", ""))

                company = _companies.get(company_id) or _find_company(to_number)
                state["company"] = company
                state["company_id"] = company.id if company else ""

                if company is None:
                    break

                telephony_session.start_session(call_sid=call_sid, company_id=company.id,
                                                from_number=from_number, to_number=to_number)
                greeting = _greeting_text(company)
                telephony_session.add_turn(call_sid, TurnRole.agent, greeting)

                # Send cached greeting instantly — no TTS latency on first response
                cached_mulaw = _greeting_cache.get(company.id)
                if cached_mulaw:
                    payload = base64.b64encode(cached_mulaw).decode()
                    await websocket.send_text(json.dumps({
                        "event": "media",
                        "streamSid": state["stream_sid"],
                        "media": {"payload": payload},
                    }))
                else:
                    # Fallback: synthesise now (slower, may timeout)
                    try:
                        lang = sarvam.language_code_for(company.primary_language.value)
                        audio = await asyncio.to_thread(sarvam.synthesize, greeting, lang)
                        await _send_audio(audio)
                    except SarvamError:
                        pass

                telephony_session.set_call_state(call_sid, CallState.interacting)
                telephony_session.set_agent_state(call_sid, AgentState.listening)

            elif event == "media":
                if state["company"] is None:
                    continue
                media = msg.get("media", {})
                if media.get("track") not in (None, "inbound"):
                    continue
                chunk = base64.b64decode(media["payload"])
                state["buffer"].extend(chunk)
                telephony_session.append_audio(state["call_sid"], chunk)
                if audio_codec.rms(chunk) > SILENCE_RMS:
                    state["speech_frames"] += 1
                    state["silence_frames"] = 0
                else:
                    state["silence_frames"] += 1
                if (not state["processing"]
                        and state["speech_frames"] >= MIN_SPEECH
                        and state["silence_frames"] >= SILENCE_TO_FINALIZE):
                    utterance = bytes(state["buffer"])
                    state["buffer"].clear()
                    state["speech_frames"] = 0
                    state["silence_frames"] = 0
                    state["processing"] = True
                    asyncio.create_task(_process(utterance))

            elif event == "stop":
                break

    except WebSocketDisconnect:
        pass
    finally:
        call_sid = state["call_sid"]
        if call_sid:
            telephony_session.end_session(call_sid)
            asyncio.create_task(post_call_worker.process_completed_call(call_sid))
            _sessions.pop(call_sid, None)


@router.post("/status")
async def exotel_call_status(request: Request) -> Response:
    """Exotel status callback — fires when the call ends."""
    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    if call_sid:
        telephony_session.end_session(call_sid)
        asyncio.create_task(post_call_worker.process_completed_call(call_sid))
        _sessions.pop(call_sid, None)
    return Response(status_code=204)
