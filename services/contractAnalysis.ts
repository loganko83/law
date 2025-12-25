/**
 * Contract Analysis Service
 *
 * AI-powered contract analysis using backend API proxy.
 * All AI calls are routed through the backend for security.
 */

import { ContractAnalysis, RiskLevel, RiskPoint } from "../types";
import { getAccessToken } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

// Error types for better error handling
export class AnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export const ERROR_CODES = {
  API_KEY_INVALID: "API_KEY_INVALID",
  API_KEY_MISSING: "API_KEY_MISSING",
  NETWORK_ERROR: "NETWORK_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  PARSE_ERROR: "PARSE_ERROR",
  CONTRACT_TOO_SHORT: "CONTRACT_TOO_SHORT",
  CONTRACT_TOO_LONG: "CONTRACT_TOO_LONG",
} as const;

export const ERROR_MESSAGES: Record<string, { en: string; ko: string }> = {
  [ERROR_CODES.API_KEY_INVALID]: {
    en: "API key is invalid. Please check your configuration.",
    ko: "API 키가 유효하지 않습니다. 설정을 확인해주세요.",
  },
  [ERROR_CODES.API_KEY_MISSING]: {
    en: "API key is not configured. Please set GEMINI_API_KEY.",
    ko: "API 키가 설정되지 않았습니다. GEMINI_API_KEY를 설정해주세요.",
  },
  [ERROR_CODES.NETWORK_ERROR]: {
    en: "Network error. Please check your internet connection.",
    ko: "네트워크 오류입니다. 인터넷 연결을 확인해주세요.",
  },
  [ERROR_CODES.RATE_LIMITED]: {
    en: "Too many requests. Please try again in a moment.",
    ko: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  },
  [ERROR_CODES.PARSE_ERROR]: {
    en: "Failed to process the analysis result.",
    ko: "분석 결과 처리에 실패했습니다.",
  },
  [ERROR_CODES.CONTRACT_TOO_SHORT]: {
    en: "Contract text is too short. Minimum 50 characters required.",
    ko: "계약서 내용이 너무 짧습니다. 최소 50자 이상이 필요합니다.",
  },
  [ERROR_CODES.CONTRACT_TOO_LONG]: {
    en: "Contract text is too long. Maximum 100,000 characters.",
    ko: "계약서 내용이 너무 깁니다. 최대 100,000자까지 가능합니다.",
  },
};

// Risk pattern detection (rule-based pre-processing - kept as local fallback)
interface RiskPattern {
  pattern: RegExp;
  title: string;
  description: string;
  baseScore: number;
  level: RiskLevel;
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    pattern: /일방.*해지|단독.*해제|즉시.*해지/,
    title: "Unilateral Termination Clause",
    description: "The other party may terminate the contract without prior notice",
    baseScore: 70,
    level: RiskLevel.High,
  },
  {
    pattern: /지체상금.*[1-9]\d*%|연체료.*[2-9]%/,
    title: "Excessive Late Payment Penalty",
    description: "The penalty rate exceeds industry standards",
    baseScore: 75,
    level: RiskLevel.High,
  },
  {
    pattern: /모든.*지적재산권.*귀속|전체.*저작권.*이전/,
    title: "Broad IP Assignment",
    description: "All intellectual property rights may be transferred without exception",
    baseScore: 55,
    level: RiskLevel.Medium,
  },
  {
    pattern: /무한.*책임|제한.*없.*손해배상/,
    title: "Unlimited Liability",
    description: "No cap on liability for damages",
    baseScore: 80,
    level: RiskLevel.High,
  },
  {
    pattern: /자동.*갱신|자동.*연장/,
    title: "Auto-Renewal Clause",
    description: "Contract may automatically renew without explicit consent",
    baseScore: 45,
    level: RiskLevel.Low,
  },
  {
    pattern: /수정.*무한|횟수.*제한.*없/,
    title: "Unlimited Revisions",
    description: "No limit on revision requests",
    baseScore: 65,
    level: RiskLevel.Medium,
  },
  {
    pattern: /60일|90일|Net\s*60|Net\s*90/i,
    title: "Extended Payment Terms",
    description: "Payment terms exceed standard 30-day period",
    baseScore: 50,
    level: RiskLevel.Medium,
  },
];

/**
 * Detect risks using pattern matching (local fallback)
 */
export const detectPatternRisks = (contractText: string): RiskPoint[] => {
  const risks: RiskPoint[] = [];

  RISK_PATTERNS.forEach((pattern, index) => {
    if (pattern.pattern.test(contractText)) {
      risks.push({
        id: `pattern_${index}`,
        title: pattern.title,
        description: pattern.description,
        level: pattern.level,
      });
    }
  });

  return risks;
};

/**
 * Validate contract text before analysis
 */
const validateContractText = (contractText: string, lang: "en" | "ko" = "ko"): void => {
  if (!contractText || contractText.trim().length < 50) {
    throw new AnalysisError(
      "Contract text too short",
      ERROR_CODES.CONTRACT_TOO_SHORT,
      ERROR_MESSAGES[ERROR_CODES.CONTRACT_TOO_SHORT][lang]
    );
  }

  if (contractText.length > 100000) {
    throw new AnalysisError(
      "Contract text too long",
      ERROR_CODES.CONTRACT_TOO_LONG,
      ERROR_MESSAGES[ERROR_CODES.CONTRACT_TOO_LONG][lang]
    );
  }
};

/**
 * Parse API error and return user-friendly error
 */
const handleApiError = (error: unknown, lang: "en" | "ko" = "ko"): never => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
    throw new AnalysisError(
      errorMessage,
      ERROR_CODES.API_KEY_INVALID,
      ERROR_MESSAGES[ERROR_CODES.API_KEY_INVALID][lang]
    );
  }

  if (errorMessage.includes("429") || errorMessage.includes("RATE_LIMIT")) {
    throw new AnalysisError(
      errorMessage,
      ERROR_CODES.RATE_LIMITED,
      ERROR_MESSAGES[ERROR_CODES.RATE_LIMITED][lang]
    );
  }

  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    throw new AnalysisError(
      errorMessage,
      ERROR_CODES.NETWORK_ERROR,
      ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR][lang]
    );
  }

  // Generic error
  throw new AnalysisError(
    errorMessage,
    ERROR_CODES.NETWORK_ERROR,
    ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR][lang]
  );
};

/**
 * Convert API risk level string to RiskLevel enum
 */
const mapRiskLevel = (level: string): RiskLevel => {
  const upper = level?.toUpperCase() || '';
  if (upper === 'HIGH' || upper === 'DANGER') return RiskLevel.High;
  if (upper === 'MEDIUM' || upper === 'CAUTION') return RiskLevel.Medium;
  return RiskLevel.Low;
};

/**
 * Analyze a contract document via backend API
 *
 * @param contractText - The full text of the contract
 * @param userContext - Optional context about the user (business type, concerns)
 * @param _useRAG - Deprecated: RAG is handled by backend
 * @param lang - Language for error messages (default: "ko")
 * @returns Structured analysis result
 */
export const analyzeContract = async (
  contractText: string,
  userContext?: string,
  _useRAG: boolean = true,
  lang: "en" | "ko" = "ko"
): Promise<ContractAnalysis> => {
  // Step 0: Validate input
  validateContractText(contractText, lang);

  // Step 1: Call backend API
  try {
    const response = await fetch(`${API_BASE_URL}/ai/quick-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contract_text: contractText,
        business_type: userContext ? extractField(userContext, "businessType") : undefined,
        business_description: userContext ? extractField(userContext, "businessDescription") : undefined,
        legal_concerns: userContext ? extractField(userContext, "legalConcerns") : undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Analysis failed: ${response.status}`);
    }

    const result = await response.json();

    // Step 2: Convert API response to ContractAnalysis format
    const risks: RiskPoint[] = (result.risks || []).map((risk: {
      id?: string;
      title: string;
      description: string;
      level: string;
    }, index: number) => ({
      id: risk.id || `api_${index}`,
      title: risk.title,
      description: risk.description,
      level: mapRiskLevel(risk.level),
    }));

    return {
      summary: result.summary || "Analysis completed",
      score: Math.min(100, Math.max(0, result.score || 50)),
      risks,
      questions: result.questions || [],
    };
  } catch (error) {
    // Fallback to local pattern detection if backend fails
    console.warn("Backend analysis failed, using local pattern detection:", error);

    const patternRisks = detectPatternRisks(contractText);

    if (patternRisks.length > 0) {
      return {
        summary: "Backend analysis unavailable. Pattern-based risks detected.",
        score: Math.max(40, 80 - patternRisks.length * 10),
        risks: patternRisks,
        questions: ["Please review all terms carefully before signing."],
      };
    }

    handleApiError(error, lang);
  }
};

/**
 * Extract field from user context string
 */
const extractField = (context: string, field: string): string | undefined => {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(context);
    return parsed[field];
  } catch {
    // Fall back to simple extraction
    const patterns: Record<string, RegExp> = {
      businessType: /business\s*type[:\s]+([^\n,]+)/i,
      businessDescription: /business\s*description[:\s]+([^\n]+)/i,
      legalConcerns: /legal\s*concerns[:\s]+([^\n]+)/i,
    };
    const match = context.match(patterns[field]);
    return match ? match[1].trim() : undefined;
  }
};

/**
 * Get negotiation script for a specific risk item via backend API
 */
export const getNegotiationScript = async (
  riskItem: RiskPoint,
  contractContext: string
): Promise<string> => {
  try {
    const token = getAccessToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/negotiation-script`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        risk_title: riskItem.title,
        risk_description: riskItem.description,
        risk_level: riskItem.level,
        contract_context: contractContext.substring(0, 500),
      }),
    });

    if (!response.ok) {
      // Fallback to basic script if endpoint not available
      return generateFallbackScript(riskItem);
    }

    const result = await response.json();
    return result.script || generateFallbackScript(riskItem);
  } catch {
    // Fallback script
    return generateFallbackScript(riskItem);
  }
};

/**
 * Generate a fallback negotiation script locally
 */
const generateFallbackScript = (riskItem: RiskPoint): string => {
  return `Based on the identified risk: ${riskItem.title}

Suggested approach:
1. Acknowledge the clause and its intent
2. Express your concerns about: ${riskItem.description}
3. Propose a balanced alternative that protects both parties
4. Request written confirmation of any agreed changes

Please consult with a legal professional for specific advice.`;
};

export default {
  analyzeContract,
  getNegotiationScript,
  detectPatternRisks,
};
