/**
 * Gemini AI Client Service
 *
 * Provides centralized access to Google Gemini API
 * with File Search (RAG) capabilities for legal document analysis.
 */

import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }
  return new GoogleGenAI({ apiKey });
};

// Model configurations
export const MODELS = {
  FLASH: "gemini-2.5-flash",
  PRO: "gemini-2.5-pro",
  FLASH_PREVIEW: "gemini-3-flash-preview",
} as const;

// Legal corpus store ID (will be set after creation)
let legalCorpusStoreId: string | null = null;

/**
 * Set the legal corpus store ID after initialization
 */
export const setLegalCorpusStoreId = (storeId: string): void => {
  legalCorpusStoreId = storeId;
};

/**
 * Get the legal corpus store ID
 */
export const getLegalCorpusStoreId = (): string | null => {
  return legalCorpusStoreId;
};

/**
 * Simple text generation without RAG
 */
export const generateContent = async (
  prompt: string,
  model: string = MODELS.FLASH_PREVIEW
): Promise<string> => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "";
};

/**
 * Chat session for multi-turn conversations
 */
export const createChatSession = (
  systemInstruction: string,
  model: string = MODELS.FLASH_PREVIEW
) => {
  const ai = getGeminiClient();
  return ai.chats.create({
    model,
    config: { systemInstruction },
    history: [],
  });
};

/**
 * Generate content with File Search (RAG) enabled
 * Uses the legal corpus for context-aware responses
 */
export const generateWithRAG = async (
  prompt: string,
  storeId?: string,
  model: string = MODELS.FLASH
): Promise<{ text: string; citations: string[] }> => {
  const ai = getGeminiClient();
  const targetStoreId = storeId || legalCorpusStoreId;

  if (!targetStoreId) {
    // Fall back to regular generation if no store configured
    const text = await generateContent(prompt, model);
    return { text, citations: [] };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              storeId: targetStoreId,
            },
          },
        ],
      } as Record<string, unknown>,
    });

    // Extract citations from grounding metadata if available
    const citations: string[] = [];
    // Note: Citation extraction depends on response structure
    // This is a placeholder for actual citation parsing

    return {
      text: response.text || "",
      citations,
    };
  } catch (error) {
    console.error("RAG generation failed, falling back to regular generation:", error);
    const text = await generateContent(prompt, model);
    return { text, citations: [] };
  }
};

export default {
  getGeminiClient,
  generateContent,
  createChatSession,
  generateWithRAG,
  setLegalCorpusStoreId,
  getLegalCorpusStoreId,
  MODELS,
};
