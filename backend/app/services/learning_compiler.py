"""Phase 21: Conversational Learning Integration Loop.

Compiles mined Power / Drop phrases and the Objection Playbook into a
structured diff that can be appended to the LLM system prompt. The admin
reviews the diff and clicks "Approve" to make it live.
"""

from __future__ import annotations

_applied_update: str = ""


def compile_prompt_update(
    power_phrases: list[str],
    drop_phrases: list[str],
    objections: list,
) -> dict:
    """Return a diff dict showing what will be injected into the system prompt."""
    sections: list[str] = []

    if power_phrases:
        lines = "\n".join(f"  - {p}" for p in power_phrases)
        sections.append(f"POWER PHRASES (use these to increase conversions):\n{lines}")

    if drop_phrases:
        lines = "\n".join(f"  - {p}" for p in drop_phrases)
        sections.append(f"AVOID THESE PHRASES (associated with drop-offs):\n{lines}")

    if objections:
        obj_lines = "\n".join(
            f"  [{o.category.value.upper()}] \"{o.objection_text}\" → {o.best_response}"
            for o in objections[:6]
        )
        sections.append(f"OBJECTION HANDLING PLAYBOOK:\n{obj_lines}")

    diff_text = "\n\n".join(sections) if sections else "No learning data available yet — upload recordings and generate transcripts first."

    return {
        "diff": diff_text,
        "power_phrase_count": len(power_phrases),
        "drop_phrase_count": len(drop_phrases),
        "objection_count": len(objections),
        "is_applied": _applied_update == diff_text and bool(diff_text),
    }


def apply_update(diff_text: str) -> None:
    """Mark the compiled diff as approved and inject it into future prompts."""
    global _applied_update
    _applied_update = diff_text


def get_applied_update() -> str:
    return _applied_update
