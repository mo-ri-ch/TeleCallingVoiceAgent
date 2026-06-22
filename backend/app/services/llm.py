"""Prompt routing engine: builds persona-constrained system prompts and
talks to the Claude API for the AI Agent Playground."""

import json

import anthropic

from app.core.config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from app.models.call_report import CallOutcome, CallSentiment
from app.models.company import CompanyProfile
from app.models.knowledge import KnowledgeSearchResult
from app.models.telephony import TelephonyTurn, TurnRole

FALLBACK_REPLY = "I'll have our counselor get back to you on that."

TONE_GUIDANCE = {
    "friendly": (
        "Be warm, upbeat, and conversational. Use simple, approachable "
        "language and a welcoming tone, like a helpful friend."
    ),
    "professional": (
        "Be polished, efficient, and businesslike. Keep responses clear, "
        "confident, and to the point."
    ),
    "formal": (
        "Be respectful, formal, and precise. Avoid slang or casual "
        "phrasing, and address the caller courteously."
    ),
}

LANGUAGE_LABELS = {
    "malayalam": "Malayalam",
    "hindi": "Hindi",
    "english": "English",
    "tamil": "Tamil",
    "kannada": "Kannada",
}


class LLMError(Exception):
    """Raised when the Claude API call cannot be completed."""


def build_system_prompt(
    company: CompanyProfile, context_results: list[KnowledgeSearchResult]
) -> str:
    tone_guidance = TONE_GUIDANCE.get(company.tone.value, TONE_GUIDANCE["professional"])
    language_label = LANGUAGE_LABELS.get(company.primary_language.value, "English")

    if context_results:
        context_block = "\n\n".join(
            f"[Source: {result.chunk.source_title}]\n{result.chunk.text}"
            for result in context_results
        )
    else:
        context_block = "(No relevant information was found in the knowledge base for this query.)"

    language_instruction = (
        f"Respond in whichever language the caller writes in; if unsure, default to {language_label} or English."
    )
    if company.primary_language.value == "malayalam":
        language_instruction += (
            " When responding in Malayalam, write naturally code-switched \"Manglish\": "
            "use Malayalam script for everyday words, but keep course names, technical "
            "terms, numbers, and proper nouns (e.g. \"MERN Stack\", \"React\", \"Bridgeon Skillversity\") "
            "in English/Latin script, exactly as a Kerala speaker would say them."
        )

    return f"""You are {company.agent_name}, an AI telecalling agent for {company.name}.

Tone of voice: {tone_guidance}

Primary language: {language_label}. {language_instruction}

STRICT RULES (never break these):
1. Answer ONLY using facts found in the "Knowledge base context" section below. Do not rely on outside knowledge, assumptions, or invented details (no made-up prices, courses, locations, branches, or policies).
2. If the answer to the caller's question is not contained in the knowledge base context, respond with exactly: "{FALLBACK_REPLY}" (translated naturally if the caller is writing in another language). Do not speculate, apologize at length, or explain why -- just give that response.
3. Keep replies concise (1-4 sentences), suitable for a phone conversation.
4. Stay in character as {company.agent_name} at all times.

Knowledge base context:
{context_block}"""


HANDOFF_FALLBACK = "A caller would like to speak with a member of the team."


def summarize_for_handoff(company: CompanyProfile, history: list[dict[str, str]]) -> str:
    """One-sentence spoken briefing for the human agent taking over a
    warm-transferred call (Phase 12)."""
    if not ANTHROPIC_API_KEY or not history:
        return HANDOFF_FALLBACK

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    transcript = "\n".join(
        f"{'Caller' if message['role'] == 'user' else 'Agent'}: {message['content']}"
        for message in history
    )

    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=60,
            system=(
                "You are briefing a human call-center agent who is about to take over "
                "a phone call from an AI assistant. In one short spoken sentence "
                "(under 20 words), summarize what the caller wants and what language "
                "they are speaking. Do not greet anyone -- output only the briefing "
                "sentence itself."
            ),
            messages=[{"role": "user", "content": transcript}],
        )
    except (anthropic.AuthenticationError, anthropic.APIStatusError):
        return HANDOFF_FALLBACK

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    return text or HANDOFF_FALLBACK


def get_chat_reply(system_prompt: str, messages: list[dict[str, str]]) -> str:
    if not ANTHROPIC_API_KEY:
        raise LLMError("ANTHROPIC_API_KEY is not configured on the server.")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
    except anthropic.AuthenticationError as exc:
        raise LLMError("The Anthropic API key was rejected.") from exc
    except anthropic.APIStatusError as exc:
        raise LLMError(f"Claude API error: {exc.message}") from exc

    return "".join(
        block.text for block in response.content if block.type == "text"
    ).strip()


REPORT_FALLBACK_SUMMARY = "Call completed. Summary unavailable."


def generate_call_report(
    company: CompanyProfile, turns: list[TelephonyTurn]
) -> tuple[str, CallSentiment, CallOutcome]:
    """Ask Claude for a 3-line summary, sentiment rating, and outcome status
    for a completed call (Phase 15)."""
    if not ANTHROPIC_API_KEY or not turns:
        return REPORT_FALLBACK_SUMMARY, CallSentiment.neutral, CallOutcome.callback

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    transcript = "\n".join(
        f"{'Caller' if turn.role == TurnRole.caller else 'Agent'}: {turn.text}"
        for turn in turns
    )

    try:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=300,
            system=(
                f"You are reviewing a phone call transcript between {company.agent_name}, "
                f"an AI telecalling agent for {company.name}, and a caller. Respond with "
                "ONLY a JSON object (no markdown fences, no extra text) with exactly "
                'these keys: "summary" (a concise 3-line summary of the call, with '
                'lines separated by "\\n"), "sentiment" (the caller\'s overall sentiment: '
                '"positive", "neutral", or "negative"), and "outcome" (the call outcome: '
                '"interested", "callback", "escalated", or "not_interested").'
            ),
            messages=[{"role": "user", "content": transcript}],
        )
    except (anthropic.AuthenticationError, anthropic.APIStatusError):
        return REPORT_FALLBACK_SUMMARY, CallSentiment.neutral, CallOutcome.callback

    text = "".join(block.text for block in response.content if block.type == "text").strip()

    try:
        data = json.loads(text)
        summary = str(data.get("summary", "")).strip() or REPORT_FALLBACK_SUMMARY
        sentiment = CallSentiment(data.get("sentiment", "neutral"))
        outcome = CallOutcome(data.get("outcome", "callback"))
    except (json.JSONDecodeError, ValueError, TypeError):
        return REPORT_FALLBACK_SUMMARY, CallSentiment.neutral, CallOutcome.callback

    return summary, sentiment, outcome
