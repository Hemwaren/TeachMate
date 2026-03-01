"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Question = {
  question: string;
  options?: string[];
  answer: string;
  type: "mcq" | "short";
};

export default function QuizGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState<"mcq" | "short">("mcq");

  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!topic.trim()) {
      toast.error("Please enter a topic.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          subject,
          difficulty,
          numQuestions,
          questionType,
          language: "English",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate quiz");
      }

      setQuestions(data);
      setShowAnswers(false);
      toast.success("Quiz generated!");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Quiz Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form
          onSubmit={handleGenerate}
          className="bg-white border rounded-xl p-6 shadow-sm mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option>Mathematics</option>
                <option>Science</option>
                <option>English</option>
                <option>History</option>
                <option>Geography</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis"
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={(e) =>
                  setQuestionType(e.target.value as "mcq" | "short")
                }
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="mcq">Multiple Choice</option>
                <option value="short">Short Answer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
        </form>

        {questions.length > 0 && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Generated Quiz
              </h2>

              <button
                onClick={() => setShowAnswers((v) => !v)}
                className="px-3 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-medium"
              >
                {showAnswers ? "Hide Answers" : "Show Answers"}
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <p className="font-medium text-gray-900">
                    {idx + 1}. {q.question}
                  </p>

                  {q.type === "mcq" && q.options && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="text-sm text-gray-700">
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "short" && (
                    <div className="mt-3 text-sm text-gray-500">
                      Answer space: ________________________________
                    </div>
                  )}

                  {showAnswers && (
                    <div className="mt-3 text-sm bg-green-50 border border-green-200 rounded p-2 text-green-900">
                      <b>Answer:</b> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}