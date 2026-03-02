import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Using the key that worked in your previous logs
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || "");

// Updated model list based on what worked in your logs (gemini-2.5-flash)
const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];

async function runWithRetry(prompt: string, attempt = 0): Promise<string> {
  const modelName = MODELS[attempt % MODELS.length];
  console.log(`🤖 [Hooks API] Attempting with model: ${modelName}`);
  
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    // If the model is not found (404) or busy (503/429), try the next one
    if (attempt < MODELS.length) {
      console.log(`⚠️ [Hooks API] Model ${modelName} failed (${error.status || 'Error'}). Trying next...`);
      // Short delay for rate limits, none for 404s
      if (error.status !== 404) await new Promise(resolve => setTimeout(resolve, 1000));
      return runWithRetry(prompt, attempt + 1);
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { topic, subject } = await req.json();

    if (!topic || !subject) {
      return NextResponse.json({ error: "Context Missing" }, { status: 400 });
    }

    const prompt = `
      Generate 3 unique, high-engagement opening "hooks" for a lesson.
      Topic: ${topic}
      Subject: ${subject}

      Return ONLY a JSON object. No markdown.
      {
        "hooks": [
          { "type": "Provocative", "content": "Fact/Question" },
          { "type": "Quick-Fire", "content": "2-min Activity" },
          { "type": "Real-World", "content": "Modern Connection" }
        ]
      }
    `;

    const rawText = await runWithRetry(prompt);
    
    // Extremely robust JSON cleaning
    const jsonClean = rawText
      .replace(/```json/gi, "")
      .replace(/```/gi, "")
      .trim();
    
    return NextResponse.json(JSON.parse(jsonClean));
  } catch (error: any) {
    console.error("❌ Hooks API Final Error:", error);
    return NextResponse.json(
      { error: "AI Synthesis failed. All models reported busy or unavailable." }, 
      { status: 500 }
    );
  }
}