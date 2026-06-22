"""RL Engine routes (Phases 24-28): settings, policy versions, A/B tests,
performance matrix, and guardrail events."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.rl import ABTest, GuardrailEvent, PolicyVersion
from app.services import action_selector, guardrail

router = APIRouter(prefix="/rl", tags=["rl-engine"])

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

_policy_versions: dict[str, PolicyVersion] = {}
_policy_order: list[str] = []

_ab_tests: dict[str, ABTest] = {}
_ab_order: list[str] = []


def _seed() -> None:
    v1 = PolicyVersion(
        id="policy-v1",
        name="Baseline v1.0",
        description="Default policy: warm question opening, placement pitch, counseling CTA.",
        is_baseline=True,
        epsilon=0.3,
        opening_strategy="warm_question",
        pitch_angle="placement",
        cta_variant="book_counseling",
        created_at=datetime(2026, 6, 10, tzinfo=timezone.utc),
    )
    v2 = PolicyVersion(
        id="policy-v2",
        name="Candidate v1.1",
        description="Experimental: direct hook opening + WhatsApp CTA for outbound evening calls.",
        is_baseline=False,
        epsilon=0.2,
        opening_strategy="direct_hook",
        pitch_angle="placement",
        cta_variant="whatsapp_followup",
        created_at=datetime(2026, 6, 13, tzinfo=timezone.utc),
    )
    for v in [v1, v2]:
        _policy_versions[v.id] = v
        _policy_order.append(v.id)

    ab = ABTest(
        id="ab-test-1",
        name="Morning Outbound: Baseline vs Candidate v1.1",
        campaign_id="",
        policy_a_id="policy-v1",
        policy_b_id="policy-v2",
        split_ratio=0.2,
        is_active=True,
        calls_a=38,
        calls_b=10,
        conversions_a=24,
        conversions_b=7,
        created_at=datetime(2026, 6, 14, tzinfo=timezone.utc),
    )
    _ab_tests[ab.id] = ab
    _ab_order.append(ab.id)


_seed()


# ---------------------------------------------------------------------------
# RL Settings (Phase 24)
# ---------------------------------------------------------------------------

@router.get("/settings")
def get_rl_settings() -> dict:
    return action_selector.get_settings()


@router.patch("/settings")
def update_rl_settings(body: dict) -> dict:
    return action_selector.update_settings(body)


# ---------------------------------------------------------------------------
# Action selection (Phase 24)
# ---------------------------------------------------------------------------

@router.post("/select-action")
def select_action(body: dict) -> dict:
    """Select the next action for a given context (for testing / simulation)."""
    context = {
        "language": body.get("language", "english"),
        "time_of_day": body.get("time_of_day", "morning"),
        "lead_source": body.get("lead_source", "outbound"),
    }
    return action_selector.select_action(context)


# ---------------------------------------------------------------------------
# Performance Matrix (Phase 25)
# ---------------------------------------------------------------------------

@router.get("/performance-matrix")
def get_performance_matrix() -> list[dict]:
    return action_selector.get_performance_matrix()


# ---------------------------------------------------------------------------
# Policy Versions (Phase 28)
# ---------------------------------------------------------------------------

@router.get("/policy-versions", response_model=list[PolicyVersion])
def list_policy_versions() -> list[PolicyVersion]:
    return [_policy_versions[pid] for pid in _policy_order if pid in _policy_versions]


@router.post("/policy-versions", response_model=PolicyVersion, status_code=201)
def create_policy_version(body: dict) -> PolicyVersion:
    name = str(body.get("name", "")).strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    v = PolicyVersion(
        id=str(uuid4()),
        name=name,
        description=str(body.get("description", "")),
        is_baseline=bool(body.get("is_baseline", False)),
        epsilon=float(body.get("epsilon", 0.3)),
        opening_strategy=str(body.get("opening_strategy", "warm_question")),
        pitch_angle=str(body.get("pitch_angle", "placement")),
        cta_variant=str(body.get("cta_variant", "book_counseling")),
        created_at=datetime.now(timezone.utc),
    )
    _policy_versions[v.id] = v
    _policy_order.insert(0, v.id)
    return v


# ---------------------------------------------------------------------------
# A/B Tests (Phase 28)
# ---------------------------------------------------------------------------

@router.get("/ab-tests", response_model=list[ABTest])
def list_ab_tests() -> list[ABTest]:
    return [_ab_tests[tid] for tid in _ab_order if tid in _ab_tests]


@router.post("/ab-tests", response_model=ABTest, status_code=201)
def create_ab_test(body: dict) -> ABTest:
    name = str(body.get("name", "")).strip()
    policy_a = str(body.get("policy_a_id", "")).strip()
    policy_b = str(body.get("policy_b_id", "")).strip()
    if not name or not policy_a or not policy_b:
        raise HTTPException(status_code=422, detail="name, policy_a_id, policy_b_id are required")
    if policy_a not in _policy_versions or policy_b not in _policy_versions:
        raise HTTPException(status_code=404, detail="Policy version not found")
    ab = ABTest(
        id=str(uuid4()),
        name=name,
        campaign_id=str(body.get("campaign_id", "")),
        policy_a_id=policy_a,
        policy_b_id=policy_b,
        split_ratio=float(body.get("split_ratio", 0.2)),
        is_active=True,
        calls_a=0,
        calls_b=0,
        conversions_a=0,
        conversions_b=0,
        created_at=datetime.now(timezone.utc),
    )
    _ab_tests[ab.id] = ab
    _ab_order.insert(0, ab.id)
    return ab


@router.patch("/ab-tests/{test_id}/status", response_model=ABTest)
def update_ab_test_status(test_id: str, body: dict) -> ABTest:
    ab = _ab_tests.get(test_id)
    if ab is None:
        raise HTTPException(status_code=404, detail="A/B test not found")
    if "is_active" in body:
        ab.is_active = bool(body["is_active"])
    # Simulate a call being recorded for demonstration.
    if body.get("simulate_call"):
        import random  # noqa: PLC0415
        won = random.random() < 0.6
        if random.random() < ab.split_ratio:
            ab.calls_b += 1
            if won:
                ab.conversions_b += 1
        else:
            ab.calls_a += 1
            if won:
                ab.conversions_a += 1
    return ab


# ---------------------------------------------------------------------------
# Guardrail Events (Phase 27)
# ---------------------------------------------------------------------------

@router.get("/guardrail-events", response_model=list[GuardrailEvent])
def list_guardrail_events(limit: int = 50) -> list[GuardrailEvent]:
    return guardrail.get_events(limit)
