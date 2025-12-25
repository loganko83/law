"""Gemini AI Service for contract analysis and legal assistance."""
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum

from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import AIServiceError

logger = get_logger("gemini")


class RiskLevel(str, Enum):
    """Risk level classification."""
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass
class RiskItem:
    """A single risk item from analysis."""
    id: str
    title: str
    description: str
    level: RiskLevel
    suggestion: Optional[str] = None
    clause: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "level": self.level.value,
            "suggestion": self.suggestion,
            "clause": self.clause
        }


@dataclass
class AnalysisResult:
    """Result of contract analysis."""
    score: int
    summary: str
    risks: List[RiskItem]
    questions: List[str]
    model: str
    raw_response: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "summary": self.summary,
            "risks": [r.to_dict() for r in self.risks],
            "questions": self.questions,
            "model": self.model,
            "error": self.error
        }


# Analysis prompt templates
ANALYSIS_SYSTEM_PROMPT = """You are a Korean contract law expert AI assistant.
Your role is to analyze contracts and identify potential risks for the party seeking review (usually the weaker party - freelancers, tenants, employees).

IMPORTANT RULES:
1. Provide ONLY factual information, not legal advice
2. Use simple, easy-to-understand language
3. Compare clauses against standard Korean contract templates
4. Focus on terms that may be unfair or unusual
5. DO NOT say "do not sign" or "this contract is void" - only provide factual analysis
6. Always respond in Korean

OUTPUT FORMAT (JSON):
{
    "score": <0-100 safety score>,
    "summary": "<3 sentence summary of the contract>",
    "risks": [
        {
            "id": "<unique id like risk_1>",
            "title": "<risk title in Korean>",
            "description": "<detailed explanation in Korean>",
            "level": "<HIGH|MEDIUM|LOW>",
            "clause": "<relevant clause text if identifiable>",
            "suggestion": "<what to negotiate or ask about in Korean>"
        }
    ],
    "questions": [
        "<question to ask the counterparty in Korean>"
    ]
}
"""

ANALYSIS_USER_PROMPT_TEMPLATE = """Please analyze the following contract:

{contract_text}

{user_context_section}

Provide your analysis in the JSON format specified. Focus on:
1. Payment terms (late payment, excessive penalties)
2. Termination clauses (unilateral termination rights)
3. Liability clauses (unlimited liability, indemnification)
4. Intellectual property rights
5. Non-compete/exclusivity clauses
6. Scope of work (vague deliverables, unlimited revisions)
7. Duration and renewal terms
8. Dispute resolution methods

Return ONLY the JSON object, no additional text.
"""


class GeminiClient:
    """Client for Google Gemini AI API."""

    def __init__(self, api_key: str = None):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._client = None
        self._mock_mode = not self._api_key

        if self._mock_mode:
            logger.warning("GeminiClient running in MOCK MODE - no real AI processing")

    def _get_client(self):
        """Get or create Gemini client."""
        if self._mock_mode:
            return None

        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self._api_key)
            except ImportError:
                raise AIServiceError("google-genai package not installed")
            except Exception as e:
                raise AIServiceError(f"Failed to initialize Gemini client: {e}")

        return self._client

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and clean JSON response from Gemini."""
        text = response_text.strip()

        # Remove markdown code blocks
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error: {e}, response: {text[:200]}...")
            raise

    def _mock_analysis(self, contract_text: str) -> AnalysisResult:
        """Generate mock analysis for development."""
        return AnalysisResult(
            score=72,
            summary="본 계약서는 용역 서비스 제공에 관한 표준적인 내용을 담고 있으나, 몇 가지 주의가 필요한 조항이 발견되었습니다.",
            risks=[
                RiskItem(
                    id="risk_1",
                    title="일방적 계약 해지 조항",
                    description="갑은 을에게 사전 통보 없이 계약을 해지할 수 있는 반면, 을은 30일 전 서면 통보가 필요합니다.",
                    level=RiskLevel.HIGH,
                    suggestion="양 당사자에게 동등한 해지 조건을 적용하도록 협상하세요."
                ),
                RiskItem(
                    id="risk_2",
                    title="지급 지연 시 제재 조항 미비",
                    description="대금 지급 지연 시 갑에 대한 지연 이자나 제재 조항이 없습니다.",
                    level=RiskLevel.MEDIUM,
                    suggestion="지급 지연 시 연 15% 이상의 지연 이자 조항 추가를 요청하세요."
                )
            ],
            questions=[
                "계약 기간 중 업무 범위 변경 시 추가 비용 산정 기준은 무엇인가요?",
                "지적재산권의 귀속 시점이 대금 완납 후인가요, 결과물 인도 시점인가요?"
            ],
            model="mock"
        )

    async def analyze_contract(
        self,
        contract_text: str,
        user_context: Optional[Dict[str, str]] = None
    ) -> AnalysisResult:
        """
        Analyze contract text using Gemini AI.

        Args:
            contract_text: The contract text to analyze
            user_context: Optional user context for personalized analysis
                - business_type: e.g., "freelance developer"
                - business_description: e.g., "web app development"
                - legal_concerns: e.g., "payment delays, IP issues"

        Returns:
            AnalysisResult with score, summary, risks, and suggested questions
        """
        if not contract_text or len(contract_text.strip()) < 50:
            raise AIServiceError("Contract text is too short for analysis")

        # Mock mode
        if self._mock_mode:
            logger.info("[MOCK] Analyzing contract")
            return self._mock_analysis(contract_text)

        # Build user context section
        user_context_section = ""
        if user_context:
            parts = []
            if user_context.get("business_type"):
                parts.append(f"- Business Type: {user_context['business_type']}")
            if user_context.get("business_description"):
                parts.append(f"- Business Description: {user_context['business_description']}")
            if user_context.get("legal_concerns"):
                parts.append(f"- Key Legal Concerns: {user_context['legal_concerns']}")

            if parts:
                user_context_section = "USER CONTEXT (personalize analysis based on this):\n" + "\n".join(parts)

        # Build prompt
        user_prompt = ANALYSIS_USER_PROMPT_TEMPLATE.format(
            contract_text=contract_text,
            user_context_section=user_context_section
        )

        try:
            client = self._get_client()

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=user_prompt,
                config={
                    "system_instruction": ANALYSIS_SYSTEM_PROMPT,
                    "temperature": 0.3,
                    "max_output_tokens": 4096
                }
            )

            result_dict = self._parse_response(response.text)

            # Convert to typed result
            risks = []
            for r in result_dict.get("risks", []):
                try:
                    risks.append(RiskItem(
                        id=r.get("id", f"risk_{len(risks)}"),
                        title=r.get("title", "Unknown Risk"),
                        description=r.get("description", ""),
                        level=RiskLevel(r.get("level", "MEDIUM")),
                        suggestion=r.get("suggestion"),
                        clause=r.get("clause")
                    ))
                except Exception as e:
                    logger.warning(f"Failed to parse risk item: {e}")

            return AnalysisResult(
                score=result_dict.get("score", 50),
                summary=result_dict.get("summary", "Analysis completed."),
                risks=risks,
                questions=result_dict.get("questions", []),
                model="gemini-2.0-flash",
                raw_response=response.text
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return AnalysisResult(
                score=50,
                summary="분석 결과 파싱에 실패했습니다. 수동 검토가 필요합니다.",
                risks=[],
                questions=["계약서 내용을 직접 확인해주세요."],
                model="gemini-2.0-flash",
                error=f"JSON parsing error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise AIServiceError(f"Contract analysis failed: {str(e)}")

    async def generate_legal_document(
        self,
        document_type: str,
        details: Dict[str, str],
        user_context: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Generate a legal document using Gemini AI.

        Args:
            document_type: Type of document (e.g., "content_proof", "response_letter")
            details: Document-specific details
            user_context: Optional user context for personalization

        Returns:
            Generated document text
        """
        if self._mock_mode:
            logger.info(f"[MOCK] Generating {document_type}")
            return f"""[{document_type.upper()} - MOCK]

발신: {details.get('sender', '발신인')}
수신: {details.get('receiver', '수신인')}

본 문서는 {details.get('subject', '법적 사안')}에 관한 것입니다.

{details.get('content', '상세 내용이 여기에 표시됩니다.')}

작성일: 2024년 1월 1일
"""

        # Document generation prompts would be implemented here
        # For now, return basic template
        raise NotImplementedError("Full document generation not yet implemented")

    def is_available(self) -> bool:
        """Check if Gemini service is available."""
        if self._mock_mode:
            return True

        try:
            self._get_client()
            return True
        except Exception:
            return False

    async def generate(self, prompt: str, system_instruction: str = None) -> str:
        """
        Generate text response from Gemini.

        Args:
            prompt: The prompt text
            system_instruction: Optional system instruction

        Returns:
            Generated text response
        """
        if self._mock_mode:
            logger.info("[MOCK] Generating text")
            return f"[MOCK RESPONSE] This is a mock response to: {prompt[:100]}..."

        try:
            client = self._get_client()

            config = {
                "temperature": 0.7,
                "max_output_tokens": 2048
            }

            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=config
            )

            return response.text

        except Exception as e:
            logger.error(f"Gemini generate failed: {e}")
            raise AIServiceError(f"Text generation failed: {str(e)}")

    async def chat(
        self,
        message: str,
        history: List[tuple] = None,
        system_instruction: str = None
    ) -> str:
        """
        Chat with Gemini maintaining conversation history.

        Args:
            message: The user's message
            history: List of (role, text) tuples for conversation history
            system_instruction: Optional system instruction

        Returns:
            AI response text
        """
        if self._mock_mode:
            logger.info("[MOCK] Chat response")
            return f"[MOCK] Thank you for your question about: {message[:100]}... I would provide helpful legal information here."

        try:
            client = self._get_client()

            # Build conversation contents
            contents = []

            # Add history
            if history:
                for role, text in history:
                    gemini_role = "model" if role == "assistant" else "user"
                    contents.append({
                        "role": gemini_role,
                        "parts": [{"text": text}]
                    })

            # Add current message
            contents.append({
                "role": "user",
                "parts": [{"text": message}]
            })

            config = {
                "temperature": 0.7,
                "max_output_tokens": 2048
            }

            if system_instruction:
                config["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=config
            )

            return response.text

        except Exception as e:
            logger.error(f"Gemini chat failed: {e}")
            raise AIServiceError(f"Chat failed: {str(e)}")


# Singleton instance
gemini_client = GeminiClient()


async def get_gemini_client() -> GeminiClient:
    """Dependency for getting Gemini client."""
    return gemini_client
