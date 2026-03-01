// src/app/interventions/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  name: string;
};

type Score = {
  id: string;
  student_id: string;
  topic: string;
  score: number;
  total: number;
  created_at: string;
};

type WeakTopic = { topic: string; pct: number };

type InterventionOutput = {
  riskLevel: "low" | "medium" | "high";
  summary: string;
  likelyGaps: string[];
  interventionsThisWeek: string[];
  quickCheckQuestions: string[];
  parentNote?: string;
};

export default function InterventionsPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<InterventionOutput | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast.error("Please login first.");
        window.location.href = "/login";
        return;
      }

      const user = data.user;

      const { data: stu, error: stuErr } = await supabase
        .from("students")
        .select("id,name")
        .eq("teacher_id", user.id)
        .order("name");

      if (stuErr) console.error(stuErr);

      const { data: sc, error: scErr } = await supabase
        .from("scores")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (scErr) console.error(scErr);

      if (!mounted) return;
      setStudents((stu as Student[]) ?? []);
      setScores((sc as Score[]) ?? []);
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoresByStudent = useMemo(() => {
    const map = new Map<string, Score[]>();
    for (const s of scores) {
      const arr = map.get(s.student_id) ?? [];
      arr.push(s);
      map.set(s.student_id, arr);
    }
    return map;
  }, [scores]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const recentScores = useMemo(() => {
    if (!selectedStudentId) return [];
    return (scoresByStudent.get(selectedStudentId) ?? []).slice(0, 8);
  }, [scoresByStudent, selectedStudentId]);

  function avgPercent(arr: Score[]) {
    if (arr.length === 0) return 0;
    const pct =
      arr.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / arr.length;
    return Math.round(pct);
  }

  async function generateIntervention() {
    if (!selectedStudentId) {
      toast.error("Select a student first.");
      return;
    }

    const avg = avgPercent(recentScores);

    const weakTopics: WeakTopic[] = recentScores
      .map((s) => ({ topic: s.topic, pct: (s.score / s.total) * 100 }))
      .sort((a, b) => a.pct - b.pct)
      .filter((x) => x.pct < 50)
      .slice(0, 6);

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        studentName: selectedStudent?.name ?? "Student",
        average: avg,
        weakTopics,
        language: "English",
        teacherNotes: "", // optional
      };

      const res = await fetch("/api/ai/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API failed: ${res.status} ${errText}`);
      }

      const data = (await res.json()) as InterventionOutput;
      setResult(data);
      toast.success("Intervention generated!");
    } catch (err) {
      console.error(err);
      toast.error("Intervention failed. Check terminal/logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Interventions</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Select Student
          </label>

          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">-- choose student --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {selectedStudentId && (
            <div className="text-sm text-gray-600">
              Recent average:{" "}
              <span className="font-semibold text-gray-900">
                {avgPercent(recentScores)}%
              </span>
              {recentScores.length === 0 && (
                <span className="ml-2 text-gray-500">(no scores yet)</span>
              )}
            </div>
          )}

          <button
            onClick={generateIntervention}
            disabled={loading || !selectedStudentId}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Generating..." : "Generate Intervention Suggestion"}
          </button>
        </div>

        {result && (
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Suggestion</h2>
              <span className="text-xs px-2 py-1 rounded-full border text-gray-700">
                Risk: <b className="uppercase">{result.riskLevel}</b>
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Summary</h3>
              <p className="text-sm text-gray-800 leading-6">{result.summary}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Likely Gaps</h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {result.likelyGaps?.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Interventions This Week
              </h3>
              <ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
                {result.interventionsThisWeek?.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Quick Check Questions
              </h3>
              <ol className="list-decimal pl-5 text-sm text-gray-800 space-y-1">
                {result.quickCheckQuestions?.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>

            {result.parentNote && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Parent Note</h3>
                <p className="text-sm text-gray-800 leading-6">
                  {result.parentNote}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}