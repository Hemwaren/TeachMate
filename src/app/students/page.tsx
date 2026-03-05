// src/app/students/page.tsx
"use client";

import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
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
  useTheme();
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

    if (
      !scoreData.topic.trim() ||
      Number.isNaN(scoreNum) ||
      Number.isNaN(totalNum) ||
      totalNum <= 0
    ) {
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
    const pct =
      arr.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / arr.length;
    return Math.round(pct);
  }

  function riskLevel(avg: number, attempts: number) {
    if (attempts < 3) return { label: "Not enough data", tone: "neutral" as const };
    if (avg < 40) return { label: "High Risk", tone: "high" as const };
    if (avg < 70) return { label: "Medium", tone: "med" as const };
    return { label: "Low", tone: "low" as const };
  }

  const overview = useMemo(() => {
    const totalStudents = students.length;

    const avgs = students.map((s) => ({
      id: s.id,
      name: s.name,
      avg: getAverage(s.id),
      attempts: (scoresByStudent.get(s.id) ?? []).length,
    }));

    const valid = avgs.filter((x) => x.attempts > 0);
    const classAvg =
      valid.length === 0
        ? 0
        : Math.round(valid.reduce((a, b) => a + b.avg, 0) / valid.length);

    const atRiskCount = avgs.filter((x) => x.attempts >= 3 && x.avg < 40).length;

    const topPerformer =
      valid.length === 0 ? null : valid.slice().sort((a, b) => b.avg - a.avg)[0];

    const topicMap = new Map<string, { sum: number; n: number }>();
    for (const s of scores) {
      const key = s.topic.trim();
      const pct = (s.score / s.total) * 100;
      const cur = topicMap.get(key) ?? { sum: 0, n: 0 };
      cur.sum += pct;
      cur.n += 1;
      topicMap.set(key, cur);
    }
    const topicAverages = Array.from(topicMap.entries())
      .map(([topic, v]) => ({ topic, avg: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => a.avg - b.avg);

    return { totalStudents, classAvg, atRiskCount, topPerformer, topicAverages };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, scores, scoresByStudent]);

  const pillClass = (tone: "neutral" | "high" | "med" | "low") => {
    if (tone === "high")
      return "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20";
    if (tone === "med")
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20";
    if (tone === "low")
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    return "bg-gray-500/10 text-gray-600 dark:text-white/50 border border-gray-500/15";
  };

  const IconBubble = ({
    emoji,
    tone,
  }: {
    emoji: string;
    tone: "navy" | "cyan" | "violet" | "emerald";
  }) => {
    const cls =
      tone === "navy"
        ? "bg-[#003366] dark:bg-[#6200EE]"
        : tone === "cyan"
          ? "bg-[#0EA5E9] dark:bg-[#BB86FC]"
          : tone === "violet"
            ? "bg-violet-600"
            : "bg-emerald-600";
    return (
      <div className={`w-10 h-10 rounded-2xl ${cls} flex items-center justify-center shadow-lg`}>
        <span className="text-white text-lg leading-none">{emoji}</span>
      </div>
    );
  };

  const CardStat = ({
    emoji,
    label,
    value,
    sub,
  }: {
    emoji: string;
    label: string;
    value: string;
    sub?: string;
  }) => (
    <div className="tm-card p-6 bg-white/90 dark:bg-[#1E1E24] border border-white/40 dark:border-white/10 shadow-2xl rounded-[2rem]">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003366]/60 dark:text-white/40">
          {label}
        </div>
        <div className="text-xl opacity-80">{emoji}</div>
      </div>
      <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white tracking-tight">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs font-bold text-gray-500 dark:text-white/40">
          {sub}
        </div>
      ) : null}
    </div>
  );

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
        <div className="w-24 h-24 rounded-full border-4 border-black/10 dark:border-white/10 border-t-black/40 dark:border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700 bg-background">
      {/* Background FX (match quiz-generator style) */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7] to-[#0f5ebb] overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40" />
      </div>
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]" />

      <Header links={[{ href: "/dashboard", label: "Dashboard" }]} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-20 space-y-8">
        {/* Page Header */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 drop-shadow-md tracking-tight">
                Student <span className="opacity-70">Performance</span>
              </h1>
              <p className="text-white/60 font-medium text-sm tracking-wide">
                Track scores, spot at-risk learners, and identify weak topics fast.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center justify-center rounded-2xl px-5 py-3 bg-white/10 text-white/70 border border-white/15 hover:bg-white/15 transition font-black text-[10px] uppercase tracking-[0.2em]"
            >
              ← Back
            </Link>
          </div>
        </section>

        {/* Overview Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <CardStat emoji="👩‍🎓" label="Total Students" value={`${overview.totalStudents}`} sub="Your class list" />
          <CardStat emoji="📈" label="Class Average" value={`${overview.classAvg}%`} sub="Across students w/ scores" />
          <CardStat emoji="⚠️" label="At Risk" value={`${overview.atRiskCount}`} sub="Avg < 40% & ≥ 3 scores" />
          <CardStat
            emoji="🏆"
            label="Top Performer"
            value={overview.topPerformer ? `${overview.topPerformer.avg}%` : "—"}
            sub={overview.topPerformer ? overview.topPerformer.name : "No scores yet"}
          />
        </section>

        {/* Forms */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Student */}
          <div className="tm-card p-8 bg-white/90 backdrop-blur-xl dark:bg-[#1E1E24] shadow-2xl border-white/40 dark:border-white/10 rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-6">
              <IconBubble emoji="➕" tone="navy" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003366]/60 dark:text-white/40">
                  Class Roster
                </p>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Add New Student
                </h2>
              </div>
            </div>

            <form onSubmit={addStudent} className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
                Student Name
              </label>
              <input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                placeholder="e.g. Ali / Mei / Siti"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-5 bg-[#003366] dark:bg-[#6200EE] text-white font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Student"}
              </button>
            </form>
          </div>

          {/* Add Score */}
          <div className="tm-card p-8 bg-white/90 backdrop-blur-xl dark:bg-[#1E1E24] shadow-2xl border-white/40 dark:border-white/10 rounded-[2.5rem]">
            <div className="flex items-center gap-3 mb-6">
              <IconBubble emoji="📝" tone="cyan" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003366]/60 dark:text-white/40">
                  Assessments
                </p>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Add Score
                </h2>
              </div>
            </div>

            <form onSubmit={addScore} className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
                Student
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white font-bold appearance-none outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
                Topic
              </label>
              <input
                value={scoreData.topic}
                onChange={(e) => setScoreData({ ...scoreData, topic: e.target.value })}
                className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                placeholder="e.g. Fractions / Algebra"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
                    Score
                  </label>
                  <input
                    type="number"
                    value={scoreData.score}
                    onChange={(e) => setScoreData({ ...scoreData, score: e.target.value })}
                    className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    placeholder="e.g. 8"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
                    Total
                  </label>
                  <input
                    type="number"
                    value={scoreData.total}
                    onChange={(e) => setScoreData({ ...scoreData, total: e.target.value })}
                    className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    placeholder="e.g. 10"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-5 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : "Add Score"}
              </button>
            </form>
          </div>
        </section>

        {/* Topic Performance */}
        <section className="tm-card p-8 bg-white/10 backdrop-blur-xl border-white/20 rounded-[2.5rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4 underline underline-offset-8">
            Topic Performance (Lowest → Highest)
          </h3>

          {overview.topicAverages.length === 0 ? (
            <p className="text-white/40 text-sm font-medium">
              No topic data yet — add a few scores to see weak areas.
            </p>
          ) : (
            <div className="space-y-3">
              {overview.topicAverages.slice(0, 8).map((t) => (
                <div key={t.topic} className="flex items-center gap-4">
                  <div className="w-40 max-w-[45%] truncate text-white/70 text-sm font-bold">
                    {t.topic}
                    <span className="text-white/30 font-black text-[10px] ml-2 uppercase tracking-widest">
                      ({t.n})
                    </span>
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#BB86FC] to-[#0EA5E9]"
                      style={{ width: `${Math.min(100, Math.max(0, t.avg))}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-white font-black">
                    {t.avg}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Student List */}
        <section className="tm-card bg-white/90 dark:bg-[#1E1E24] shadow-2xl overflow-hidden border-white/40 dark:border-white/10 rounded-[2.5rem]">
          <div className="px-8 py-6 border-b border-black/5 dark:border-white/5">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Student List
            </h2>
            <p className="text-sm font-bold text-gray-500 dark:text-white/40 mt-1">
              Quick view of averages + latest topic scores.
            </p>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/5">
            {students.length === 0 && (
              <div className="p-10 text-center text-gray-500 dark:text-white/40 font-bold">
                No students yet.
              </div>
            )}

            {students.map((student) => {
              const avg = getAverage(student.id);
              const arr = scoresByStudent.get(student.id) ?? [];
              const risk = riskLevel(avg, arr.length);

              return (
                <div
                  key={student.id}
                  className="p-8 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-gray-900 dark:text-white text-lg">
                        {student.name}
                      </div>
                      <div className="text-sm font-bold text-gray-500 dark:text-white/40">
                        {arr.length} quiz record{arr.length === 1 ? "" : "s"}
                      </div>

                      <div className="mt-2 inline-flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pillClass(
                            risk.tone
                          )}`}
                        >
                          {risk.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-black text-gray-900 dark:text-white">
                        {arr.length > 0 ? `${avg}%` : "—"}
                      </div>
                      <div className="text-xs font-bold text-gray-500 dark:text-white/40">
                        Average score
                      </div>
                    </div>
                  </div>

                  {arr.length > 0 && (
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {arr.slice(0, 3).map((s) => {
                        const pct = (s.score / s.total) * 100;
                        const bad = pct < 40;
                        const mid = pct >= 40 && pct < 70;

                        const tone =
                          bad
                            ? "from-red-600 to-red-500"
                            : mid
                              ? "from-amber-600 to-amber-500"
                              : "from-emerald-600 to-emerald-500";

                        return (
                          <div
                            key={s.id}
                            className="rounded-2xl p-4 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/10"
                          >
                            <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/40">
                              {s.topic}
                            </div>

                            <div className="mt-2 flex items-end justify-between">
                              <div className="text-lg font-black text-gray-900 dark:text-white">
                                {s.score}/{s.total}
                              </div>
                              <div className="text-xs font-black text-gray-500 dark:text-white/40">
                                {Math.round(pct)}%
                              </div>
                            </div>

                            <div className="mt-3 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${tone}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
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
        </section>

        {/* Back link for mobile */}
        <div className="sm:hidden">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full rounded-2xl px-5 py-4 bg-white/10 text-white/70 border border-white/15 hover:bg-white/15 transition font-black text-[10px] uppercase tracking-[0.2em]"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}