import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// List of models to try in order of preference
const MODELS = ["gemini-2.5-flash-lite", "gemini-1.5-pro", "gemini-2.5-flash"];

async function runWithRetry(prompt: string, attempt = 0): Promise<string> {
  const modelName = MODELS[attempt % MODELS.length];
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    // If it's a 503 (Overloaded) and we haven't tried too many times, retry
    if (error.status === 503 || error.message?.includes("503")) {
      if (attempt < 3) {
        console.log(`⚠️ Model ${modelName} busy. Retrying with next model (Attempt ${attempt + 1})...`);
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1500));
        return runWithRetry(prompt, attempt + 1);
      }
    }
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { plan, mode, gradeLevel } = await req.json();

    const prompt = `
      You are a Pedagogical Expert. Refract the following Lesson Plan for ${mode} students (${gradeLevel}).
      
      RULES:
      - If "Remedial": Simplify terminology, add scaffolding hints, and slow the pace.
      - If "Enrichment": Add high-order thinking challenges and advanced real-world links.

      PLAN DATA:
      ${JSON.stringify(plan)}

      Return ONLY a JSON object. No markdown. No backticks.
      Structure:
      {
        "title": "Modified Title",
        "overview": "Modified Overview",
        "learningObjectives": ["obj1", "obj2"],
        "materials": ["mat1"],
        "lessonFlow": [{"phase": "string", "step": "string", "teacherAction": "string", "timeMin": 10}],
        "homework": "Modified homework",
        "differentiationTip": "One core strategy used here"
      }
    `;

    const text = await runWithRetry(prompt);
    
    // Clean JSON string
    const jsonClean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return NextResponse.json(JSON.parse(jsonClean));
  } catch (error: any) {
    console.error("❌ Differentiation API Final Error:", error);
    return NextResponse.json(
      { error: "AI is currently at capacity. Please try again in 30 seconds." }, 
      { status: 503 }
    );
  }
}