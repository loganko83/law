from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(str, enum.Enum):
    SAFE = "safe"
    CAUTION = "caution"
    WARNING = "warning"
    DANGER = "danger"


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("contract_documents.id"), nullable=True)

    # Analysis result
    safety_score = Column(Integer, nullable=True)  # 0-100
    summary = Column(Text, nullable=True)
    status = Column(Enum(AnalysisStatus), default=AnalysisStatus.PENDING)

    # AI metadata
    model_version = Column(String(50), nullable=True)  # gemini-2.0-flash, etc.
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)

    # User context used for personalized analysis
    user_context = Column(Text, nullable=True)

    # Error handling
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    contract = relationship("Contract", back_populates="analyses")
    clauses = relationship("AnalysisClause", back_populates="analysis", cascade="all, delete-orphan")
    questions = relationship("AnalysisQuestion", back_populates="analysis", cascade="all, delete-orphan")


class AnalysisClause(Base):
    __tablename__ = "analysis_clauses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("ai_analyses.id"), nullable=False)

    # Clause identification
    clause_number = Column(String(20), nullable=True)  # e.g., "8", "12-1"
    clause_title = Column(String(255), nullable=True)
    clause_text = Column(Text, nullable=False)

    # Risk assessment
    risk_level = Column(Enum(RiskLevel), nullable=False)
    explanation = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=True)
    negotiation_script = Column(Text, nullable=True)

    # Comparison with standard
    standard_comparison = Column(Text, nullable=True)
    deviation_percentage = Column(Float, nullable=True)

    # Position in document
    start_position = Column(Integer, nullable=True)
    end_position = Column(Integer, nullable=True)

    # Order for display
    display_order = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    analysis = relationship("AIAnalysis", back_populates="clauses")


class AnalysisQuestion(Base):
    """Recommended questions to ask the counterparty."""
    __tablename__ = "analysis_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("ai_analyses.id"), nullable=False)

    question = Column(Text, nullable=False)
    context = Column(Text, nullable=True)  # Why this question is important
    priority = Column(Integer, default=0)  # Higher = more important

    # Related clause
    related_clause_id = Column(UUID(as_uuid=True), ForeignKey("analysis_clauses.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    analysis = relationship("AIAnalysis", back_populates="questions")


class StandardClause(Base):
    """Reference data for RAG - standard contract clauses from official sources."""
    __tablename__ = "standard_clauses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Categorization
    category = Column(String(50), nullable=False, index=True)  # fair_trade, real_estate, employment
    clause_type = Column(String(100), nullable=False, index=True)  # termination, penalty, ip_rights

    # Content
    standard_text = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)

    # Source
    source = Column(String(255), nullable=True)  # Fair Trade Commission, etc.
    source_url = Column(String(500), nullable=True)
    effective_date = Column(DateTime, nullable=True)

    # Search
    keywords = Column(JSONB, nullable=True)  # ["termination", "cancellation", ...]

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
