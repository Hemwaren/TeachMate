import { NextResponse } from "next/server";
import { runGeminiJson } from "@/lib/ai/gemini";

export const runtime = "nodejs";

type QuizPayload = {
  subject: string;
  topic: string;
  difficulty?: "easy" | "medium" | "hard";
  numQuestions?: number;
  questionType?: "mcq" | "short";
  language?: string;
};

type Question =
  | { type: "mcq"; question: string; options: string[]; answer: string }
  | { type: "short"; question: string; answer: string };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<QuizPayload>;

    const subject = (body.subject ?? "").trim();
    const topic = (body.topic ?? "").trim();
    const difficulty = (body.difficulty ?? "medium") as NonNullable<QuizPayload["difficulty"]>;
    const numQuestions = Number(body.numQuestions ?? 5);
    const questionType = (body.questionType ?? "mcq") as NonNullable<QuizPayload["questionType"]>;
    const language = (body.language ?? "English").trim();

    if (!subject || !topic) {
      return NextResponse.json(
        { error: "Missing required fields: subject, topic" },
        { status: 400 }
      );
    }

    const prompt = `
You are a professional teacher creating quizzes for rural ASEAN schools.

Create a ${difficulty} quiz in ${language}.

Subject: ${subject}
Topic: ${topic}
Number of questions: ${numQuestions}
Question type: ${questionType}

Return ONLY valid JSON. No markdown. No explanation.
Return EXACTLY a JSON ARRAY (not an object).

Each item format:

If type = "mcq":
{
  "type": "mcq",
  "question": "string",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A. ..."
}

If type = "short":
{
  "type": "short",
  "question": "string",
  "answer": "string"
}

IMPORTANT:
- Exactly ${numQuestions} items
- For MCQ: exactly 4 options
- Answer must match one option label exactly (e.g., "A. ...")
`;

    const questions = await runGeminiJson<Question[]>(prompt, {
      expectJson: "array",
      debugLabel: "Quiz+Worksheet",
    });

    return NextResponse.json(questions);
  } catch (err: any) {
    const status = err?.status === 429 ? 429 : 500;
    return NextResponse.json(
      { error: err?.message ?? "Quiz route failed" },
      { status }
    );
  }
}