from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db_session
from ..models import RoleplayEvent, Session as DbSession, SessionSummary
from ..services.auth_service import get_user_from_token


router = APIRouter(prefix="/api/admin", tags=["admin"])


class SessionListItem(BaseModel):
    id: str
    source: str
    scenario: str | None
    started_at: str
    ended_at: str | None
    duration_seconds: int | None
    avg_score: int | None
    accuracy_percentage: int | None


class RoleplayEventItem(BaseModel):
    step_id: int
    speaker: str
    transcript: str | None
    intent_category: str | None
    score: int | None
    reaction_time_ms: int | None


class SessionDetail(BaseModel):
    id: str
    source: str
    scenario: str | None
    started_at: str
    ended_at: str | None
    duration_seconds: int | None
    total_score: int | None
    avg_score: int | None
    accuracy_percentage: int | None
    ai_rating_json: dict | None
    events: List[RoleplayEventItem]


def _get_bearer_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header.",
        )
    return authorization.removeprefix("Bearer ").strip()


def _require_admin(
    db: Session = Depends(get_db_session),
    token: str = Depends(_get_bearer_token),
):
    user = get_user_from_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user


@router.get("/sessions", response_model=List[SessionListItem])
def list_sessions(
    db: Session = Depends(get_db_session),
    _admin=Depends(_require_admin),
) -> List[SessionListItem]:
    rows = (
        db.query(DbSession)
        .outerjoin(SessionSummary, SessionSummary.session_id == DbSession.id)
        .order_by(DbSession.started_at.desc())
        .all()
    )

    result: List[SessionListItem] = []
    for session in rows:
        summary = session.summary
        result.append(
            SessionListItem(
                id=session.id,
                source=session.source,
                scenario=session.scenario,
                started_at=session.started_at.isoformat(),
                ended_at=session.ended_at.isoformat() if session.ended_at else None,
                duration_seconds=session.duration_seconds,
                avg_score=summary.avg_score if summary else None,
                accuracy_percentage=summary.accuracy_percentage if summary else None,
            )
        )
    return result


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db_session),
    _admin=Depends(_require_admin),
) -> SessionDetail:
    session: DbSession | None = db.get(DbSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    summary: SessionSummary | None = db.get(SessionSummary, session_id)
    events: List[RoleplayEvent] = (
        db.query(RoleplayEvent)
        .filter(RoleplayEvent.session_id == session_id)
        .order_by(RoleplayEvent.step_id.asc(), RoleplayEvent.id.asc())
        .all()
    )

    return SessionDetail(
        id=session.id,
        source=session.source,
        scenario=session.scenario,
        started_at=session.started_at.isoformat(),
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        duration_seconds=session.duration_seconds,
        total_score=summary.total_score if summary else None,
        avg_score=summary.avg_score if summary else None,
        accuracy_percentage=summary.accuracy_percentage if summary else None,
        ai_rating_json=summary.ai_rating_json if summary else None,
        events=[
            RoleplayEventItem(
                step_id=e.step_id,
                speaker=e.speaker,
                transcript=e.transcript,
                intent_category=e.intent_category,
                score=e.score,
                reaction_time_ms=e.reaction_time_ms,
            )
            for e in events
        ],
    )


@router.post("/sessions/{session_id}/rate", response_model=SessionDetail)
async def generate_session_rating(
    session_id: str,
    db: Session = Depends(get_db_session),
    _admin=Depends(_require_admin),
) -> SessionDetail:
    from ..services.ai_service import ai_provider_instance
    import json
    
    events: List[RoleplayEvent] = (
        db.query(RoleplayEvent)
        .filter(RoleplayEvent.session_id == session_id)
        .order_by(RoleplayEvent.step_id.asc(), RoleplayEvent.id.asc())
        .all()
    )
    if not events:
        raise HTTPException(status_code=400, detail="No transcript events found to rate.")

    # Build the transcript log format that the AI rating expects
    transcript_logs = []
    for e in events:
        transcript_logs.append({
            "role": "user" if e.speaker == "client" else "assistant",
            "content": e.transcript or ""
        })
    
    transcript_str = json.dumps(transcript_logs)
    rating = await ai_provider_instance.rate_session(session_id, transcript_str=transcript_str)

    summary: SessionSummary | None = db.get(SessionSummary, session_id)
    if summary is None:
        from ..services.session_service import _build_summary
        summary = _build_summary(db, session_id)

    summary.ai_rating_json = rating.model_dump()
    db.commit()

    # Re-fetch for return
    return get_session_detail(session_id, db, _admin)
