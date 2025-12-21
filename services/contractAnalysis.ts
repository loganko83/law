/**
 * Contract Analysis Service
 *
 * AI-powered contract analysis using Gemini with optional RAG
 * for legal context from standard clauses and precedents.
 */

import { generateWithRAG, generateContent, MODELS } from "./geminiClient";
import { ContractAnalysis, RiskLevel, RiskPoint } from "../types";

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

// Risk pattern detection (rule-based pre-processing)
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
 * Detect risks using pattern matching (pre-processing)
 */
const detectPatternRisks = (contractText: string): RiskPoint[] => {
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
 * System prompt for contract analysis
 */
const getAnalysisPrompt = (contractText: string, userContext?: string): string => {
  return `You are an expert Korean contract law analyst. Analyze the following contract and provide a detailed risk assessment.

IMPORTANT RULES:
1. Provide INFORMATION only, not legal advice
2. Use objective language: "This clause is 3x higher than standard" (OK), "Do not sign this" (NOT OK)
3. Explain complex legal terms in plain Korean language
4. Compare against standard contract templates
5. Focus on protecting the weaker party (freelancer, tenant, employee)

${userContext ? `USER CONTEXT:\n${userContext}\n` : ""}

CONTRACT TEXT:
${contractText}

Respond in the following JSON format:
{
  "summary": "3-sentence summary focusing on key findings",
  "safetyScore": 0-100,
  "risks": [
    {
      "id": "unique_id",
      "title": "Risk title in Korean",
      "description": "Detailed explanation in Korean",
      "level": "HIGH|MEDIUM|LOW",
      "clauseReference": "Reference to specific clause if applicable",
      "standardComparison": "How this differs from standard contracts"
    }
  ],
  "suggestions": [
    "Negotiation suggestion 1",
    "Negotiation suggestion 2"
  ],
  "questions": [
    "Question to ask the other party 1",
    "Question to ask the other party 2"
  ]
}`;
};

/**
 * Parse AI response to structured analysis
 */
const parseAnalysisResponse = (response: string, patternRisks: RiskPoint[]): ContractAnalysis => {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                      response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Convert AI risks to our format
    const aiRisks: RiskPoint[] = (parsed.risks || []).map((risk: {
      id?: string;
      title: string;
      description: string;
      level: string;
    }, index: number) => ({
      id: risk.id || `ai_${index}`,
      title: risk.title,
      description: risk.description,
      level: risk.level === "HIGH" ? RiskLevel.High :
             risk.level === "MEDIUM" ? RiskLevel.Medium : RiskLevel.Low,
    }));

    // Merge pattern-detected risks with AI-detected risks (avoid duplicates)
    const allRisks = [...patternRisks];
    aiRisks.forEach((aiRisk: RiskPoint) => {
      const isDuplicate = patternRisks.some(
        (pr) => pr.title.toLowerCase().includes(aiRisk.title.toLowerCase().split(" ")[0])
      );
      if (!isDuplicate) {
        allRisks.push(aiRisk);
      }
    });

    return {
      summary: parsed.summary || "Analysis completed",
      score: Math.min(100, Math.max(0, parsed.safetyScore || 50)),
      risks: allRisks,
      questions: parsed.questions || parsed.suggestions || [],
    };
  } catch (error) {
    console.error("Failed to parse analysis response:", error);
    // Return basic analysis with pattern-detected risks
    return {
      summary: "Contract analysis completed. Please review the detected risks.",
      score: patternRisks.length > 0 ? Math.max(40, 80 - patternRisks.length * 10) : 70,
      risks: patternRisks,
      questions: ["Please review all terms carefully before signing."],
    };
  }
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
 * Analyze a contract document
 *
 * @param contractText - The full text of the contract
 * @param userContext - Optional context about the user (business type, concerns)
 * @param useRAG - Whether to use RAG for legal context (default: true)
 * @param lang - Language for error messages (default: "ko")
 * @returns Structured analysis result
 */
export const analyzeContract = async (
  contractText: string,
  userContext?: string,
  useRAG: boolean = true,
  lang: "en" | "ko" = "ko"
): Promise<ContractAnalysis> => {
  // Step 0: Validate input
  validateContractText(contractText, lang);

  // Step 1: Pattern-based pre-analysis
  const patternRisks = detectPatternRisks(contractText);

  // Step 2: AI analysis with optional RAG
  const prompt = getAnalysisPrompt(contractText, userContext);

  let response: { text: string; citations: string[] };

  try {
    if (useRAG) {
      response = await generateWithRAG(prompt, undefined, MODELS.FLASH);
    } else {
      const text = await generateContent(prompt, MODELS.FLASH_PREVIEW);
      response = { text, citations: [] };
    }
  } catch (error) {
    handleApiError(error, lang);
  }

  // Step 3: Parse and combine results
  const analysis = parseAnalysisResponse(response.text, patternRisks);

  return analysis;
};

/**
 * Get negotiation script for a specific risk item
 */
export const getNegotiationScript = async (
  riskItem: RiskPoint,
  contractContext: string
): Promise<string> => {
  const prompt = `You are a negotiation coach helping a freelancer/small business owner.

Based on this contract risk:
- Title: ${riskItem.title}
- Description: ${riskItem.description}
- Risk Level: ${riskItem.level}

Contract context: ${contractContext.substring(0, 500)}...

Provide a polite but firm negotiation script in Korean that the user can use to discuss this issue with the other party. Include:
1. Opening statement
2. Specific request for change
3. Reasonable alternative suggestion
4. Professional closing

Keep it under 200 words.`;

  const response = await generateContent(prompt, MODELS.FLASH_PREVIEW);
  return response;
};

export default {
  analyzeContract,
  getNegotiationScript,
  detectPatternRisks,
};
