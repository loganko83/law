from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class RiskLevelEnum(str, Enum):
    SAFE = "safe"
    CAUTION = "caution"
    WARNING = "warning"
    DANGER = "danger"


class AnalysisStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyzeRequest(BaseModel):
    contract_id: UUID
    document_id: Optional[UUID] = None
    analysis_type: str = "full"  # full, quick, clauses_only


class ClauseResponse(BaseModel):
    id: UUID
    clause_number: Optional[str] = None
    clause_title: Optional[str] = None
    clause_text: str
    risk_level: RiskLevelEnum
    explanation: str
    suggestion: Optional[str] = None
    negotiation_script: Optional[str] = None

    class Config:
        from_attributes = True


class QuestionResponse(BaseModel):
    id: UUID
    question: str
    context: Optional[str] = None
    priority: int

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: UUID
    contract_id: UUID
    safety_score: Optional[int] = None
    summary: Optional[str] = None
    status: AnalysisStatusEnum
    model_version: Optional[str] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalysisDetailResponse(AnalysisResponse):
    clauses: List[ClauseResponse] = []
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class AnalysisStartResponse(BaseModel):
    analysis_id: UUID
    status: str
    message: str
    websocket_channel: Optional[str] = None
