from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from datetime import datetime
import time

from app.db.base import get_db
from app.models.user import User
from app.models.contract import Contract, ContractDocument
from app.models.analysis import AIAnalysis, AnalysisClause, AnalysisQuestion, AnalysisStatus, RiskLevel
from app.schemas.analysis import (
    AnalyzeRequest,
    AnalysisResponse,
    AnalysisDetailResponse,
    AnalysisStartResponse
)
from app.api.auth import get_current_user
from app.services.ai_analyzer import analyze_contract_text
from app.services.gemini import get_gemini_client, GeminiClient
from app.core.config import settings
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["AI Analysis"])


async def run_analysis(
    analysis_id: UUID,
    contract_text: str,
    user_context: str,
    db: AsyncSession
):
    """Background task to run AI analysis."""
    start_time = time.time()

    try:
        # Get analysis record
        result = await db.execute(
            select(AIAnalysis).where(AIAnalysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()

        if analysis is None:
            return

        # Update status to processing
        analysis.status = AnalysisStatus.PROCESSING
        await db.flush()

        # Run AI analysis
        ai_result = await analyze_contract_text(contract_text, user_context)

        # Update analysis with results
        analysis.safety_score = ai_result.get("score", 0)
        analysis.summary = ai_result.get("summary", "")
        analysis.status = AnalysisStatus.COMPLETED
        analysis.completed_at = datetime.utcnow()
        analysis.processing_time_ms = int((time.time() - start_time) * 1000)
        analysis.model_version = ai_result.get("model", "gemini-2.0-flash")

        # Add risk clauses
        for idx, risk in enumerate(ai_result.get("risks", [])):
            clause = AnalysisClause(
                analysis_id=analysis.id,
                clause_text=risk.get("title", ""),
                risk_level=RiskLevel(risk.get("level", "caution").lower()),
                explanation=risk.get("description", ""),
                suggestion=risk.get("suggestion", ""),
                display_order=idx
            )
            db.add(clause)

        # Add recommended questions
        for idx, question in enumerate(ai_result.get("questions", [])):
            q = AnalysisQuestion(
                analysis_id=analysis.id,
                question=question,
                priority=len(ai_result.get("questions", [])) - idx
            )
            db.add(q)

        await db.commit()

    except Exception as e:
        # Update status to failed
        result = await db.execute(
            select(AIAnalysis).where(AIAnalysis.id == analysis_id)
        )
        analysis = result.scalar_one_or_none()

        if analysis:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)
            await db.commit()


@router.post("/analyze", response_model=AnalysisStartResponse)
async def start_analysis(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start AI analysis for a contract."""
    # Verify contract ownership
    result = await db.execute(
        select(Contract)
        .options(selectinload(Contract.documents))
        .where(Contract.id == request.contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Get document text
    document = None
    if request.document_id:
        for doc in contract.documents:
            if doc.id == request.document_id:
                document = doc
                break
    else:
        # Get latest document
        latest_docs = [d for d in contract.documents if d.is_latest]
        document = latest_docs[0] if latest_docs else None

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document found for analysis"
        )

    contract_text = document.ocr_text or ""

    if not contract_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document text not yet extracted. Please wait for OCR processing."
        )

    # Build user context for personalized analysis
    user_context = ""
    if current_user.business_type:
        user_context = f"""
        User is a {current_user.business_type}.
        Business: {current_user.business_description or 'Not specified'}
        Known concerns: {current_user.legal_concerns or 'Not specified'}
        """

    # Create analysis record
    analysis = AIAnalysis(
        contract_id=contract.id,
        document_id=document.id,
        status=AnalysisStatus.PENDING,
        user_context=user_context
    )
    db.add(analysis)
    await db.flush()
    await db.refresh(analysis)

    # Start background analysis
    background_tasks.add_task(
        run_analysis,
        analysis.id,
        contract_text,
        user_context,
        db
    )

    return AnalysisStartResponse(
        analysis_id=analysis.id,
        status="processing",
        message="Analysis started. Check status using GET /ai/analysis/{id}",
        websocket_channel=f"analysis_{analysis.id}"
    )


@router.get("/analysis/{analysis_id}", response_model=AnalysisDetailResponse)
async def get_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analysis results."""
    result = await db.execute(
        select(AIAnalysis)
        .options(
            selectinload(AIAnalysis.clauses),
            selectinload(AIAnalysis.questions),
            selectinload(AIAnalysis.contract)
        )
        .where(AIAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # Verify ownership
    if analysis.contract.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return analysis


@router.get("/contract/{contract_id}/analyses", response_model=list[AnalysisResponse])
async def list_contract_analyses(
    contract_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all analyses for a contract."""
    # Verify contract ownership
    result = await db.execute(
        select(Contract)
        .where(Contract.id == contract_id)
        .where(Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found"
        )

    # Get analyses
    result = await db.execute(
        select(AIAnalysis)
        .where(AIAnalysis.contract_id == contract_id)
        .order_by(AIAnalysis.created_at.desc())
    )
    analyses = result.scalars().all()

    return analyses


# ==================== Quick Analysis Endpoints ====================
# These don't require authenticated user or stored contracts

class QuickAnalyzeRequest(BaseModel):
    """Request for quick contract analysis."""
    contract_text: str = Field(..., min_length=50, description="Contract text to analyze")
    business_type: Optional[str] = Field(None, description="User's business type for personalization")
    business_description: Optional[str] = Field(None, description="User's business description")
    legal_concerns: Optional[str] = Field(None, description="User's legal concerns")


class RiskItemResponse(BaseModel):
    """Risk item in analysis response."""
    id: str
    title: str
    description: str
    level: str
    suggestion: Optional[str] = None
    clause: Optional[str] = None


class QuickAnalysisResponse(BaseModel):
    """Response for quick contract analysis."""
    score: int
    summary: str
    risks: list[RiskItemResponse]
    questions: list[str]
    model: str
    error: Optional[str] = None


@router.post("/quick-analyze", response_model=QuickAnalysisResponse)
async def quick_analyze(
    request: QuickAnalyzeRequest,
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Quickly analyze contract text without authentication.

    This endpoint is useful for:
    - Preview/demo analysis
    - Anonymous quick checks
    - Frontend integration testing

    Note: Results are not stored. For persistent analysis, use POST /ai/analyze.
    """
    # Build user context if provided
    user_context = None
    if request.business_type or request.business_description or request.legal_concerns:
        user_context = {
            "business_type": request.business_type,
            "business_description": request.business_description,
            "legal_concerns": request.legal_concerns
        }

    result = await gemini.analyze_contract(
        contract_text=request.contract_text,
        user_context=user_context
    )

    return QuickAnalysisResponse(
        score=result.score,
        summary=result.summary,
        risks=[
            RiskItemResponse(
                id=r.id,
                title=r.title,
                description=r.description,
                level=r.level.value,
                suggestion=r.suggestion,
                clause=r.clause
            )
            for r in result.risks
        ],
        questions=result.questions,
        model=result.model,
        error=result.error
    )


@router.get("/health")
async def ai_health_check(
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """Check AI service health."""
    return {
        "status": "healthy" if gemini.is_available() else "degraded",
        "mock_mode": gemini._mock_mode,
        "model": "gemini-2.0-flash-exp"
    }
