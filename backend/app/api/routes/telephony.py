"""Inbound telephony hook (Twilio Media Streams) and warm transfer (Phase 12).

Twilio calls `POST /voice` when a call comes in to a configured number; we
respond with TwiML that opens a bidirectional WebSocket (`/media`) carrying
mu-law/8kHz audio. Each caller utterance is run through the same
STT -> RAG -> LLM -> TTS pipeline as the AI Agent Playground (Phase 9).

When the caller asks for a human (or the LLM flags frustration), we redirect
the live call via the Twilio REST API into a <Dial> that rings the company's
escalation number, plays a short synthesized briefing to the human agent
(the "whisper"), and bridges the two lines. If no Twilio REST credentials are
configured, the agent apologizes and keeps helping on the same call instead.
"""

import asyncio
import base64
import json
from datetime import datetime, timezone
from urllib.parse import urlencode
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect

from app.api.routes.campaigns import _campaigns
from app.api.routes.companies import _companies
from app.core.config import PUBLIC_BASE_URL
from app.models.company import CompanyProfile
from app.models.telephony import (
    AgentState,
    CallState,
    TelephonyCallSession,
    TelephonyConfig,
    TelephonyConfigUpdate,
    TurnRole,
)
from app.services import (
    action_selector,
    audio_codec,
    campaign_dialer,
    engagement_tracker,
    guardrail,
    post_call_worker,
    sarvam,
    telephony_session,
    twilio_client,
)
from app.services.llm import (
    FALLBACK_REPLY,
    LLMError,
    build_system_prompt,
    get_chat_reply,
    summarize_for_handoff,
)
from app.services.sarvam import SarvamError
from app.services.twilio_client import TwilioError
from app.services.vector_store import search

router = APIRouter(prefix="/telephony", tags=["telephony"])

# Twilio sends 20ms (160 byte) mu-law frames at 8kHz.
SILENCE_RMS_THRESHOLD = 500
MIN_SPEECH_FRAMES = 8  # ~160ms of speech before an utterance counts.
SILENCE_FRAMES_TO_FINALIZE = 35  # ~700ms of trailing silence ends a turn.
MAX_IDLE_BUFFER_BYTES = 160 * 50  # ~1s of audio with no speech detected.

# Phrases that, if the caller says them, trigger a warm transfer to a human.
_ESCALATION_PHRASES = (
    "talk to a human",
    "speak to a human",
    "talk to a person",
    "speak to a person",
    "talk to someone",
    "speak to someone",
    "talk to a manager",
    "speak to a manager",
    "talk to a representative",
    "speak to a representative",
    "connect me to a human",
    "connect me to a manager",
    "connect me to an agent",
    "real person",
    "human agent",
    "human being",
    "customer care",
)

# Appended to the system prompt so the LLM can flag escalation itself (e.g.
# when it detects frustration), even if the caller didn't use a trigger phrase.
_ESCALATION_INSTRUCTION = (
    "\n\nIf the caller explicitly asks to speak with a human, manager, agent, "
    "or representative, or expresses strong frustration or anger, give a brief "
    "reassuring reply (e.g. tell them you're connecting them now) and end your "
    "reply with the exact token [ESCALATE] on its own line. Do not use this "
    "token in any other situation."
)

_HANGUP_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>'


def _wants_escalation(transcript: str) -> bool:
    lowered = transcript.lower()
    return any(phrase in lowered for phrase in _ESCALATION_PHRASES)


def _normalize_number(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def _to_e164(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit() or ch == "+")


def _find_company_for_number(to_number: str) -> CompanyProfile | None:
    normalized = _normalize_number(to_number)
    if not normalized:
        return None
    for company in _companies.values():
        if company.inbound_phone_number and _normalize_number(company.inbound_phone_number) == normalized:
            return company
    return None


def _stream_url_from_request(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    ws_scheme = "wss" if forwarded_proto == "https" else "ws"
    host = request.headers.get("host", request.url.netloc)
    return f"{ws_scheme}://{host}/api/v1/telephony/media"


def _connect_stream_element(
    stream_url: str,
    company_id: str,
    from_number: str,
    to_number: str,
    extra_params: dict[str, str] | None = None,
) -> str:
    params = (
        '<Parameter name="company_id" value="' + escape(company_id) + '" />'
        '<Parameter name="from" value="' + escape(from_number) + '" />'
        '<Parameter name="to" value="' + escape(to_number) + '" />'
    )
    for name, value in (extra_params or {}).items():
        params += '<Parameter name="' + escape(name) + '" value="' + escape(value) + '" />'
    return "<Connect><Stream url=\"" + escape(stream_url) + "\">" + params + "</Stream></Connect>"


def _build_twiml(stream_url: str, company_id: str, from_number: str, to_number: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        + _connect_stream_element(stream_url, company_id, from_number, to_number)
        + "</Response>"
    )


_UNCONFIGURED_TWIML = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    "<Response><Say>This number is not yet configured for an A I agent. "
    "Please configure it in the admin dashboard.</Say><Hangup/></Response>"
)


@router.post("/voice")
async def voice_webhook(request: Request) -> Response:
    """Twilio's inbound call webhook -- returns TwiML to open a media stream."""
    form = await request.form()
    from_number = str(form.get("From", ""))
    to_number = str(form.get("To", ""))

    company = _find_company_for_number(to_number)
    if company is None:
        return Response(content=_UNCONFIGURED_TWIML, media_type="application/xml")

    stream_url = _stream_url_from_request(request)
    twiml = _build_twiml(stream_url, company.id, from_number, to_number)
    return Response(content=twiml, media_type="application/xml")


@router.post("/whisper")
async def whisper_briefing(summary: str = "") -> Response:
    """TwiML played only to the human agent's leg before bridging -- the
    10-second "whisper" briefing them on who is calling and why."""
    text = summary.strip() or "A caller would like to speak with you."
    twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>' + escape(text) + "</Say></Response>"
    return Response(content=twiml, media_type="application/xml")


@router.post("/dial-status")
async def dial_status(request: Request) -> Response:
    """Action callback for the warm-transfer <Dial>. If the human agent never
    answered, hand the caller back to the AI on the same call."""
    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    dial_call_status = str(form.get("DialCallStatus", ""))

    if dial_call_status == "completed":
        telephony_session.end_session(call_sid)
        asyncio.create_task(post_call_worker.process_completed_call(call_sid))
        return Response(content=_HANGUP_TWIML, media_type="application/xml")

    telephony_session.set_call_state(call_sid, CallState.interacting)

    session = telephony_session.get_session(call_sid)
    company_id = session.company_id if session else ""
    from_number = session.from_number if session else ""
    to_number = session.to_number if session else ""

    stream_url = _stream_url_from_request(request)
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        "<Say>I'm sorry, our team is unavailable right now. Let's continue -- "
        "how else can I help?</Say>"
        + _connect_stream_element(stream_url, company_id, from_number, to_number)
        + "</Response>"
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/outbound-voice")
async def outbound_voice_webhook(request: Request, campaign_id: str = "", lead_id: str = "") -> Response:
    """Twilio's webhook for an outbound campaign call (Phase 14) -- greets
    the lead by name and follows up on their interest before connecting to
    the same AI media stream used for inbound calls."""
    campaign = _campaigns.get(campaign_id)
    lead = next((candidate for candidate in campaign.leads if candidate.id == lead_id), None) if campaign else None
    company = _companies.get(campaign.company_id) if campaign else None

    if campaign is None or lead is None or company is None:
        return Response(content=_HANGUP_TWIML, media_type="application/xml")

    form = await request.form()
    company_number = str(form.get("From", ""))
    lead_number = str(form.get("To", ""))

    greeting = f"Hi {lead.name}, this is {company.agent_name} calling from {company.name}."
    if lead.interest_tag:
        greeting += f" I wanted to follow up about your interest in {lead.interest_tag}."

    stream_url = _stream_url_from_request(request)
    extra_params = {
        "outbound": "true",
        "lead_name": lead.name,
        "interest_tag": lead.interest_tag,
    }
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?><Response>'
        "<Say>" + escape(greeting) + "</Say>"
        + _connect_stream_element(stream_url, company.id, lead_number, company_number, extra_params)
        + "</Response>"
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/outbound-status")
async def outbound_status_webhook(request: Request, campaign_id: str = "", lead_id: str = "") -> Response:
    """Twilio's status callback for an outbound campaign call (Phase 14) --
    records whether the lead answered, was busy, or didn't pick up so the
    dialer queue can schedule a retry."""
    form = await request.form()
    call_status = str(form.get("CallStatus", ""))
    campaign_dialer.resolve_call_outcome(campaign_id, lead_id, call_status)
    return Response(status_code=204)


async def _send_audio(websocket: WebSocket, state: dict, wav_bytes: bytes) -> None:
    mulaw_bytes = audio_codec.wav_to_twilio_mulaw(wav_bytes)
    if state["call_sid"]:
        telephony_session.append_audio(state["call_sid"], mulaw_bytes)
    payload = base64.b64encode(mulaw_bytes).decode()
    await websocket.send_text(
        json.dumps({"event": "media", "streamSid": state["stream_sid"], "media": {"payload": payload}})
    )


def _build_history(session: TelephonyCallSession) -> list[dict[str, str]]:
    """Anthropic's Messages API requires history to start with "user" and
    alternate, so skip any leading agent (greeting) turns."""
    turns = session.turns
    first_caller_index = next((i for i, t in enumerate(turns) if t.role == TurnRole.caller), None)
    if first_caller_index is None:
        return []

    role_map = {TurnRole.caller: "user", TurnRole.agent: "assistant"}
    return [{"role": role_map[t.role], "content": t.text} for t in turns[first_caller_index:]]


async def _handle_start(websocket: WebSocket, state: dict, start: dict) -> None:
    params = start.get("customParameters") or {}
    company_id = params.get("company_id", "")
    company = _companies.get(company_id)

    state["company"] = company
    state["company_id"] = company_id
    state["call_sid"] = start.get("callSid", "")
    state["stream_sid"] = start.get("streamSid", "")
    state["lead_name"] = params.get("lead_name", "")
    state["interest_tag"] = params.get("interest_tag", "")

    if company is None:
        return

    is_resumed = telephony_session.get_session(state["call_sid"]) is not None
    telephony_session.start_session(
        call_sid=state["call_sid"],
        company_id=company_id,
        from_number=params.get("from", ""),
        to_number=params.get("to", ""),
    )

    if is_resumed:
        # Resumed after a failed warm transfer -- the apology was already
        # spoken by the /dial-status TwiML, so go straight back to listening.
        telephony_session.set_agent_state(state["call_sid"], AgentState.listening)
        return

    if params.get("outbound") == "true":
        # The lead was already greeted by name in the outbound TwiML's
        # <Say> -- skip the inbound greeting and go straight to listening.
        telephony_session.set_call_state(state["call_sid"], CallState.interacting)
        telephony_session.set_agent_state(state["call_sid"], AgentState.listening)
        return

    language_code = sarvam.language_code_for(company.primary_language.value)
    greeting = (
        f"Hello! Thank you for calling {company.name}. "
        f"I'm {company.agent_name}, how can I help you today?"
    )
    telephony_session.add_turn(state["call_sid"], TurnRole.agent, greeting)

    try:
        audio = await asyncio.to_thread(sarvam.synthesize, greeting, language_code)
        await _send_audio(websocket, state, audio)
    except SarvamError:
        pass

    telephony_session.set_call_state(state["call_sid"], CallState.interacting)
    telephony_session.set_agent_state(state["call_sid"], AgentState.listening)


def _public_http_base_url(websocket: WebSocket) -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL.rstrip("/")
    forwarded_proto = websocket.headers.get("x-forwarded-proto")
    scheme = "https" if forwarded_proto == "https" or websocket.url.scheme == "wss" else "http"
    host = websocket.headers.get("host", websocket.url.netloc)
    return f"{scheme}://{host}"


def _build_transfer_twiml(base_url: str, escalation_number: str, caller_id: str, summary: str) -> str:
    whisper_url = f"{base_url}/api/v1/telephony/whisper?{urlencode({'summary': summary})}"
    status_url = f"{base_url}/api/v1/telephony/dial-status"
    caller_id_attr = f' callerId="{escape(caller_id)}"' if caller_id else ""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response><Dial action="' + escape(status_url) + '" method="POST" timeout="20"' + caller_id_attr + ">"
        '<Number url="' + escape(whisper_url) + '">' + escape(escalation_number) + "</Number>"
        "</Dial></Response>"
    )


async def _start_warm_transfer(
    websocket: WebSocket,
    state: dict,
    hold_message: str,
    language_code: str,
    history: list[dict[str, str]],
) -> None:
    """Hold the caller, dial the company's escalation number with a synthesized
    briefing, and bridge the two lines (Phase 12)."""
    call_sid = state["call_sid"]
    company = state["company"]

    telephony_session.set_call_state(call_sid, CallState.escalating)
    telephony_session.set_agent_state(call_sid, AgentState.speaking)

    try:
        audio = await asyncio.to_thread(sarvam.synthesize, hold_message, language_code)
        await _send_audio(websocket, state, audio)
    except SarvamError:
        pass

    telephony_session.set_call_state(call_sid, CallState.holding)

    session = telephony_session.get_session(call_sid)
    escalation_number = _to_e164(company.escalation_numbers[0])
    caller_id = _to_e164(session.to_number) if session else ""
    summary = await asyncio.to_thread(summarize_for_handoff, company, history)

    try:
        twiml = _build_transfer_twiml(_public_http_base_url(websocket), escalation_number, caller_id, summary)
        await asyncio.to_thread(twilio_client.redirect_call, call_sid, twiml)
    except TwilioError:
        # No real Twilio REST credentials configured (or the API call
        # failed) -- apologize and keep the AI conversation going instead
        # of dropping the call.
        telephony_session.set_call_state(call_sid, CallState.interacting)
        telephony_session.set_agent_state(call_sid, AgentState.speaking)
        fallback = (
            "I'm sorry, I couldn't reach our team right now, but I'm happy "
            "to keep helping. What else can I do for you?"
        )
        telephony_session.add_turn(call_sid, TurnRole.agent, fallback)
        try:
            audio = await asyncio.to_thread(sarvam.synthesize, fallback, language_code)
            await _send_audio(websocket, state, audio)
        except SarvamError:
            pass
        telephony_session.set_agent_state(call_sid, AgentState.listening)
        return

    telephony_session.set_call_state(call_sid, CallState.bridging)
    state["transferred"] = True


async def _process_utterance(websocket: WebSocket, state: dict, utterance: bytes) -> None:
    call_sid = state["call_sid"]
    company = state["company"]
    company_id = state["company_id"]

    try:
        telephony_session.set_agent_state(call_sid, AgentState.thinking)

        wav_bytes = audio_codec.twilio_audio_to_wav16k(utterance)
        language_code = sarvam.language_code_for(company.primary_language.value)

        try:
            transcript = await asyncio.to_thread(sarvam.transcribe, wav_bytes, language_code)
        except SarvamError:
            transcript = ""

        if not transcript:
            telephony_session.set_agent_state(call_sid, AgentState.listening)
            return

        telephony_session.add_turn(call_sid, TurnRole.caller, transcript)

        session = telephony_session.get_session(call_sid)
        history = _build_history(session) if session else []
        turn_index = len(session.turns) - 1 if session else 0

        # Phase 26: Compute engagement score and adapt system prompt if needed.
        eng_score = engagement_tracker.score_utterance(transcript)
        telephony_session.add_engagement_score(call_sid, turn_index, eng_score)

        context_results = search(company_id, transcript, top_k=5)
        system_prompt = build_system_prompt(company, context_results) + _ESCALATION_INSTRUCTION

        rl_settings = action_selector.get_settings()
        if rl_settings.get("enable_engagement_adaptation"):
            adaptation = engagement_tracker.get_dynamic_instruction(eng_score)
            if adaptation:
                system_prompt += f"\n\n[LIVE ADAPTATION]: {adaptation}"

        if state.get("lead_name"):
            system_prompt += (
                f"\n\nYou placed this call. The person you're speaking with is "
                f"{state['lead_name']}"
            )
            if state.get("interest_tag"):
                system_prompt += f", who expressed interest in {state['interest_tag']}"
            system_prompt += ". Use their name naturally and stay focused on that topic unless they ask about something else."

        try:
            reply_text = await asyncio.to_thread(get_chat_reply, system_prompt, history)
        except LLMError:
            reply_text = FALLBACK_REPLY

        escalate = "[ESCALATE]" in reply_text
        reply_text = reply_text.replace("[ESCALATE]", "").strip()
        if _wants_escalation(transcript):
            escalate = True
        escalate = escalate and bool(company.escalation_numbers)

        # Phase 27: Guardrail check before TTS synthesis.
        if rl_settings.get("enable_guardrails"):
            reply_text, _ = guardrail.check_response(call_sid, reply_text)

        telephony_session.add_turn(call_sid, TurnRole.agent, reply_text)

        if escalate:
            hold_message = reply_text or "Connecting you to one of our team members now, please hold."
            await _start_warm_transfer(websocket, state, hold_message, language_code, history)
            return

        telephony_session.set_agent_state(call_sid, AgentState.speaking)

        try:
            reply_audio = await asyncio.to_thread(sarvam.synthesize, reply_text, language_code)
            await _send_audio(websocket, state, reply_audio)
        except SarvamError:
            pass

        telephony_session.set_call_state(call_sid, CallState.interacting)
        telephony_session.set_agent_state(call_sid, AgentState.listening)
    finally:
        state["processing"] = False


async def _handle_media(websocket: WebSocket, state: dict, media: dict) -> None:
    if state["company"] is None:
        return
    if media.get("track") not in (None, "inbound"):
        return

    chunk = base64.b64decode(media["payload"])
    state["buffer"].extend(chunk)
    telephony_session.append_audio(state["call_sid"], chunk)

    if audio_codec.rms(chunk) > SILENCE_RMS_THRESHOLD:
        state["speech_frames"] += 1
        state["silence_frames"] = 0
    else:
        state["silence_frames"] += 1

    if (
        not state["processing"]
        and state["speech_frames"] >= MIN_SPEECH_FRAMES
        and state["silence_frames"] >= SILENCE_FRAMES_TO_FINALIZE
    ):
        utterance = bytes(state["buffer"])
        state["buffer"].clear()
        state["speech_frames"] = 0
        state["silence_frames"] = 0
        state["processing"] = True
        asyncio.create_task(_process_utterance(websocket, state, utterance))
    elif state["speech_frames"] == 0 and len(state["buffer"]) > MAX_IDLE_BUFFER_BYTES:
        state["buffer"].clear()


@router.websocket("/media")
async def media_stream(websocket: WebSocket) -> None:
    await websocket.accept()

    state: dict = {
        "company": None,
        "company_id": "",
        "call_sid": "",
        "stream_sid": "",
        "lead_name": "",
        "interest_tag": "",
        "buffer": bytearray(),
        "speech_frames": 0,
        "silence_frames": 0,
        "processing": False,
        "transferred": False,
    }

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            event = message.get("event")

            if event == "start":
                await _handle_start(websocket, state, message.get("start", {}))
            elif event == "media":
                await _handle_media(websocket, state, message.get("media", {}))
            elif event == "stop":
                break
    except WebSocketDisconnect:
        pass
    finally:
        # If the call was redirected into a warm-transfer <Dial> (Phase 12),
        # the phone call itself is still in progress -- /dial-status will
        # finalize the session once the human leg ends.
        if state["call_sid"] and not state["transferred"]:
            telephony_session.end_session(state["call_sid"])
            asyncio.create_task(post_call_worker.process_completed_call(state["call_sid"]))


def _ensure_company_exists(company_id: str) -> CompanyProfile:
    company = _companies.get(company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


def _telephony_config(company: CompanyProfile, request: Request) -> TelephonyConfig:
    base_url = PUBLIC_BASE_URL or str(request.base_url).rstrip("/")
    return TelephonyConfig(
        company_id=company.id,
        inbound_phone_number=company.inbound_phone_number,
        voice_webhook_url=f"{base_url}/api/v1/telephony/voice",
        public_base_url=base_url,
    )


@router.get("/companies/{company_id}/config", response_model=TelephonyConfig)
def get_telephony_config(company_id: str, request: Request) -> TelephonyConfig:
    company = _ensure_company_exists(company_id)
    return _telephony_config(company, request)


@router.patch("/companies/{company_id}/config", response_model=TelephonyConfig)
def update_telephony_config(
    company_id: str, payload: TelephonyConfigUpdate, request: Request
) -> TelephonyConfig:
    company = _ensure_company_exists(company_id)
    company.inbound_phone_number = payload.inbound_phone_number.strip()
    company.updated_at = datetime.now(timezone.utc)
    return _telephony_config(company, request)


@router.get("/companies/{company_id}/calls", response_model=list[TelephonyCallSession])
def list_calls(company_id: str) -> list[TelephonyCallSession]:
    _ensure_company_exists(company_id)
    return telephony_session.list_sessions(company_id)
