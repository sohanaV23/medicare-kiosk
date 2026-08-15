import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
    });
  }
  return aiClient;
}

/**
 * Executes a Gemini generateContent request with automatic retry and model fallback.
 * If 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED or overloaded errors occur, it automatically
 * retries using a sequence of extremely stable and high-throughput Gemini models.
 */
export async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3) {
  let currentModel = params.model || "gemini-3.6-flash";
  // Normalize legacy model names if any are requested
  if (currentModel.startsWith("gemini-2.5") || currentModel.startsWith("gemini-1.5") || currentModel.startsWith("gemini-2.0")) {
    currentModel = "gemini-3.6-flash";
  }
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err.message || err || JSON.stringify(err));
      console.warn(`[Gemini Attempt ${attempt + 1} with ${currentModel} error]:`, errMsg);

      if (currentModel === "gemini-3.6-flash") {
        currentModel = "gemini-3.5-flash";
      } else {
        currentModel = "gemini-3.6-flash";
      }

      if (attempt < retries) {
        const delay = (attempt + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
