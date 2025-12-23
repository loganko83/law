"""Risk pattern detection service for contract analysis."""
import re
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RiskPattern(BaseModel):
    """Risk pattern definition."""
    pattern: str  # Regex pattern
    title_ko: str
    title_en: str
    description_ko: str
    description_en: str
    base_score: int
    level: RiskLevel


class DetectedRisk(BaseModel):
    """Detected risk from pattern matching."""
    id: str
    title: str
    description: str
    level: RiskLevel
    matched_text: Optional[str] = None
    clause_reference: Optional[str] = None


# Korean contract risk patterns
RISK_PATTERNS: List[RiskPattern] = [
    RiskPattern(
        pattern=r"일방.*해지|단독.*해제|즉시.*해지|사유.*불문.*해지",
        title_ko="일방적 해지 조항",
        title_en="Unilateral Termination Clause",
        description_ko="상대방이 사전 통지 없이 계약을 해지할 수 있는 조항이 있습니다.",
        description_en="The other party may terminate the contract without prior notice.",
        base_score=70,
        level=RiskLevel.HIGH
    ),
    RiskPattern(
        pattern=r"지체상금.*[1-9]\d*%|연체료.*[2-9]%|지연이자.*[2-9]%",
        title_ko="과도한 지체상금",
        title_en="Excessive Late Payment Penalty",
        description_ko="지체상금/연체료가 업계 표준(1% 내외)을 초과합니다.",
        description_en="The penalty rate exceeds industry standards.",
        base_score=75,
        level=RiskLevel.HIGH
    ),
    RiskPattern(
        pattern=r"모든.*지적재산권.*귀속|전체.*저작권.*이전|일체.*권리.*양도",
        title_ko="포괄적 지식재산권 이전",
        title_en="Broad IP Assignment",
        description_ko="모든 지적재산권이 예외 없이 이전될 수 있습니다.",
        description_en="All intellectual property rights may be transferred without exception.",
        base_score=55,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"무한.*책임|제한.*없.*손해배상|책임.*상한.*없|전액.*배상",
        title_ko="무제한 책임 조항",
        title_en="Unlimited Liability",
        description_ko="손해배상 책임에 상한이 없습니다.",
        description_en="No cap on liability for damages.",
        base_score=80,
        level=RiskLevel.HIGH
    ),
    RiskPattern(
        pattern=r"자동.*갱신|자동.*연장|묵시.*갱신",
        title_ko="자동 갱신 조항",
        title_en="Auto-Renewal Clause",
        description_ko="명시적 동의 없이 계약이 자동으로 갱신될 수 있습니다.",
        description_en="Contract may automatically renew without explicit consent.",
        base_score=45,
        level=RiskLevel.LOW
    ),
    RiskPattern(
        pattern=r"수정.*무한|횟수.*제한.*없|무제한.*수정|횟수.*제한 없이",
        title_ko="무제한 수정 요청",
        title_en="Unlimited Revisions",
        description_ko="수정 요청 횟수에 제한이 없습니다.",
        description_en="No limit on revision requests.",
        base_score=65,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"60일|90일|Net\s*60|Net\s*90",
        title_ko="장기 대금 지급 기간",
        title_en="Extended Payment Terms",
        description_ko="대금 지급 기간이 표준(30일)을 초과합니다.",
        description_en="Payment terms exceed standard 30-day period.",
        base_score=50,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"비밀유지.*기간.*없|영구.*비밀유지|기간.*제한.*없.*비밀",
        title_ko="무기한 비밀유지 의무",
        title_en="Indefinite NDA",
        description_ko="비밀유지 의무에 기간 제한이 없습니다.",
        description_en="No time limit on confidentiality obligations.",
        base_score=40,
        level=RiskLevel.LOW
    ),
    RiskPattern(
        pattern=r"경쟁.*금지|동종.*업계.*취업.*금지|경업.*금지",
        title_ko="경업 금지 조항",
        title_en="Non-Compete Clause",
        description_ko="계약 종료 후에도 경쟁 업체 취업/사업이 제한될 수 있습니다.",
        description_en="May restrict employment or business with competitors after contract ends.",
        base_score=60,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"분쟁.*시.*중재|중재.*판정|중재.*최종",
        title_ko="강제 중재 조항",
        title_en="Mandatory Arbitration",
        description_ko="분쟁 발생 시 법원 소송 대신 중재로만 해결해야 합니다.",
        description_en="Disputes must be resolved through arbitration instead of court.",
        base_score=55,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"보증.*책임.*1년 미만|하자.*담보.*6개월|하자.*기간.*단축",
        title_ko="단기 하자보증 기간",
        title_en="Short Warranty Period",
        description_ko="하자보증 기간이 표준(1년)보다 짧습니다.",
        description_en="Warranty period is shorter than standard (1 year).",
        base_score=50,
        level=RiskLevel.MEDIUM
    ),
    RiskPattern(
        pattern=r"선급금.*없|착수금.*없|착수금.*지급.*않",
        title_ko="선급금 미지급",
        title_en="No Upfront Payment",
        description_ko="선급금/착수금 없이 작업을 시작해야 할 수 있습니다.",
        description_en="Work may need to start without upfront payment.",
        base_score=55,
        level=RiskLevel.MEDIUM
    ),
]


def detect_pattern_risks(
    contract_text: str,
    lang: str = "ko"
) -> List[DetectedRisk]:
    """
    Detect risks in contract text using pattern matching.

    Args:
        contract_text: The contract text to analyze
        lang: Language for titles/descriptions ('ko' or 'en')

    Returns:
        List of detected risks
    """
    risks: List[DetectedRisk] = []

    for idx, pattern in enumerate(RISK_PATTERNS):
        regex = re.compile(pattern.pattern, re.IGNORECASE)
        match = regex.search(contract_text)

        if match:
            title = pattern.title_ko if lang == "ko" else pattern.title_en
            description = pattern.description_ko if lang == "ko" else pattern.description_en

            risks.append(DetectedRisk(
                id=f"pattern_{idx}",
                title=title,
                description=description,
                level=pattern.level,
                matched_text=match.group(0)[:100],  # Limit matched text length
            ))

    return risks


def calculate_pattern_score(risks: List[DetectedRisk]) -> int:
    """
    Calculate safety score based on detected risks.

    Args:
        risks: List of detected risks

    Returns:
        Safety score (0-100, higher is safer)
    """
    if not risks:
        return 85  # Default score if no risks detected

    # Count risks by level
    high_count = sum(1 for r in risks if r.level == RiskLevel.HIGH)
    medium_count = sum(1 for r in risks if r.level == RiskLevel.MEDIUM)
    low_count = sum(1 for r in risks if r.level == RiskLevel.LOW)

    # Calculate score (start at 90, deduct for each risk)
    score = 90
    score -= high_count * 15
    score -= medium_count * 8
    score -= low_count * 3

    # Ensure score is within bounds
    return max(20, min(90, score))


def merge_risks(
    pattern_risks: List[DetectedRisk],
    ai_risks: List[DetectedRisk]
) -> List[DetectedRisk]:
    """
    Merge pattern-detected risks with AI-detected risks, avoiding duplicates.

    Args:
        pattern_risks: Risks from pattern matching
        ai_risks: Risks from AI analysis

    Returns:
        Combined list of risks
    """
    combined = list(pattern_risks)

    for ai_risk in ai_risks:
        # Check for duplicates by comparing titles (simplified)
        is_duplicate = any(
            ai_risk.title.lower().split()[0] in pr.title.lower()
            for pr in pattern_risks
        )
        if not is_duplicate:
            combined.append(ai_risk)

    return combined
