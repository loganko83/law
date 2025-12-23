import json
from typing import Optional, List
from google import genai
from app.core.config import settings
from app.services.risk_patterns import (
    detect_pattern_risks,
    calculate_pattern_score,
    merge_risks,
    DetectedRisk,
    RiskLevel
)


async def analyze_contract_text(
    contract_text: str,
    user_context: Optional[str] = None,
    lang: str = "ko"
) -> dict:
    """
    Analyze contract text using pattern matching and Gemini AI.

    Combines rule-based pattern detection with AI analysis for
    comprehensive contract risk assessment.

    Returns:
        dict with keys: score, summary, risks, questions, model
    """
    # Step 1: Pattern-based pre-analysis
    pattern_risks = detect_pattern_risks(contract_text, lang)
    pattern_score = calculate_pattern_score(pattern_risks)

    # Initialize Gemini client
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Build system prompt
    system_prompt = """You are a Korean contract law expert AI assistant.
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
            "id": "<unique id>",
            "title": "<risk title>",
            "description": "<detailed explanation>",
            "level": "<HIGH|MEDIUM|LOW>",
            "suggestion": "<what to negotiate or ask about>"
        }
    ],
    "questions": [
        "<question to ask the counterparty>"
    ]
}
"""

    # Build user prompt
    user_prompt = f"""Please analyze the following contract:

{contract_text}

"""

    if user_context:
        user_prompt += f"""

USER CONTEXT (use this to personalize the analysis):
{user_context}
"""

    user_prompt += """

Provide your analysis in the JSON format specified. Focus on:
1. Payment terms (late payment, excessive penalties)
2. Termination clauses (unilateral termination rights)
3. Liability clauses (unlimited liability, indemnification)
4. Intellectual property rights
5. Non-compete/exclusivity clauses
6. Scope of work (vague deliverables, unlimited revisions)

Return ONLY the JSON object, no additional text.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=user_prompt,
            config={
                "system_instruction": system_prompt,
                "temperature": 0.3,
                "max_output_tokens": 4096
            }
        )

        # Parse response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        result = json.loads(response_text)

        # Ensure required fields
        result.setdefault("score", 50)
        result.setdefault("summary", "Analysis completed.")
        result.setdefault("risks", [])
        result.setdefault("questions", [])

        # Step 2: Convert AI risks to DetectedRisk format
        ai_risks: List[DetectedRisk] = []
        for idx, risk in enumerate(result.get("risks", [])):
            level = RiskLevel.HIGH if risk.get("level") == "HIGH" else (
                RiskLevel.MEDIUM if risk.get("level") == "MEDIUM" else RiskLevel.LOW
            )
            ai_risks.append(DetectedRisk(
                id=risk.get("id", f"ai_{idx}"),
                title=risk.get("title", "Unknown Risk"),
                description=risk.get("description", ""),
                level=level
            ))

        # Step 3: Merge pattern and AI risks
        all_risks = merge_risks(pattern_risks, ai_risks)

        # Step 4: Calculate combined score (weighted average)
        ai_score = result.get("score", 50)
        combined_score = int((pattern_score * 0.3) + (ai_score * 0.7))

        # Convert back to dict format for response
        result["risks"] = [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "level": r.level.value,
                "matched_text": r.matched_text
            }
            for r in all_risks
        ]
        result["score"] = combined_score
        result["model"] = "gemini-2.0-flash-exp"
        result["pattern_risks_count"] = len(pattern_risks)

        return result

    except json.JSONDecodeError as e:
        # Return fallback response with pattern risks if JSON parsing fails
        return {
            "score": pattern_score,
            "summary": "AI analysis incomplete. Pattern-based risks detected.",
            "risks": [
                {
                    "id": r.id,
                    "title": r.title,
                    "description": r.description,
                    "level": r.level.value,
                    "matched_text": r.matched_text
                }
                for r in pattern_risks
            ],
            "questions": ["Could you provide more details about the contract terms?"],
            "model": "gemini-2.0-flash-exp",
            "pattern_risks_count": len(pattern_risks),
            "error": f"JSON parsing error: {str(e)}"
        }
    except Exception as e:
        # Return pattern risks even if AI fails
        return {
            "score": pattern_score if pattern_risks else 0,
            "summary": f"AI analysis failed: {str(e)}. Pattern-based analysis provided.",
            "risks": [
                {
                    "id": r.id,
                    "title": r.title,
                    "description": r.description,
                    "level": r.level.value,
                    "matched_text": r.matched_text
                }
                for r in pattern_risks
            ],
            "questions": [],
            "model": "gemini-2.0-flash-exp",
            "pattern_risks_count": len(pattern_risks),
            "error": str(e)
        }
