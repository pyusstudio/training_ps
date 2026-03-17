from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4

from .admin import _require_admin
from ..models import SystemQuestion, User
from .question_schemas import QuestionCreate, QuestionUpdate, QuestionRead, PaginatedQuestions
from ..services.rag_service import rag_service

router = APIRouter(prefix="/api/admin/questions", tags=["admin-questions"])

@router.get("/", response_model=PaginatedQuestions)
async def list_questions(
    page: int = 1,
    page_size: int = 10,
    _admin: User = Depends(_require_admin)
):
    skip = (page - 1) * page_size
    query = SystemQuestion.find_all().sort("-created_at")
    total = await query.count()
    items = await query.skip(skip).limit(page_size).to_list()
    
    pages = (total + page_size - 1) // page_size
    return PaginatedQuestions(
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        pages=pages
    )

@router.post("/", response_model=QuestionRead)
async def create_question(
    question: QuestionCreate, 
    _admin: User = Depends(_require_admin)
):
    db_question = SystemQuestion(
        id=str(uuid4()),
        text=question.text,
        tags=question.tags,
        is_active=question.is_active
    )
    await db_question.insert()
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return db_question

@router.put("/{question_id}", response_model=QuestionRead)
async def update_question_full(
    question_id: str, 
    question: QuestionCreate, 
    _admin: User = Depends(_require_admin)
):
    db_question = await SystemQuestion.get(question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db_question.text = question.text
    db_question.tags = question.tags
    db_question.is_active = question.is_active
    
    await db_question.save()
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return db_question

@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question_partial(
    question_id: str, 
    updates: QuestionUpdate, 
    _admin: User = Depends(_require_admin)
):
    db_question = await SystemQuestion.get(question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_question, key, value)
    
    await db_question.save()
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return db_question

@router.delete("/{question_id}")
async def delete_question(
    question_id: str, 
    _admin: User = Depends(_require_admin)
):
    db_question = await SystemQuestion.get(question_id)
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    await db_question.delete()
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return {"status": "deleted"}
