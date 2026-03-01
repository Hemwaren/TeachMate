// src/app/students/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  name: string;
  created_at: string;
};

type Score = {
  id: string;
  student_id: string;
  topic: string;
  score: number;
  total: number;
  created_at: string;
};

export default function StudentsPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  const [newStudentName, setNewStudentName] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [scoreData, setScoreData] = useState({ topic: "", score: "", total: "" });

  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast.error("Please login first.");
        window.location.href = "/login";
        return;
      }

      await Promise.all([fetchStudents(), fetchScores()]);
      if (mounted) setReady(true);
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStudents() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("teacher_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load students");
      return;
    }

    setStudents(data ?? []);
  }

  async function fetchScores() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;

    const { data, error } = await supabase
      .from("scores")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to load scores");
      return;
    }

    setScores(data ?? []);
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        toast.error("Please login first.");
        window.location.href = "/login";
        return;
      }

      const { error } = await supabase
        .from("students")
        .insert([{ name: newStudentName.trim(), teacher_id: user.id }]);

      if (error) throw error;

      toast.success("Student added!");
      setNewStudentName("");
      await fetchStudents();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add student");
    } finally {
      setLoading(false);
    }
  }

  async function addScore(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error("Please select a student.");
      return;
    }

    const scoreNum = Number(scoreData.score);
    const totalNum = Number(scoreData.total);

    if (!scoreData.topic.trim() || Number.isNaN(scoreNum) || Number.isNaN(totalNum) || totalNum <= 0) {
      toast.error("Please fill valid score details.");
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        toast.error("Please login first.");
        window.location.href = "/login";
        return;
      }

      const { error } = await supabase.from("scores").insert([
        {
          student_id: selectedStudent,
          teacher_id: user.id,
          topic: scoreData.topic.trim(),
          score: scoreNum,
          total: totalNum,
        },
      ]);

      if (error) throw error;

      toast.success("Score added!");
      setScoreData({ topic: "", score: "", total: "" });
      await fetchScores();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add score");
    } finally {
      setLoading(false);
    }
  }

  const scoresByStudent = useMemo(() => {
    const map = new Map<string, Score[]>();
    for (const s of scores) {
      const arr = map.get(s.student_id) ?? [];
      arr.push(s);
      map.set(s.student_id, arr);
    }
    return map;
  }, [scores]);

  function getAverage(studentId: string) {
    const arr = scoresByStudent.get(studentId) ?? [];
    if (arr.length === 0) return 0;
    const pct = arr.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / arr.length;
    return Math.round(pct);
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Student Performance</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h2>
            <form onSubmit={addStudent} className="space-y-4">
              <input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Student name"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Student
              </button>
            </form>
          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Score</h2>
            <form onSubmit={addScore} className="space-y-4">
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <input
                value={scoreData.topic}
                onChange={(e) => setScoreData({ ...scoreData, topic: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Topic (e.g. Fractions)"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={scoreData.score}
                  onChange={(e) => setScoreData({ ...scoreData, score: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Score"
                  required
                />
                <input
                  type="number"
                  value={scoreData.total}
                  onChange={(e) => setScoreData({ ...scoreData, total: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Total"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add Score
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Student List</h2>
          </div>

          <div className="divide-y">
            {students.length === 0 && (
              <div className="p-6 text-center text-gray-500">No students yet.</div>
            )}

            {students.map((student) => {
              const avg = getAverage(student.id);
              const arr = scoresByStudent.get(student.id) ?? [];
              const isAtRisk = avg < 40 && arr.length >= 3;

              return (
                <div key={student.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{arr.length} quizzes recorded</div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{avg}%</div>
                      {isAtRisk && (
                        <div className="mt-1 inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                          At Risk
                        </div>
                      )}
                    </div>
                  </div>

                  {arr.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      {arr.slice(0, 3).map((s) => {
                        const pct = (s.score / s.total) * 100;
                        return (
                          <div key={s.id} className="bg-gray-100 rounded-lg px-3 py-2">
                            <div className="text-gray-600">{s.topic}</div>
                            <div className={`font-semibold ${pct < 40 ? "text-red-600" : "text-gray-900"}`}>
                              {s.score}/{s.total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}