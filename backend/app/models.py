from datetime import datetime

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="admin")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sessions = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    source = Column(String, nullable=False)  # unity | test
    scenario = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    briefing_completed = Column(Integer, nullable=True)
    persona_id = Column(String, nullable=False, default="elena")

    user = relationship("User", back_populates="sessions")
    events = relationship("RoleplayEvent", back_populates="session")
    summary = relationship(
        "SessionSummary", back_populates="session", uselist=False
    )


class RoleplayEvent(Base):
    __tablename__ = "roleplay_events"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    step_id = Column(Integer, nullable=True) # Now just an auto-incrementing counter, not strict steps
    question_id = Column(String, nullable=True)
    speaker = Column(String, nullable=False)  # client | salesperson
    transcript = Column(String, nullable=True)
    intent_category = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    reaction_time_ms = Column(Integer, nullable=True)
    features_json = Column(JSON, nullable=True)

    session = relationship("Session", back_populates="events")


class SessionSummary(Base):
    __tablename__ = "session_summaries"

    session_id = Column(String, ForeignKey("sessions.id"), primary_key=True)
    total_score = Column(Integer, nullable=True)
    avg_score = Column(Integer, nullable=True)
    accuracy_percentage = Column(Integer, nullable=True)
    ai_rating_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("Session", back_populates="summary")


class LogEntry(Base):
    __tablename__ = "logs"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    level = Column(String, nullable=False)
    message = Column(String, nullable=False)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SystemQuestion(Base):
    __tablename__ = "system_questions"

    id = Column(String, primary_key=True, index=True)
    text = Column(String, nullable=False)
    tags = Column(String, nullable=True) # comma-separated
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

