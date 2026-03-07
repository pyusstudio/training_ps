from datetime import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


Direction = Literal["cs", "sc"]


class BaseMessage(BaseModel):
    type: str
    direction: Direction
    session_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SessionStartMessage(BaseMessage):
    type: Literal["session_start"]
    user_id: Optional[str] = None
    source: Literal["unity", "app"] = "unity"
    scenario: Optional[str] = None


class RoleplayEventMessage(BaseMessage):
    type: Literal["roleplay_event"]
    user_id: Optional[str] = None
    question_id: Optional[str] = None
    transcript: Optional[str] = None
    reaction_time_ms: Optional[int] = None
    stt_confidence: Optional[float] = None
    audio_fallback: Optional[str] = None  # base64 or URL; handled later


class SessionEndMessage(BaseMessage):
    type: Literal["session_end"]


class EvaluationQueryMessage(BaseMessage):
    type: Literal["evaluation_query"]
    transcript: str


class ErrorMessage(BaseMessage):
    type: Literal["error"]
    detail: str
    code: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class ScoreEventMessage(BaseMessage):
    type: Literal["score_event"]
    question_id: Optional[str] = None
    intent_category: Optional[str] = None
    score: Optional[int] = None
    sentiment: Optional[str] = None
    feedback: Optional[str] = None
    keywords_detected: Optional[list[str]] = None
    color_hex: Optional[str] = None


class SessionStartedMessage(BaseMessage):
    type: Literal["session_started"]
    user_id: Optional[str] = None


class ClientUtteranceMessage(BaseMessage):
    type: Literal["client_utterance"]
    text: str
    time_remaining_seconds: Optional[int] = None


class SessionRatingMessage(BaseMessage):
    type: Literal["session_rating"]
    overall_score: int
    strengths: list[str]
    improvements: list[str]
    detailed_feedback: str


class SessionSummaryMessage(BaseMessage):
    type: Literal["session_summary"]
    total_score: Optional[int] = None
    avg_score: Optional[int] = None
    accuracy_percentage: Optional[int] = None


class BroadcastEventMessage(BaseMessage):
    type: Literal["broadcast_event"]
    payload: Dict[str, Any]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

