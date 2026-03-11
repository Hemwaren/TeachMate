// src/app/interventions/page.tsx
"use client";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

/* -------------------- UI helpers (no logic changes) -------------------- */
function riskPillClasses(risk: InterventionOutput["riskLevel"]) {
  if (risk === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (risk === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
}

function riskFromAvg(avgPct: number): InterventionOutput["riskLevel"] {
  // Heuristic for heatmap only (does NOT affect generateIntervention logic)
  if (avgPct < 50) return "high";
  if (avgPct < 70) return "medium";
  return "low";
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function riskScoreFromAvg(avgPct: number) {
  // 0..100, higher = worse
  return clamp(Math.round(100 - avgPct), 0, 100);
}

type PlanTag = "Home" | "Warm-up" | "Core" | "Quick Check" | "Parent"
type PlanItem = {
  title: string;
  durationMin?: number;
  tag?: PlanTag
};

type WeeklyPlan = {
  generatedAtISO: string;
  studentName: string;
  risk: InterventionOutput["riskLevel"];
  focusTopics: string[];
  days: Record<"Mon" | "Tue" | "Wed" | "Thu" | "Fri", PlanItem[]>;
};

function buildWeeklyPlan(args: {
  studentName: string;
  risk: InterventionOutput["riskLevel"];
  weakTopics: WeakTopic[];
  result: InterventionOutput | null;
}): 
WeeklyPlan {
  const { studentName, risk, weakTopics, result } = args;

  const focusTopics = weakTopics.slice(0, 3).map((t) => t.topic);
  const coreInterventions = (result?.interventionsThisWeek ?? []).slice(0, 3);
  const quickChecks = (result?.quickCheckQuestions ?? []).slice(0, 5);
  const hasParent = Boolean(result?.parentNote);

  const item = (
    title: string,
    durationMin: number | undefined,
    tag: PlanItem["tag"]
  ): PlanItem => ({
    title,
    durationMin,
    tag,
  });

  const warmUp: PlanItem = item("5-min warm-up (retrieval questions)", 5, "Warm-up");
  const dailyRetrieval: PlanItem = item("10-min retrieval practice on weak topic", 10, "Core");

  const topicLabel =
    focusTopics.length > 0 ? `Focus: ${focusTopics.join(", ")}` : "Focus: weak areas";

  const day = (items: PlanItem[]) => items;

  return {
    generatedAtISO: new Date().toISOString(),
    studentName,
    risk,
    focusTopics,
    days: {
      Mon: day([
        warmUp,
        { title: `${topicLabel} — mini diagnostic (2–3 questions)`, durationMin: 10, tag: "Quick Check" },
        dailyRetrieval,
        ...(quickChecks[0] ? [{ title: `Quick check: ${quickChecks[0]}`, durationMin: 5, tag: "Quick Check" }] : []),
      ]),
      Tue: day([
        warmUp,
        ...(coreInterventions[0]
          ? [{ title: coreInterventions[0], durationMin: 20, tag: "Core" }]
          : [{ title: "Small-group support on weakest sub-skill", durationMin: 20, tag: "Core" }]),
        dailyRetrieval,
        ...(quickChecks[1] ? [{ title: `Quick check: ${quickChecks[1]}`, durationMin: 5, tag: "Quick Check" }] : []),
      ]),
      Wed: day([
        warmUp,
        ...(coreInterventions[1]
          ? [{ title: coreInterventions[1], durationMin: 20, tag: "Core" }]
          : [{ title: "Worked examples + guided practice", durationMin: 20, tag: "Core" }]),
        { title: "Home practice: 6 short questions (same topic family)", durationMin: 15, tag: "Home" },
        ...(quickChecks[2] ? [{ title: `Quick check: ${quickChecks[2]}`, durationMin: 5, tag: "Quick Check" }] : []),
      ]),
      Thu: day([
        warmUp,
        ...(coreInterventions[2]
          ? [{ title: coreInterventions[2], durationMin: 20, tag: "Core" }]
          : [{ title: "Peer explanation: student teaches back the method", durationMin: 15, tag: "Core" }]),
        dailyRetrieval,
        ...(hasParent
          ? [{ title: "Send parent note + 1 action they can do at home", durationMin: 10, tag: "Parent" }]
          : [{ title: "Share progress note to student (encouragement + next step)", durationMin: 5, tag: "Parent" }]),
      ]),
      Fri: day([
        warmUp,
        { title: "Exit ticket (3 questions) + review mistakes", durationMin: 15, tag: "Quick Check" },
        { title: "Celebrate improvement + set next week target", durationMin: 5, tag: "Core" },
        ...(quickChecks[3] ? [{ title: `Quick check: ${quickChecks[3]}`, durationMin: 5, tag: "Quick Check" }] : []),
      ]),
    },
  };
}

/* -------------------- WOW FEATURE: Class Heatmap + Intervention Queue -------------------- */
type QueueItem = {
  studentId: string;
  name: string;
  avgPct: number;
  risk: InterventionOutput["riskLevel"];
  riskScore: number; // higher = needs help more
  weakTopicsCount: number;
  recentCount: number;
};

export default function InterventionsPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // ✅ keep your existing "loading" meaning (generating)
  const [loading, setLoading] = useState(false);

  // UI-only: page loading state
  const [pageLoading, setPageLoading] = useState(true);

  const [result, setResult] = useState<InterventionOutput | null>(null);

  // Weekly plan state (new feature)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // parse OAuth callback URL if we landed here directly with tokens
      if (
        window.location.href.includes("access_token") ||
        window.location.href.includes("error")
      ) {
        try {
          const { data } = await (supabase.auth as any).getSessionFromUrl();
          if (data?.session) {
            await supabase.auth.setSession(data.session);
          }
        } catch (e) {
          console.warn("interventions oauth parse failed", e);
        }
      }

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

      setTimeout(() => {
        if (mounted) setPageLoading(false);
      }, 450);
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

  // Weak topics (same logic pattern as before; UI uses it)
  const selectedWeakTopics = useMemo(() => {
    const weakTopics: WeakTopic[] = recentScores
      .map((s) => ({ topic: s.topic, pct: (s.score / s.total) * 100 }))
      .sort((a, b) => a.pct - b.pct)
      .filter((x) => x.pct < 50)
      .slice(0, 6);
    return weakTopics;
  }, [recentScores]);

  const selectedAvg = selectedStudentId ? avgPercent(recentScores) : 0;

  async function generateIntervention() {
    // ✅ DO NOT CHANGE THIS LOGIC
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

      // Keep plan, but you can optionally rebuild it after generation:
      // (we'll not auto-create to keep behavior predictable)
    } catch (err) {
      console.error(err);
      toast.error("Intervention failed. Check terminal/logs.");
    } finally {
      setLoading(false);
    }
  }

  const interventionQueue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [];

    for (const stu of students) {
      const all = scoresByStudent.get(stu.id) ?? [];
      const recent = all.slice(0, 8);
      const avg = avgPercent(recent);

      const weakTopicsCount = recent
        .map((s) => (s.total ? (s.score / s.total) * 100 : 0))
        .filter((pct) => pct < 50).length;

      const risk = riskFromAvg(avg);
      const riskScore = riskScoreFromAvg(avg) + weakTopicsCount * 2;

      items.push({
        studentId: stu.id,
        name: stu.name,
        avgPct: avg,
        risk,
        riskScore,
        weakTopicsCount,
        recentCount: recent.length,
      });
    }

    items.sort((a, b) => b.riskScore - a.riskScore);
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, scoresByStudent, scores]);

  function createWeeklyPlan() {
    if (!selectedStudentId) {
      toast.error("Select a student first.");
      return;
    }

    const plan = buildWeeklyPlan({
      studentName: selectedStudent?.name ?? "Student",
      risk: (result?.riskLevel ?? riskFromAvg(selectedAvg)) as InterventionOutput["riskLevel"],
      weakTopics: selectedWeakTopics,
      result,
    });

    setWeeklyPlan(plan);
    toast.success("Weekly plan created!");
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4ea5f7] to-[#0f5ebb] dark:bg-[#120d1d] dark:from-[#120d1d] dark:to-[#120d1d] transition-colors duration-500">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border-t-2 border-l-2 border-white dark:border-[#BB86FC] animate-spin" />
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-white to-[#e0f2fe] dark:from-[#6200EE] dark:to-[#BB86FC] animate-pulse blur-sm opacity-80" />
          <div className="w-8 h-8 rounded-full bg-white dark:bg-black shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background transition-colors duration-500">
      {/* Light Mode background */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7]/70 to-[#0f5ebb]/70 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40" />
        <div className="absolute -bottom-32 -left-32 h-[700px] w-[700px] rounded-full bg-[#2b7de0] blur-[120px] opacity-40" />
      </div>

      {/* Dark Mode glow */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]" />

      <Header
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/interventions", label: "Interventions" },
          { href: "/profile", label: "Profile" },
        ]}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Hero */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 dark:bg-green-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-50 dark:text-gray-400">
                  Prioritize → Generate → Plan
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md dark:drop-shadow-none">
                AI Interventions
              </h1>
              <p className="mt-3 text-lg font-medium text-blue-100 dark:text-gray-400 drop-shadow-sm dark:drop-shadow-none">
                Use the queue to pick who needs help first, then generate interventions and a 1-click weekly plan.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="animate-in fade-in slide-in-from-right-6 duration-700 rounded-xl bg-white text-[#003366] dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 border border-white/40 dark:border-white/10 backdrop-blur"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT: Heatmap + Queue */}
          <div
            className="lg:col-span-5 animate-in fade-in slide-in-from-bottom-8 duration-700"
            style={{ animationDelay: "80ms" }}
          >
            <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      Class Heatmap + Intervention Queue
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Auto-ranked by priority (lower average + more weak topics → higher priority).
                    </p>
                  </div>

                  <span className="text-xs px-3 py-1.5 rounded-full border font-extrabold uppercase tracking-wider border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                    Students: {students.length}
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {interventionQueue.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        No students found
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Add students and scores to see the queue.
                      </div>
                    </div>
                  ) : (
                    interventionQueue.slice(0, 8).map((item, idx) => (
                      <button
                        key={item.studentId}
                        onClick={() => {
                          setSelectedStudentId(item.studentId);
                          setResult(null);
                          setWeeklyPlan(null);
                          toast.message(`Selected ${item.name}`);
                        }}
                        className={[
                          "w-full text-left rounded-2xl border p-4 transition-all duration-200",
                          "bg-white/60 dark:bg-white/5 border-gray-200/70 dark:border-white/10",
                          "hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]",
                          item.studentId === selectedStudentId
                            ? "ring-2 ring-[#0EA5E9]/40 dark:ring-[#BB86FC]/30"
                            : "",
                        ].join(" ")}
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                {item.name}
                              </div>
                              <span
                                className={[
                                  "text-[10px] px-2 py-1 rounded-full border font-extrabold uppercase tracking-wider",
                                  riskPillClasses(item.risk),
                                ].join(" ")}
                              >
                                {item.risk}
                              </span>
                            </div>
                            <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                              Avg: <span className="font-extrabold">{item.avgPct}%</span> · Weak topics:{" "}
                              <span className="font-extrabold">{item.weakTopicsCount}</span> · Recent:{" "}
                              <span className="font-extrabold">{item.recentCount}</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-xs font-extrabold text-gray-700 dark:text-gray-300">
                            Score {item.riskScore}
                          </div>
                        </div>

                        {/* Heat bar */}
                        <div className="mt-3 h-2 rounded-full bg-gray-200/70 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0EA5E9] dark:bg-[#BB86FC]"
                            style={{ width: `${clamp(item.riskScore, 0, 100)}%` }}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="mt-5 text-xs text-gray-500 dark:text-gray-500 font-medium">
                  Tip: Click a student to instantly load them into the generator + plan builder.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Selector + Output + Weekly Plan */}
          <div
            className="lg:col-span-7 animate-in fade-in slide-in-from-bottom-8 duration-700"
            style={{ animationDelay: "140ms" }}
          >
            {/* Top: selector + actions */}
            <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />

              <div className="relative z-10 space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      Select Student
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Generate intervention suggestions, then 1-click weekly plan.
                    </p>
                  </div>

                  {selectedStudentId && (
                    <span
                      className={[
                        "text-xs px-3 py-1.5 rounded-full border font-extrabold uppercase tracking-wider",
                        riskPillClasses(result?.riskLevel ?? riskFromAvg(selectedAvg)),
                      ].join(" ")}
                    >
                      Risk: {result?.riskLevel ?? riskFromAvg(selectedAvg)}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Student
                  </label>

                  <div className="relative">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        setResult(null);
                        setWeeklyPlan(null);
                      }}
                      className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm font-semibold
                                 bg-white/70 dark:bg-white/5
                                 border border-gray-200/80 dark:border-white/10
                                 text-gray-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/50 dark:focus:ring-[#BB86FC]/40
                                 transition"
                    >
                      <option value="">-- choose student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {selectedStudentId && (
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Recent average:{" "}
                      <span className="font-extrabold text-gray-900 dark:text-white">{selectedAvg}%</span>
                      {recentScores.length === 0 && (
                        <span className="ml-2 text-gray-500 dark:text-gray-500">(no scores yet)</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={generateIntervention}
                    disabled={loading || !selectedStudentId}
                    className="w-full rounded-xl px-5 py-3 text-sm font-extrabold
                             bg-[#0EA5E9] text-white shadow-lg
                             hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]
                             disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg
                             transition-all duration-200
                             dark:bg-[#6200EE]"
                  >
                    {loading ? "Generating..." : "Generate Intervention Suggestion"}
                  </button>

                  <button
                    onClick={createWeeklyPlan}
                    disabled={!selectedStudentId}
                    className="w-full rounded-xl px-5 py-3 text-sm font-extrabold
                             bg-white text-[#003366] border border-gray-200/70 shadow-lg
                             hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]
                             disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-lg
                             transition-all duration-200
                             dark:bg-white/10 dark:text-white dark:border-white/10"
                    title={result ? "Uses AI output to build a plan" : "Works even without AI output (uses weak topics)"}
                  >
                    Create Weekly Plan (Mon–Fri)
                  </button>
                </div>

                <div className="pt-1 text-xs text-gray-500 dark:text-gray-500 font-medium">
                  Plan builder uses weak topics + (if available) AI interventions & quick checks.
                </div>
              </div>
            </div>

            {/* AI Output */}
            <div className="mt-6">
              {!result ? (
                <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/70 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />
                  <div className="relative z-10">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      Output Console
                    </h2>
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                      Generate an intervention plan to get:
                      <span className="block mt-2">
                        • Risk level • Summary • Likely gaps • This week’s interventions • Quick checks
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5 animate-in fade-in zoom-in-95 duration-500">
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />

                  <div className="relative z-10 space-y-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                          Intervention Suggestion
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                          For{" "}
                          <span className="font-extrabold text-gray-900 dark:text-white">
                            {selectedStudent?.name ?? "Student"}
                          </span>
                        </p>
                      </div>

                      <span
                        className={[
                          "text-xs px-3 py-1.5 rounded-full border font-extrabold uppercase tracking-wider",
                          riskPillClasses(result.riskLevel),
                        ].join(" ")}
                      >
                        Risk: {result.riskLevel}
                      </span>
                    </div>

                    <Section title="Summary">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-7">
                        {result.summary}
                      </p>
                    </Section>

                    <Section title="Likely Gaps">
                      <ul className="list-disc pl-5 text-sm font-medium text-gray-700 dark:text-gray-300 space-y-2">
                        {result.likelyGaps?.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="Interventions This Week">
                      <ul className="list-disc pl-5 text-sm font-medium text-gray-700 dark:text-gray-300 space-y-2">
                        {result.interventionsThisWeek?.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="Quick Check Questions">
                      <ol className="list-decimal pl-5 text-sm font-medium text-gray-700 dark:text-gray-300 space-y-2">
                        {result.quickCheckQuestions?.map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ol>
                    </Section>

                    {result.parentNote && (
                      <Section title="Parent Note">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-7">
                          {result.parentNote}
                        </p>
                      </Section>
                    )}

                    <div className="pt-1 flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                        Generated from recent score patterns (up to 8 entries).
                      </div>

                      <button
                        onClick={() => {
                          setResult(null);
                          toast.message("Cleared result.");
                        }}
                        className="rounded-xl px-4 py-2 text-xs font-extrabold
                                 bg-white text-[#003366] border border-gray-200/70
                                 hover:scale-105 active:scale-95 transition-transform
                                 dark:bg-white/10 dark:text-white dark:border-white/10"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Plan Calendar */}
            <div className="mt-6">
              {!weeklyPlan ? (
                <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/70 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />
                  <div className="relative z-10">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      Weekly Plan Calendar (Mon–Fri)
                    </h2>
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                      Click <span className="font-extrabold">Create Weekly Plan</span> to generate a mini schedule.
                      It works even without AI output — but it’s best after intervention generation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="tm-card p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5 animate-in fade-in zoom-in-95 duration-500">
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                          Weekly Plan
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                          For{" "}
                          <span className="font-extrabold text-gray-900 dark:text-white">
                            {weeklyPlan.studentName}
                          </span>{" "}
                          · Focus topics:{" "}
                          <span className="font-extrabold text-gray-900 dark:text-white">
                            {weeklyPlan.focusTopics.length ? weeklyPlan.focusTopics.join(", ") : "—"}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "text-xs px-3 py-1.5 rounded-full border font-extrabold uppercase tracking-wider",
                            riskPillClasses(weeklyPlan.risk),
                          ].join(" ")}
                        >
                          Risk: {weeklyPlan.risk}
                        </span>

                        <button
                          onClick={() => {
                            setWeeklyPlan(null);
                            toast.message("Weekly plan cleared.");
                          }}
                          className="rounded-xl px-4 py-2 text-xs font-extrabold
                                     bg-white text-[#003366] border border-gray-200/70
                                     hover:scale-105 active:scale-95 transition-transform
                                     dark:bg-white/10 dark:text-white dark:border-white/10"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <DayColumn day="Mon" items={weeklyPlan.days.Mon} />
                      <DayColumn day="Tue" items={weeklyPlan.days.Tue} />
                      <DayColumn day="Wed" items={weeklyPlan.days.Wed} />
                      <DayColumn day="Thu" items={weeklyPlan.days.Thu} />
                      <DayColumn day="Fri" items={weeklyPlan.days.Fri} />
                    </div>

                    <div className="mt-5 text-xs text-gray-500 dark:text-gray-500 font-medium">
                      This is a ready-to-use mini schedule for a quick hackathon demo. You can refine durations anytime.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------- Small UI components -------------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 p-5">
      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
        {title}
      </h3>
      {children}
    </section>
  );
}

function TagPill({ tag }: { tag?: PlanItem["tag"] }) {
  if (!tag) return null;

  const cls =
    tag === "Warm-up"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : tag === "Core"
      ? "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
      : tag === "Quick Check"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : tag === "Home"
      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
      : "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300";

  return (
    <span
      className={[
        "text-[10px] px-2 py-1 rounded-full border font-extrabold uppercase tracking-wider",
        cls,
      ].join(" ")}
    >
      {tag}
    </span>
  );
}

function DayColumn({ day, items }: { day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri"; items: PlanItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-sm font-extrabold text-gray-900 dark:text-white">{day}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {items.reduce((acc, x) => acc + (x.durationMin ?? 0), 0)}m
        </div>
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div
            key={`${day}-${idx}`}
            className="rounded-xl border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs font-extrabold text-gray-900 dark:text-white leading-snug">
                {it.title}
              </div>
              <TagPill tag={it.tag} />
            </div>
            {typeof it.durationMin === "number" && (
              <div className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                ~{it.durationMin} min
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}