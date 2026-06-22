"""Phase 23: Composite Reward Engine & Temporal Difference Credit Assignment.

Calculates a scalar reward for a completed call using outcome rewards,
per-turn micro-rewards, and efficiency penalties, then propagates the final
reward back through turns via a TD(λ)-style discount.
"""

from __future__ import annotations

from app.models.call_report import CallOutcome
from app.models.rl import MDPState, RewardBreakdown, TurnReward
from app.models.telephony import TelephonyTurn, TurnRole

_OUTCOME_REWARDS: dict[CallOutcome, float] = {
    CallOutcome.interested: 0.7,
    CallOutcome.callback: 0.2,
    CallOutcome.escalated: -0.1,
    CallOutcome.not_interested: -0.5,
}

_TD_DISCOUNT = 0.9


def calculate_reward(
    outcome: CallOutcome,
    turns: list[TelephonyTurn],
    duration_seconds: float,
    mdp_states: list[MDPState],
) -> RewardBreakdown:
    outcome_reward = _OUTCOME_REWARDS.get(outcome, 0.0)

    micro = 0.0
    turn_rewards: list[TurnReward] = []

    for idx, turn in enumerate(turns):
        tr = 0.0
        if turn.role == TurnRole.agent:
            if "?" in turn.text:
                tr += 0.08  # asking questions shows engagement
            if len(turn.text) > 250:
                tr -= 0.04  # overly long responses penalised
        else:
            if len(turn.text) > 60:
                tr += 0.05  # verbose customer = engaged customer
            elif len(turn.text) < 10:
                tr -= 0.03  # one-word answer = disengagement
        micro += tr
        turn_rewards.append(TurnReward(turn_index=idx, base_reward=round(tr, 3), td_credit=0.0))

    # Efficiency penalty: calls exceeding 6 minutes suggest poor handling.
    efficiency = -0.1 if duration_seconds > 360 else 0.0

    total = round(outcome_reward + micro + efficiency, 3)

    # Propagate the final reward backward through turns (TD credit assignment).
    credit = total
    for tr in reversed(turn_rewards):
        tr.td_credit = round(credit, 3)
        credit *= _TD_DISCOUNT

    return RewardBreakdown(
        outcome_reward=round(outcome_reward, 3),
        micro_rewards=round(micro, 3),
        efficiency_penalty=round(efficiency, 3),
        total=total,
        turn_rewards=turn_rewards,
    )
