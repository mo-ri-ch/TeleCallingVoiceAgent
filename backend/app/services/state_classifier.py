"""Phase 22: MDP State Tracker.

Classifies each conversation turn into a ConversationPhase and estimates
customer sentiment, producing a turn-by-turn MDPState log that the reward
engine and dashboard can use.
"""

from __future__ import annotations

import re

from app.models.rl import ConversationPhase, MDPState
from app.models.telephony import TelephonyTurn, TurnRole

_DISCOVERY = re.compile(
    r"(currently|background|working|studying|experience|looking for|interested in)", re.I
)
_PITCH = re.compile(
    r"(course|program|curriculum|MERN|data.science|full.?stack|career|placement|batch)", re.I
)
_OBJECTION = re.compile(
    r"(expensive|busy|no time|discount|can.t|cannot|guarantee|certified|too much|later)", re.I
)
_CLOSING = re.compile(
    r"(enroll|book|register|demo|slot|appointment|Saturday|confirm|interested)", re.I
)

_POSITIVE = re.compile(r"(great|sure|yes|interested|sounds good|okay|perfect|absolutely|nice|wow)", re.I)
_NEGATIVE = re.compile(r"\b(no|not interested|busy|expensive|can.t|remove|never|bye|stop)\b", re.I)


def classify_turns(turns: list[TelephonyTurn]) -> list[MDPState]:
    states: list[MDPState] = []
    objection_count = 0
    last_phase = ConversationPhase.opening

    for idx, turn in enumerate(turns):
        text = turn.text

        if idx < 2:
            phase = ConversationPhase.opening
        elif _CLOSING.search(text):
            phase = ConversationPhase.closing
        elif _OBJECTION.search(text):
            phase = ConversationPhase.objections
            if turn.role == TurnRole.caller:
                objection_count += 1
        elif _PITCH.search(text):
            phase = ConversationPhase.pitch
        elif _DISCOVERY.search(text):
            phase = ConversationPhase.discovery
        else:
            phase = last_phase

        last_phase = phase

        has_positive = bool(_POSITIVE.search(text))
        has_negative = bool(_NEGATIVE.search(text))
        if has_positive and not has_negative:
            sentiment = "positive"
        elif has_negative:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        states.append(
            MDPState(
                turn_index=idx,
                phase=phase,
                customer_sentiment=sentiment,
                objections_raised=objection_count,
                duration_seconds=0.0,
            )
        )

    return states
