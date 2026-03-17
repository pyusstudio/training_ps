from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from beanie.operators import In

from ..models import RoleplayEvent, Session as DbSession, SessionSummary, User
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


class PaginatedSessions(BaseModel):
    items: List[SessionListItem]
    total: int
    page: int
    pageSize: int
    pages: int


class RoleplayEventItem(BaseModel):
    id: str
    step_id: int
    speaker: str
    transcript: str | None
    intent_category: str | None
    score: int | None
    reaction_time_ms: int | None
    features_json: dict | None


class SessionDetail(BaseModel):
    id: str
    source: str
    scenario: str | None
    persona_id: str
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


async def _require_admin(
    token: str = Depends(_get_bearer_token),
) -> User:
    user = await get_user_from_token(token)
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


@router.get("/sessions", response_model=PaginatedSessions)
async def list_sessions(
    page: int = 1,
    page_size: int = 20,
    _admin: User = Depends(_require_admin),
) -> PaginatedSessions:
    skip = (page - 1) * page_size
    query = DbSession.find_all().sort("-started_at")
    total = await query.count()
    sessions = await query.skip(skip).limit(page_size).to_list()

    items: List[SessionListItem] = []
    # Get summaries for these sessions
    session_ids = [s.id for s in sessions]
    summaries = await SessionSummary.find(In(SessionSummary.id, session_ids)).to_list()
    summary_map = {s.id: s for s in summaries}

    for s in sessions:
        summary = summary_map.get(s.id)
        items.append(
            SessionListItem(
                id=s.id,
                source=s.source,
                scenario=s.scenario,
                started_at=s.started_at.isoformat(),
                ended_at=s.ended_at.isoformat() if s.ended_at else None,
                duration_seconds=s.duration_seconds,
                avg_score=summary.avg_score if summary else None,
                accuracy_percentage=summary.accuracy_percentage if summary else None,
            )
        )
    
    pages = (total + page_size - 1) // page_size
    return PaginatedSessions(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        pages=pages
    )


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session_detail(
    session_id: str,
    _admin: User = Depends(_require_admin),
) -> SessionDetail:
    session = await DbSession.get(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    summary = await SessionSummary.get(session_id)
    events = await RoleplayEvent.find(
        RoleplayEvent.session_id == session_id
    ).sort("+step_id", "+created_at").to_list()

    return SessionDetail(
        id=session.id,
        source=session.source,
        scenario=session.scenario,
        persona_id=session.persona_id,
        started_at=session.started_at.isoformat(),
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        duration_seconds=session.duration_seconds,
        total_score=summary.total_score if summary else None,
        avg_score=summary.avg_score if summary else None,
        accuracy_percentage=summary.accuracy_percentage if summary else None,
        ai_rating_json=summary.ai_rating_json if summary else None,
        events=[
            RoleplayEventItem(
                id=e.id,
                step_id=e.step_id or 0,
                speaker=e.speaker,
                transcript=e.transcript,
                intent_category=e.intent_category,
                score=e.score,
                reaction_time_ms=e.reaction_time_ms,
                features_json=e.features_json,
            )
            for e in events
        ],
    )


@router.post("/sessions/{session_id}/rate", response_model=SessionDetail)
async def generate_session_rating(
    session_id: str,
    _admin: User = Depends(_require_admin),
) -> SessionDetail:
    from ..services.ai_service import ai_provider_instance
    import json
    
    events = await RoleplayEvent.find(
        RoleplayEvent.session_id == session_id
    ).sort("+step_id", "+created_at").to_list()
    
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

    summary = await SessionSummary.get(session_id)
    if summary is None:
        from ..services.session_service import build_summary
        summary = await build_summary(session_id)

    summary.ai_rating_json = rating.model_dump()
    await summary.save()

    return await get_session_detail(session_id, _admin)
