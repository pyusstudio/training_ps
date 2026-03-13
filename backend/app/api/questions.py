from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import uuid4

from ..db import get_db_session
from ..models import SystemQuestion
from .question_schemas import QuestionCreate, QuestionUpdate, QuestionRead
from ..services.rag_service import rag_service

router = APIRouter(prefix="/api/admin/questions", tags=["admin-questions"])

@router.get("/", response_model=List[QuestionRead])
def list_questions(db: Session = Depends(get_db_session)):
    return db.query(SystemQuestion).all()

@router.post("/", response_model=QuestionRead)
async def create_question(question: QuestionCreate, db: Session = Depends(get_db_session)):
    db_question = SystemQuestion(
        id=str(uuid4()),
        text=question.text,
        tags=question.tags,
        is_active=question.is_active
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return db_question

@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(question_id: str, updates: QuestionUpdate, db: Session = Depends(get_db_session)):
    db_question = db.query(SystemQuestion).filter(SystemQuestion.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_question, key, value)
    
    db.commit()
    db.refresh(db_question)
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return db_question

@router.delete("/{question_id}")
async def delete_question(question_id: str, db: Session = Depends(get_db_session)):
    db_question = db.query(SystemQuestion).filter(SystemQuestion.id == question_id).first()
    if not db_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(db_question)
    db.commit()
    
    # Trigger RAG rebuild
    await rag_service.rebuild_index()
    
    return {"status": "deleted"}
