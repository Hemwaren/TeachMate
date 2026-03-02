import { NextResponse } from "next/server";
import { runGeminiJson } from "@/lib/ai/gemini";

export const runtime = "nodejs";

// High-fidelity type definition for the synthesized blueprint
type LessonPlan = {
  title: string;
  overview: string;
  learningObjectives: string[];
  materials: string[];
  lessonFlow: { 
    phase: "Engage" | "Explore" | "Explain" | "Elaborate" | "Evaluate";
    step: string; 
    timeMin: number;
    teacherAction: string;
  }[];
  homework: string;
  differentiationTip: string;
};

export async function POST(req: Request) {
  console.log("🚀 [TeachMate AI] Synthesizing Lesson Blueprint...");

  try {
    const body = await req.json();
    const { subject, topic, gradeLevel, durationMin, language, classSize } = body;

    // Validation
    if (!subject || !topic || !gradeLevel) {
      return NextResponse.json(
        { error: "Protocol Error: Missing subject, topic, or grade level." },
        { status: 400 }
      );
    }

    const requestedDuration = durationMin || 60;

    const prompt = `
      You are an award-winning Instructional Designer and Pedagogical Expert. 
      Your task is to synthesize a high-impact, professional lesson plan blueprint.

      [CONTEXT]
      Subject: ${subject}
      Topic: ${topic}
      Target Grade: ${gradeLevel}
      Time Allocation: ${requestedDuration} minutes
      Class Dynamics: ${classSize || 30} students
      Output Language: ${language || "English"}

      [PEDAGOGICAL REQUIREMENTS]
      1. OBJECTIVES: Use Bloom's Taxonomy. Ensure objectives are SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
      2. FRAMEWORK: Use the 5E Instructional Model for the lessonFlow:
         - Engage: A "Hook" to capture interest.
         - Explore: Hands-on discovery.
         - Explain: Direct instruction/Concept synthesis.
         - Elaborate: Application of knowledge.
         - Evaluate: Formal or informal assessment.
      3. MATHEMATICAL PRECISION: The sum of all "timeMin" in "lessonFlow" MUST equal exactly ${requestedDuration} minutes.
      4. TONE: Professional, encouraging, and highly structured.

      [STRICT OUTPUT FORMAT]
      Return ONLY valid JSON. No markdown formatting, no preamble.
      {
        "title": "A creative, catchy title for the lesson",
        "overview": "A 2-3 sentence inspiring summary of the lesson's core mission",
        "learningObjectives": ["Objective starting with a measurable verb", "Next objective"],
        "materials": ["Specific resource 1", "Specific resource 2"],
        "lessonFlow": [
          { 
            "phase": "Engage",
            "step": "Clear title for this activity",
            "teacherAction": "What the teacher specifically does and says",
            "timeMin": 5 
          }
        ],
        "homework": "A meaningful task that promotes critical thinking, not busy work",
        "differentiationTip": "One specific way to support struggling learners for this exact topic"
      }
    `;

    // Execute with high quality parameters
    const data = await runGeminiJson<LessonPlan>(prompt, {
      expectJson: "object",
      debugLabel: "Lesson_Architect_v2",
    });

    // Final logical check on time (Fallback logic)
    const totalGeneratedTime = data.lessonFlow.reduce((acc, curr) => acc + curr.timeMin, 0);
    console.log(`📊 [Synthesis Report] Requested: ${requestedDuration}m | Generated: ${totalGeneratedTime}m`);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("❌ [API ERROR]:", err);
    return NextResponse.json(
      { error: err?.message ?? "The AI Brain encountered a pedagogical conflict." },
      { status: 500 }
    );
  }
}