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


# ==================== Additional AI Proxy Endpoints ====================
# These endpoints proxy AI calls through the backend for security

class ChatMessage(BaseModel):
    """Chat message for conversation."""
    role: str = Field(..., description="Message role: user or assistant")
    text: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request for AI chat."""
    message: str = Field(..., min_length=1, description="User's message")
    history: list[ChatMessage] = Field(default=[], description="Conversation history")
    user_profile: Optional[dict] = Field(None, description="User profile for context")


class ChatResponse(BaseModel):
    """Response from AI chat."""
    response: str
    model: str


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    AI chat endpoint for legal Q&A.

    Proxies chat requests through the backend for security.
    """
    # Build system instruction with user context
    system_instruction = """You are a helpful AI legal assistant for the Korean legal system.
    You provide information about Korean laws, regulations, and legal procedures.
    Always clarify that you are providing general information, not legal advice.
    Always respond in Korean unless the user writes in English.
    """

    if request.user_profile:
        profile = request.user_profile
        system_instruction += f"""
        [USER PROFILE CONTEXT]
        - Name: {profile.get('name', 'User')}
        - Job/Business: {profile.get('businessType', 'Not specified')}
        - Description: {profile.get('businessDescription', 'Not specified')}
        - Known Legal Concerns: {profile.get('legalConcerns', 'Not specified')}

        Tailor your advice to be relevant to their business type.
        """

    response_text = await gemini.chat(
        message=request.message,
        history=[(msg.role, msg.text) for msg in request.history],
        system_instruction=system_instruction
    )

    return ChatResponse(
        response=response_text,
        model="gemini-2.0-flash-exp"
    )


class SummarizeRequest(BaseModel):
    """Request for document summarization."""
    document_text: str = Field(..., min_length=10, description="Document text to summarize")
    summary_type: str = Field("general", description="Type of summary: general, detailed, bullet")
    language: str = Field("ko", description="Response language: ko or en")


class SummarizeResponse(BaseModel):
    """Response from summarization."""
    summary: str
    key_points: list[str]
    model: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_document(
    request: SummarizeRequest,
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Summarize a document.

    Useful for document viewer to get quick summaries.
    """
    lang_instruction = "Respond in Korean." if request.language == "ko" else "Respond in English."

    prompt = f"""Summarize the following document.
    {lang_instruction}

    Document:
    {request.document_text[:10000]}

    Provide:
    1. A concise summary (2-3 paragraphs)
    2. Key points (5-7 bullet points)

    Format as JSON:
    {{
        "summary": "...",
        "key_points": ["point 1", "point 2", ...]
    }}
    """

    response_text = await gemini.generate(prompt)

    # Parse response
    try:
        import json
        # Remove markdown code blocks if present
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]

        result = json.loads(clean_text)
        return SummarizeResponse(
            summary=result.get("summary", "Summary not available"),
            key_points=result.get("key_points", []),
            model="gemini-2.0-flash-exp"
        )
    except json.JSONDecodeError:
        return SummarizeResponse(
            summary=response_text[:500],
            key_points=[],
            model="gemini-2.0-flash-exp"
        )


class ProofRequest(BaseModel):
    """Request for content proof generation."""
    content: str = Field(..., min_length=10, description="Content to generate proof for")
    proof_type: str = Field("existence", description="Type of proof: existence, authorship, timestamp")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class ProofResponse(BaseModel):
    """Response from proof generation."""
    proof_text: str
    hash: str
    timestamp: str
    model: str


@router.post("/proof", response_model=ProofResponse)
async def generate_proof(
    request: ProofRequest,
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Generate content proof using AI.

    Creates a verification statement for the content.
    """
    import hashlib
    from datetime import datetime

    # Generate content hash
    content_hash = hashlib.sha256(request.content.encode()).hexdigest()
    timestamp = datetime.utcnow().isoformat() + "Z"

    prompt = f"""Generate a formal proof statement for the following content.
    Content type: {request.proof_type}
    Timestamp: {timestamp}
    Content hash: {content_hash}

    Content preview (first 500 chars):
    {request.content[:500]}

    Generate a formal verification statement in Korean that confirms:
    1. The content existed at the specified timestamp
    2. The content hash for verification
    3. Any relevant metadata

    Keep the response concise and formal.
    """

    response_text = await gemini.generate(prompt)

    return ProofResponse(
        proof_text=response_text,
        hash=content_hash,
        timestamp=timestamp,
        model="gemini-2.0-flash-exp"
    )


class NegotiationScriptRequest(BaseModel):
    """Request for negotiation script generation."""
    risk_title: str = Field(..., description="Title of the risk")
    risk_description: str = Field(..., description="Description of the risk")
    risk_level: str = Field(..., description="Risk level: HIGH, MEDIUM, LOW")
    contract_context: str = Field(..., max_length=1000, description="Contract context")


class NegotiationScriptResponse(BaseModel):
    """Response with negotiation script."""
    script: str
    model: str


@router.post("/negotiation-script", response_model=NegotiationScriptResponse)
async def get_negotiation_script(
    request: NegotiationScriptRequest,
    gemini: GeminiClient = Depends(get_gemini_client)
):
    """
    Generate a negotiation script for a specific contract risk.
    """
    prompt = f"""You are a negotiation coach helping a freelancer/small business owner.

Based on this contract risk:
- Title: {request.risk_title}
- Description: {request.risk_description}
- Risk Level: {request.risk_level}

Contract context: {request.contract_context}

Provide a polite but firm negotiation script in Korean that the user can use to discuss this issue with the other party. Include:
1. Opening statement
2. Specific request for change
3. Reasonable alternative suggestion
4. Professional closing

Keep it under 200 words.
"""

    response_text = await gemini.generate(prompt)

    return NegotiationScriptResponse(
        script=response_text,
        model="gemini-2.0-flash-exp"
    )
