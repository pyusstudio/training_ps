from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional, Tuple
from uuid import uuid4

from loguru import logger
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import RoleplayEvent, Session as DbSession, SessionSummary
from ..schemas import (
    ClientUtteranceMessage,
    ScoreEventMessage,
    SessionStartedMessage,
    SessionSummaryMessage,
    SessionRatingMessage,
)
from .scoring import scoring_service
from .ai_service import ai_provider_instance, SessionRating
from ..config import get_settings

_SETTINGS = get_settings()


# AI handles conversation, so no hardcoded steps


_SESSION_LOCKS: Dict[str, asyncio.Lock] = {}
_SESSION_LOCKS_LOCK = asyncio.Lock()


async def _get_session_lock(session_id: str) -> asyncio.Lock:
    async with _SESSION_LOCKS_LOCK:
        if session_id not in _SESSION_LOCKS:
            _SESSION_LOCKS[session_id] = asyncio.Lock()
        return _SESSION_LOCKS[session_id]

async def cleanup_session_lock(session_id: str) -> None:
    async with _SESSION_LOCKS_LOCK:
        _SESSION_LOCKS.pop(session_id, None)
    ai_provider_instance.cleanup_session(session_id)


def _create_db_session(
    db: Session, source: str, user_id: Optional[str], scenario: Optional[str], first_text: str
) -> DbSession:
    session_id = str(uuid4())
    db_session = DbSession(
        id=session_id,
        user_id=user_id,
        source=source,
        scenario=scenario or "default_scenario",
        started_at=datetime.utcnow(),
    )
    db.add(db_session)
    db.flush()

    first_event = RoleplayEvent(
        id=str(uuid4()),
        session_id=session_id,
        step_id=1,
        question_id="greeting",
        speaker="client",
        transcript=first_text,
    )
    db.add(first_event)

    return db_session


async def start_session(
    source: str, user_id: Optional[str], scenario: Optional[str]
) -> Tuple[SessionStartedMessage, ClientUtteranceMessage]:
    # Use AI to generate opening line
    first_text = await ai_provider_instance.start_conversation("temp_id", scenario)
    
    with get_db() as db:
        db_session = _create_db_session(db, source=source, user_id=user_id, scenario=scenario, first_text=first_text)
        session_id = db_session.id
        logger.info("Started session {}", session_id)
        
        # Move history to actual session ID
        ai_provider_instance.history[session_id] = ai_provider_instance.history.pop("temp_id")

    started = SessionStartedMessage(
        type="session_started",
        direction="sc",
        session_id=session_id,
        user_id=user_id,
    )

    utterance = ClientUtteranceMessage(
        type="client_utterance",
        direction="sc",
        session_id=session_id,
        text=first_text,
        time_remaining_seconds=_SETTINGS.session_time_limit_seconds,
    )

    return started, utterance


async def handle_salesperson_response(
    session_id: str,
    transcript: str,
    reaction_time_ms: Optional[int],
) -> Tuple[ScoreEventMessage, Optional[ClientUtteranceMessage], Optional[SessionSummaryMessage], Optional[SessionRatingMessage]]:
    logger.info("Processing salesperson response | session_id={} | transcript_len={}", session_id, len(transcript))
    lock = await _get_session_lock(session_id)
    async with lock:
        with get_db() as db:
            db_session = db.get(DbSession, session_id)
            if db_session is None:
                raise ValueError(f"Session {session_id} not found")

            last_step_id = _get_last_step_id(db, session_id)
            salesperson_step_id = last_step_id + 1

            # 1. Score salesperson response
            score = await scoring_service.score(session_id, transcript)

            event = RoleplayEvent(
                id=str(uuid4()),
                session_id=session_id,
                step_id=salesperson_step_id,
                question_id=f"step_{salesperson_step_id}",
                speaker="salesperson",
                transcript=transcript,
                intent_category=score.intent_category,
                score=score.score,
                reaction_time_ms=reaction_time_ms,
                features_json={
                    "sentiment": score.sentiment,
                    "color_hex": score.color_hex,
                    "empathy_score": score.empathy_score,
                    "detail_score": score.detail_score,
                    "tone_alignment_score": score.tone_alignment_score,
                },
            )
            db.add(event)

            score_msg = ScoreEventMessage(
                type="score_event",
                direction="sc",
                session_id=session_id,
                question_id=event.question_id,
                intent_category=score.intent_category,
                score=score.score,
                sentiment=score.sentiment,
                feedback=score.feedback,
                keywords_detected=score.keywords_detected,
                color_hex=score.color_hex,
                empathy_score=score.empathy_score,
                detail_score=score.detail_score,
                tone_alignment_score=score.tone_alignment_score,
            )

            # 2. Check time limit
            now = datetime.utcnow()
            elapsed_seconds = int((now - db_session.started_at).total_seconds())
            remaining = max(0, _SETTINGS.session_time_limit_seconds - elapsed_seconds)

            next_client_msg: Optional[ClientUtteranceMessage] = None
            summary_msg: Optional[SessionSummaryMessage] = None
            rating_msg: Optional[SessionRatingMessage] = None

            if remaining > 0:
                # 3. Get AI client response
                client_msg_count = db.query(RoleplayEvent).filter(
                    RoleplayEvent.session_id == session_id,
                    RoleplayEvent.speaker == "client"
                ).count()
                
                # Limit is 4 questions + 1 greeting = 5 messages total before wrap-up
                is_final = client_msg_count >= 5
                
                client_text = await ai_provider_instance.reply(session_id, transcript, is_final=is_final)
                logger.info("AI client reply generated | session_id={} | is_final={} | text={}", session_id, is_final, (client_text[:50] + "...") if len(client_text) > 50 else client_text)
                client_step_id = salesperson_step_id + 1

                client_event = RoleplayEvent(
                    id=str(uuid4()),
                    session_id=session_id,
                    step_id=client_step_id,
                    question_id=f"step_{client_step_id}",
                    speaker="client",
                    transcript=client_text,
                )
                db.add(client_event)
                next_client_msg = ClientUtteranceMessage(
                    type="client_utterance",
                    direction="sc",
                    session_id=session_id,
                    text=client_text,
                    time_remaining_seconds=remaining,
                )
                
                if is_final:
                    # Reuse *this* db session to avoid double-commit
                    summary_msg = _finalize_and_summarize(db, session_id)
            else:
                # 4. Session time is up -> reuse this db session
                summary_msg = _finalize_and_summarize(db, session_id)

        return score_msg, next_client_msg, summary_msg, rating_msg


def _finalize_and_summarize(db, session_id: str) -> SessionSummaryMessage:
    """Finalize + summarize using an existing db session (no new context)."""
    db_session = db.get(DbSession, session_id)
    if not db_session:
        raise ValueError(f"Session {session_id} not found")
    _finalize_session(db, db_session)
    summary = _build_summary(db, session_id)
    logger.info("Session finalized | session_id={} | total_score={} | avg_score={}", session_id, summary.total_score, summary.avg_score)
    # Caller's get_db() context will commit
    return SessionSummaryMessage(
        type="session_summary",
        direction="sc",
        session_id=session_id,
        total_score=summary.total_score,
        avg_score=summary.avg_score,
        accuracy_percentage=summary.accuracy_percentage,
    )


def finalize_session(session_id: str) -> SessionSummaryMessage:
    """Standalone finalize — opens its own db context. Use from websocket handlers."""
    with get_db() as db:
        return _finalize_and_summarize(db, session_id)


async def generate_qualitative_rating(session_id: str) -> SessionRatingMessage:
    """Generate the AI qualitative rating and update the database."""
    # This can be slow, especially with Ollama
    rating = await ai_provider_instance.rate_session(session_id)
    
    with get_db() as db:
        summary = db.get(SessionSummary, session_id)
        if summary:
            summary.ai_rating_json = rating.model_dump()
            db.add(summary)
            db.commit()
            
    return SessionRatingMessage(
        type="session_rating",
        direction="sc",
        session_id=session_id,
        overall_score=rating.overall_score,
        strengths=rating.strengths,
        improvements=rating.improvements,
        detailed_feedback=rating.detailed_feedback,
    )


def _get_last_step_id(db: Session, session_id: str) -> int:
    last = (
        db.query(RoleplayEvent)
        .filter(RoleplayEvent.session_id == session_id)
        .order_by(RoleplayEvent.step_id.desc())
        .first()
    )
    return last.step_id if last is not None and last.step_id is not None else 1


def _finalize_session(db: Session, db_session: DbSession) -> None:
    if db_session.ended_at is not None:
        return
    now = datetime.utcnow()
    db_session.ended_at = now
    db_session.duration_seconds = int(
        (now - db_session.started_at).total_seconds()
    )


def _build_summary(db: Session, session_id: str) -> SessionSummary:
    existing = db.get(SessionSummary, session_id)
    if existing is not None:
        return existing

    events = (
        db.query(RoleplayEvent)
        .filter(RoleplayEvent.session_id == session_id, RoleplayEvent.score.isnot(None))
        .all()
    )
    if not events:
        summary = SessionSummary(
            session_id=session_id,
            total_score=0,
            avg_score=0,
            accuracy_percentage=0,
            created_at=datetime.utcnow(),
        )
        db.add(summary)
        return summary

    total_score = sum(e.score or 0 for e in events)
    count = len(events)
    avg_score = int(total_score / count)
    # For PoC, treat scores >= 70 as \"correct\"
    correct = sum(1 for e in events if (e.score or 0) >= 70)
    accuracy = int((correct / count) * 100)

    summary = SessionSummary(
        session_id=session_id,
        total_score=total_score,
        avg_score=avg_score,
        accuracy_percentage=accuracy,
        created_at=datetime.utcnow(),
    )
    db.add(summary)
    return summary

