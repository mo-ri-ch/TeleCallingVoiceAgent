"""Phases 24-25: Action Space, ε-Greedy Exploration, and Contextual Bandit Policy.

Maintains the action library (opening strategies, pitch angles, CTA variants),
the global RL settings (epsilon, decay), and per-context-segment policy weights
that are updated after each call outcome.
"""

from __future__ import annotations

import random

OPENING_STRATEGIES: dict[str, str] = {
    "warm_question": "Start with a friendly personal question about their career goals.",
    "direct_hook": "Lead immediately with a compelling placement statistic.",
    "problem_first": "Open by addressing a common pain point in their current career.",
    "local_connect": "Connect using a local language greeting and familiar local context.",
}

PITCH_ANGLES: dict[str, str] = {
    "placement": "Focus on job placement rates and top company partnerships.",
    "curriculum": "Emphasise the hands-on project-based curriculum.",
    "speed_roi": "Highlight the fast ROI — employed within 90 days.",
}

CTA_VARIANTS: dict[str, str] = {
    "book_counseling": "Book a free 30-minute career counseling session.",
    "branch_visit": "Invite them for a branch visit and live demo class.",
    "whatsapp_followup": "Get their WhatsApp and send the brochure instantly.",
}

# Mutable RL settings.
_settings: dict = {
    "epsilon": 0.3,
    "epsilon_min": 0.05,
    "epsilon_decay": 0.995,
    "opening_strategies": list(OPENING_STRATEGIES.keys()),
    "pitch_angles": list(PITCH_ANGLES.keys()),
    "cta_variants": list(CTA_VARIANTS.keys()),
    "enable_engagement_adaptation": True,
    "enable_guardrails": True,
}

# Per-context-segment learned policy weights.
_policy_weights: dict[str, dict] = {}


def get_settings() -> dict:
    return dict(_settings)


def update_settings(updates: dict) -> dict:
    allowed = set(_settings.keys())
    _settings.update({k: v for k, v in updates.items() if k in allowed})
    return dict(_settings)


def _context_key(context: dict) -> str:
    lang = context.get("language", "english")
    tod = context.get("time_of_day", "morning")
    src = context.get("lead_source", "outbound")
    return f"{lang}:{tod}:{src}"


def select_action(context: dict) -> dict:
    """ε-greedy action selection with per-segment policy exploitation."""
    eps = _settings["epsilon"]
    key = _context_key(context)
    weights = _policy_weights.get(key, {})

    if random.random() < eps:
        opening = random.choice(_settings["opening_strategies"])
        pitch = random.choice(_settings["pitch_angles"])
        cta = random.choice(_settings["cta_variants"])
        exploration = True
    else:
        opening = weights.get("best_opening", _settings["opening_strategies"][0])
        pitch = weights.get("best_pitch", _settings["pitch_angles"][0])
        cta = weights.get("best_cta", _settings["cta_variants"][0])
        exploration = False

    # Decay epsilon after each selection.
    _settings["epsilon"] = round(
        max(_settings["epsilon_min"], _settings["epsilon"] * _settings["epsilon_decay"]), 4
    )

    return {
        "opening_strategy": opening,
        "pitch_angle": pitch,
        "cta_variant": cta,
        "exploration": exploration,
        "context_key": key,
    }


def record_outcome(context_key: str, won: bool, opening: str, pitch: str, cta: str) -> None:
    """Update policy weights for the given context after a call outcome is known."""
    w = _policy_weights.setdefault(
        context_key,
        {
            "best_opening": opening,
            "best_pitch": pitch,
            "best_cta": cta,
            "sample_count": 0,
            "wins": 0,
            "win_rate": 0.0,
        },
    )
    w["sample_count"] += 1
    if won:
        w["wins"] = w.get("wins", 0) + 1
        w["best_opening"] = opening
        w["best_pitch"] = pitch
        w["best_cta"] = cta
    w["win_rate"] = round(w["wins"] / w["sample_count"], 3)


_SEED_MATRIX = [
    {
        "context_key": "english:morning:outbound",
        "language": "english",
        "time_of_day": "morning",
        "lead_source": "outbound",
        "best_opening": "direct_hook",
        "best_pitch": "placement",
        "best_cta": "book_counseling",
        "sample_count": 45,
        "win_rate": 0.68,
    },
    {
        "context_key": "malayalam:evening:outbound",
        "language": "malayalam",
        "time_of_day": "evening",
        "lead_source": "outbound",
        "best_opening": "local_connect",
        "best_pitch": "placement",
        "best_cta": "whatsapp_followup",
        "sample_count": 32,
        "win_rate": 0.59,
    },
    {
        "context_key": "english:morning:inbound",
        "language": "english",
        "time_of_day": "morning",
        "lead_source": "inbound",
        "best_opening": "warm_question",
        "best_pitch": "curriculum",
        "best_cta": "book_counseling",
        "sample_count": 28,
        "win_rate": 0.75,
    },
    {
        "context_key": "hindi:afternoon:outbound",
        "language": "hindi",
        "time_of_day": "afternoon",
        "lead_source": "outbound",
        "best_opening": "problem_first",
        "best_pitch": "speed_roi",
        "best_cta": "whatsapp_followup",
        "sample_count": 19,
        "win_rate": 0.52,
    },
]


def get_performance_matrix() -> list[dict]:
    live = [
        {
            "context_key": key,
            "language": key.split(":")[0],
            "time_of_day": key.split(":")[1] if ":" in key else "morning",
            "lead_source": key.split(":")[2] if key.count(":") >= 2 else "outbound",
            **w,
        }
        for key, w in _policy_weights.items()
    ]
    return live if live else _SEED_MATRIX
