from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import uuid4

class QuestionBase(BaseModel):
    text: str
    tags: Optional[str] = None
    is_active: int = 1

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    tags: Optional[str] = None
    is_active: Optional[int] = None

class QuestionRead(QuestionBase):
    id: str
    created_at: datetime


class PaginatedQuestions(BaseModel):
    items: List[QuestionRead]
    total: int
    page: int
    pageSize: int
    pages: int
