import { NextResponse } from "next/server";
import { runGeminiJson } from "@/lib/ai/gemini";

export const runtime = "nodejs";

type WeakTopic = { topic: string; pct: number };

type InterventionOutput = {
  riskLevel: "low" | "medium" | "high";
  summary: string;
  likelyGaps: string[];
  interventionsThisWeek: string[];
  quickCheckQuestions: string[];
  parentNote?: string;
};

export async function POST(req: Request) {
  console.log("Intervention API hit");

  try {
    const body = await req.json();
    const { studentName, average, weakTopics, language, teacherNotes } = body;

    if (!studentName || typeof average !== "number" || !Array.isArray(weakTopics)) {
      return NextResponse.json(
        { error: "Missing required fields: studentName, average, weakTopics[]" },
        { status: 400 }
      );
    }

    const lang = language || "English";
    const wt = (weakTopics as WeakTopic[])
      .slice(0, 6)
      .map((w) => `- ${w.topic}: ${Math.round(w.pct)}%`)
      .join("\n");

    const prompt = `
You are an experienced school teacher helping another teacher plan interventions.

Return ONLY valid JSON (no markdown, no explanation).

Language: ${lang}

Student name: ${studentName}
Average score (percentage): ${average}%

Weak topics (lowest first):
${wt || "- None provided"}

Teacher notes (optional):
${teacherNotes || "(none)"}

STRICT JSON shape:

{
  "riskLevel": "low" | "medium" | "high",
  "summary": "string",
  "likelyGaps": ["string"],
  "interventionsThisWeek": ["string"],
  "quickCheckQuestions": ["string"],
  "parentNote": "string (optional)"
}

Rules:
- Keep each intervention action short and practical.
- quickCheckQuestions should be 3–5 short questions.
- likelyGaps should be 3–6 items.
- interventionsThisWeek should be 4–6 items.
`;

    const data = await runGeminiJson<InterventionOutput>(prompt, {
      expectJson: "object",
      debugLabel: "Intervention",
    });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Intervention route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Gemini error" },
      { status: 500 }
    );
  }
}