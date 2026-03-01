"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type LessonPlan = {
  title: string;
  overview: string;
  learningObjectives: string[];
  materials: string[];
  lessonFlow: { step: string; timeMin: number }[];
  homework: string;
};

export default function LessonGeneratorPage() {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("Algebra");
  const [gradeLevel, setGradeLevel] = useState("Form 3");
  const [durationMin, setDurationMin] = useState(60);
  const [classSize, setClassSize] = useState(40);
  const [language, setLanguage] = useState("English");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LessonPlan | null>(null);

  async function generateLesson() {
    setLoading(true);

    try {
      const payload = {
        subject,
        topic,
        gradeLevel,
        durationMin,
        classSize,
        language,
      };

      const res = await fetch("/api/ai/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // ✅ handle rate limit
      if (res.status === 429) {
        const errText = await res.text();
        toast.error("Rate limited (429). Wait 30–60 seconds and try again.");
        throw new Error(`429: ${errText}`);
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API failed: ${res.status} ${errText}`);
      }

      const data = (await res.json()) as LessonPlan;
      setResult(data);
      toast.success("Lesson plan generated!");
    } catch (err) {
      console.error(err);
      toast.error("Lesson generation failed. Check terminal / console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Lesson Plan Generator</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-5">
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
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Algebra"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option>Form 1</option>
                <option>Form 2</option>
                <option>Form 3</option>
                <option>Form 4</option>
                <option>Form 5</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
                min={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Size
              </label>
              <input
                type="number"
                value={classSize}
                onChange={(e) => setClassSize(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option>English</option>
                <option>Malay</option>
                <option>Tamil</option>
                <option>Chinese</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateLesson}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Generating..." : "Generate Lesson Plan"}
          </button>
        </div>

        {result && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{result.title}</h2>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Overview</h3>
              <p className="text-sm text-gray-800 leading-6">{result.overview}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Learning Objectives</h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {result.learningObjectives?.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Materials</h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {result.materials?.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Lesson Flow</h3>
              <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
                {result.lessonFlow?.map((x, i) => (
                  <li key={i}>
                    <b>{x.timeMin} min</b> — {x.step}
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Homework</h3>
              <p className="text-sm text-gray-800 leading-6">{result.homework}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}