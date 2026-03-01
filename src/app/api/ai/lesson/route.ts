import { NextResponse } from "next/server";
import { runGeminiJson } from "@/lib/ai/gemini";

export const runtime = "nodejs";

type LessonPlan = {
  title: string;
  overview: string;
  learningObjectives: string[];
  materials: string[];
  lessonFlow: { step: string; timeMin: number }[];
  homework: string;
};

export async function POST(req: Request) {
  console.log("Lesson API hit");

  try {
    const body = await req.json();
    const { subject, topic, gradeLevel, durationMin, language, classSize } = body;

    if (!subject || !topic || !gradeLevel) {
      return NextResponse.json(
        { error: "Missing required fields: subject, topic, gradeLevel" },
        { status: 400 }
      );
    }

    const prompt = `
You are a professional teacher.

Create a structured lesson plan in ${language || "English"}.

Subject: ${subject}
Topic: ${topic}
Grade Level: ${gradeLevel}
Duration: ${durationMin || 60} minutes
Class Size: ${classSize || 30}

Return ONLY valid JSON.
No markdown.
No explanation.

{
  "title": "string",
  "overview": "string",
  "learningObjectives": ["string"],
  "materials": ["string"],
  "lessonFlow": [
    { "step": "string", "timeMin": 10 }
  ],
  "homework": "string"
}
`;

    const data = await runGeminiJson<LessonPlan>(prompt, {
      expectJson: "object",
      debugLabel: "Lesson",
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Lesson route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Lesson Gemini error" },
      { status: 500 }
    );
  }
}