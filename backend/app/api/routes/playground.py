import base64
import json

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.api.routes.companies import _companies
from app.models.playground import (
    PlaygroundChatRequest,
    PlaygroundChatResponse,
    PlaygroundMessage,
    PlaygroundRole,
    PlaygroundVoiceChatResponse,
)
from app.services import sarvam
from app.services.llm import LLMError, build_system_prompt, get_chat_reply
from app.services.sarvam import SarvamError
from app.services.vector_store import search

router = APIRouter(prefix="/companies/{company_id}/playground", tags=["playground"])


@router.post("/chat", response_model=PlaygroundChatResponse)
def chat(company_id: str, payload: PlaygroundChatRequest) -> PlaygroundChatResponse:
    company = _companies.get(company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    if not payload.messages or payload.messages[-1].role != PlaygroundRole.user:
        raise HTTPException(status_code=400, detail="The last message must be from the user.")

    latest_query = payload.messages[-1].content
    context_results = search(company_id, latest_query, top_k=5)

    system_prompt = build_system_prompt(company, context_results)
    messages = [{"role": m.role.value, "content": m.content} for m in payload.messages]

    try:
        reply_text = get_chat_reply(system_prompt, messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PlaygroundChatResponse(
        reply=PlaygroundMessage(role=PlaygroundRole.assistant, content=reply_text),
        used_chunks=context_results,
    )


@router.post("/voice", response_model=PlaygroundVoiceChatResponse)
async def voice_chat(
    company_id: str, audio: UploadFile, history: str = Form("[]")
) -> PlaygroundVoiceChatResponse:
    """Speech-in, speech-out turn: Sarvam STT -> RAG/LLM -> Sarvam TTS."""
    company = _companies.get(company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        prior_messages = [PlaygroundMessage(**m) for m in json.loads(history)]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid history payload.") from exc

    audio_bytes = await audio.read()
    language_code = sarvam.language_code_for(company.primary_language.value)

    try:
        transcript = sarvam.transcribe(audio_bytes, language_code)
    except SarvamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not transcript:
        raise HTTPException(status_code=422, detail="Could not transcribe any speech from the audio.")

    user_message = PlaygroundMessage(role=PlaygroundRole.user, content=transcript)
    full_messages = [*prior_messages, user_message]

    context_results = search(company_id, transcript, top_k=5)
    system_prompt = build_system_prompt(company, context_results)
    messages = [{"role": m.role.value, "content": m.content} for m in full_messages]

    try:
        reply_text = get_chat_reply(system_prompt, messages)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    try:
        reply_audio = sarvam.synthesize(reply_text, language_code)
    except SarvamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return PlaygroundVoiceChatResponse(
        transcript=transcript,
        reply=PlaygroundMessage(role=PlaygroundRole.assistant, content=reply_text),
        audio_base64=base64.b64encode(reply_audio).decode(),
        used_chunks=context_results,
    )
