// src/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

type GeminiRunOptions = {
  expectJson?: "object" | "array";
  debugLabel?: string;
};

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY in environment variables.");
  return key;
}

function extractJsonFromText(text: string, expect: "object" | "array") {
  const startChar = expect === "array" ? "[" : "{";
  const endChar = expect === "array" ? "]" : "}";

  const start = text.indexOf(startChar);
  const end = text.lastIndexOf(endChar);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Gemini did not return valid JSON ${expect}. Raw output: ${text.slice(0, 300)}...`
    );
  }

  return JSON.parse(text.slice(start, end + 1));
}

function isModelNotFoundError(err: any) {
  const msg = String(err?.message ?? err);
  return msg.includes("404") && (msg.includes("is not found") || msg.includes("not supported"));
}

function isQuotaError(err: any) {
  const msg = String(err?.message ?? err);
  return msg.includes("429") || msg.toLowerCase().includes("quota");
}

function getCandidateModels() {
  // ✅ Put working models first (same as lesson route)
  return [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ];
}

export async function runGeminiJson<T>(
  prompt: string,
  options: GeminiRunOptions = {}
): Promise<T> {
  const { expectJson = "object", debugLabel = "Gemini" } = options;

  const genAI = new GoogleGenerativeAI(getApiKey());
  const candidates = getCandidateModels();
  let lastErr: any = null;

  for (const modelName of candidates) {
    try {
      console.log(`🤖 [${debugLabel}] Trying model: ${modelName}`);

      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      console.log(`✅ [${debugLabel}] Model success: ${modelName}`);
      return extractJsonFromText(text, expectJson) as T;
    } catch (err: any) {
      lastErr = err;
      console.error(`❌ [${debugLabel}] Model failed: ${modelName}`, err?.message ?? err);

      // try next model if model name is wrong
      if (isModelNotFoundError(err)) continue;

      // quota hit → stop immediately (no point trying others if your tier blocks)
      if (isQuotaError(err)) break;

      break;
    }
  }

  throw new Error(
    `All Gemini model attempts failed. Last error: ${String(lastErr?.message ?? lastErr)}`
  );
}