from datetime import datetime
from typing import List, Optional, Dict, Any

from beanie import Document, Indexed
from pydantic import Field


class User(Document):
    id: str = Field(default_factory=str, alias="_id")  # Using string ID for compatibility
    email: Indexed(str, unique=True)
    password_hash: str
    role: str = "admin"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"


class Session(Document):
    id: str = Field(default_factory=str, alias="_id")
    user_id: Optional[str] = None
    source: str  # unity | test
    scenario: Optional[str] = "default_scenario"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    briefing_completed: Optional[int] = None
    persona_id: str = "elena"

    class Settings:
        name = "sessions"


class RoleplayEvent(Document):
    id: str = Field(default_factory=str, alias="_id")
    session_id: Indexed(str)
    step_id: Optional[int] = None
    question_id: Optional[str] = None
    speaker: str  # client | salesperson
    transcript: Optional[str] = None
    intent_category: Optional[str] = None
    score: Optional[int] = None
    reaction_time_ms: Optional[int] = None
    features_json: Optional[Dict[str, Any]] = None

    class Settings:
        name = "roleplay_events"


class SessionSummary(Document):
    id: str = Field(default_factory=str, alias="_id")  # This is the session_id
    total_score: Optional[int] = None
    avg_score: Optional[int] = None
    accuracy_percentage: Optional[int] = None
    ai_rating_json: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "session_summaries"


class LogEntry(Document):
    id: str = Field(default_factory=str, alias="_id")
    session_id: Optional[str] = None
    level: str
    message: str
    payload_json: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "logs"


class SystemQuestion(Document):
    id: str = Field(default_factory=str, alias="_id")
    text: str
    tags: Optional[str] = None  # comma-separated
    is_active: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "system_questions"
