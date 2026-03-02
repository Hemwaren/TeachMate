// app/analytics/page.tsx
"use client";

import Header from "@/components/Header";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Student {
  id: string;
  name: string;
}

interface Score {
  id: string;
  student_id: string;
  topic: string;
  score: number;
  total: number;

  // ✅ optional (Supabase often has this). Used for trend ordering when available.
  created_at?: string;
}

type TrendInfo = {
  series: number[]; // recent %s
  predictedNext: number | null;
  slope: number | null; // negative = trending down
};

export default function AnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  // intervention plan state
  const [planOpenFor, setPlanOpenFor] = useState<string | null>(null);
  const [planText, setPlanText] = useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: studentsData }, { data: scoresData }] = await Promise.all([
      supabase.from("students").select("*").eq("teacher_id", user.id),
      supabase.from("scores").select("*").eq("teacher_id", user.id),
    ]);

    if (studentsData) setStudents(studentsData);
    if (scoresData) setScores(scoresData as Score[]);
    setLoading(false);
  };

  // -----------------------------
  // Helpers (logic stays local)
  // -----------------------------
  const percentOf = (s: Score) => {
    if (!s.total) return 0;
    return (s.score / s.total) * 100;
  };

  const safeRound = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

  const getStudentScoresOrdered = (studentId: string) => {
    const list = scores.filter((s) => s.student_id === studentId);

    // Prefer created_at if present (most accurate)
    const hasCreatedAt = list.some((x) => typeof x.created_at === "string");
    if (hasCreatedAt) {
      return [...list].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
    }

    // Fallback: keep original order
    return list;
  };

  // Calculate metrics
  const getStudentAverage = (studentId: string) => {
    const studentScores = scores.filter((s) => s.student_id === studentId);
    if (studentScores.length === 0) return 0;
    const total = studentScores.reduce((acc, s) => acc + percentOf(s), 0);
    return total / studentScores.length;
  };

  const getStudentTopicAverages = (studentId: string) => {
    const studentScores = scores.filter((s) => s.student_id === studentId);
    const byTopic: Record<string, number[]> = {};
    studentScores.forEach((s) => {
      if (!byTopic[s.topic]) byTopic[s.topic] = [];
      byTopic[s.topic].push(percentOf(s));
    });

    return Object.entries(byTopic)
      .map(([topic, arr]) => ({
        topic,
        average: arr.reduce((a, b) => a + b, 0) / arr.length,
        count: arr.length,
      }))
      .sort((a, b) => a.average - b.average);
  };

  // 🔥 Trend predictor (simple linear projection over last N points)
  const getTrendInfo = (studentId: string, points = 3): TrendInfo => {
    const ordered = getStudentScoresOrdered(studentId).map((s) => percentOf(s));
    const series = ordered.slice(-points).map((v) => Math.max(0, Math.min(100, v)));

    // Need at least 2 points to infer slope
    if (series.length < 2) {
      return { series, predictedNext: null, slope: null };
    }

    // x = 0..n-1, y = series
    const n = series.length;
    const xs = Array.from({ length: n }, (_, i) => i);

    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = series.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (series[i] - yMean);
      den += (xs[i] - xMean) * (xs[i] - xMean);
    }

    const slope = den === 0 ? 0 : num / den; // % per step
    const predictedNextRaw = series[n - 1] + slope * 1; // one step ahead
    const predictedNext = Math.max(0, Math.min(100, predictedNextRaw));

    return { series: series.map(safeRound), predictedNext: safeRound(predictedNext), slope };
  };

  const atRiskStudents = students.filter((s) => {
    const avg = getStudentAverage(s.id);
    const count = scores.filter((sc) => sc.student_id === s.id).length;
    return avg < 40 && count >= 3;
  });

  const weakTopics = () => {
    const topicScores: { [key: string]: number[] } = {};
    scores.forEach((s) => {
      if (!topicScores[s.topic]) topicScores[s.topic] = [];
      topicScores[s.topic].push(percentOf(s));
    });

    return Object.entries(topicScores)
      .map(([topic, arr]) => ({
        topic,
        average: arr.reduce((a, b) => a + b, 0) / arr.length,
      }))
      .filter((t) => t.average < 50)
      .sort((a, b) => a.average - b.average);
  };

  const chartData = students.map((s) => ({
    name: s.name,
    average: safeRound(getStudentAverage(s.id)),
  }));

  const riskData = [
    { name: "At Risk", value: atRiskStudents.length, color: "#ef4444" },
    {
      name: "Need Improvement",
      value: students.filter((s) => {
        const avg = getStudentAverage(s.id);
        return avg >= 40 && avg < 60;
      }).length,
      color: "#f59e0b",
    },
    {
      name: "Performing Well",
      value: students.filter((s) => getStudentAverage(s.id) >= 60).length,
      color: "#10b981",
    },
  ];

  // ✅ NEW: proactive “trending to failure” list (not yet at-risk, but predicted)
  const trendingWarnings = useMemo(() => {
    return students
      .map((s) => {
        const avg = getStudentAverage(s.id);
        const count = scores.filter((sc) => sc.student_id === s.id).length;
        const trend = getTrendInfo(s.id, 3);

        const predicted = trend.predictedNext;
        const slope = trend.slope;

        const isAlreadyAtRisk = avg < 40 && count >= 3;
        const hasEnough = trend.series.length >= 3;

        // "Trajectory toward failure": predicted next < 40, trending down, not already at-risk
        const trendingToFail =
          !isAlreadyAtRisk &&
          hasEnough &&
          predicted !== null &&
          predicted < 40 &&
          slope !== null &&
          slope < 0;

        return {
          student: s,
          avg: safeRound(avg),
          count,
          trend,
          trendingToFail,
        };
      })
      .filter((x) => x.trendingToFail)
      .sort((a, b) => (a.trend.predictedNext ?? 999) - (b.trend.predictedNext ?? 999));
  }, [students, scores]);

  // ✅ NEW: heatmap data
  const heatmap = useMemo(() => {
    const topics = Array.from(new Set(scores.map((s) => s.topic))).sort((a, b) =>
      a.localeCompare(b)
    );

    const matrix = students.map((st) => {
      const perTopic: Record<string, number[]> = {};
      scores
        .filter((s) => s.student_id === st.id)
        .forEach((s) => {
          if (!perTopic[s.topic]) perTopic[s.topic] = [];
          perTopic[s.topic].push(percentOf(s));
        });

      const row: Record<string, number | null> = {};
      topics.forEach((t) => {
        const arr = perTopic[t];
        if (!arr || arr.length === 0) row[t] = null;
        else row[t] = arr.reduce((a, b) => a + b, 0) / arr.length;
      });

      return { student: st, row };
    });

    return { topics, matrix };
  }, [students, scores]);

  const heatColor = (v: number | null) => {
    if (v === null) return "bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10";
    if (v < 40) return "bg-red-500/25 dark:bg-red-500/20 border-red-500/30 dark:border-red-500/30";
    if (v < 60)
      return "bg-amber-500/25 dark:bg-amber-500/20 border-amber-500/30 dark:border-amber-500/30";
    return "bg-emerald-500/20 dark:bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-500/25";
  };

  const heatText = (v: number | null) => {
    if (v === null) return "—";
    return `${safeRound(v)}%`;
  };

  // ✅ NEW: generate 5-step action plan (printable)
  const buildActionPlan = (studentName: string, topics: { topic: string; average: number }[]) => {
    const weak = topics.slice(0, 3); // top 3 weakest
    const weakList = weak.length ? weak.map((w) => `${w.topic} (${safeRound(w.average)}%)`) : [];

    const bullets =
      weakList.length > 0
        ? weakList.map((t) => `• ${t}`).join("\n")
        : "• Not enough topic data yet (add more assessments).";

    return `TeachMate — Student Remedial Action Plan

Student: ${studentName}
Focus Areas:
${bullets}

5-Step Plan (ready-to-use):
1) Quick Diagnose (5 minutes)
   - Ask 3 short questions from the weakest topic(s) to locate the exact misconception.

2) Micro-Lesson (10 minutes)
   - Re-teach the ONE core concept using a simple example and one visual (diagram/table).

3) Guided Practice (10 minutes)
   - Do 5 questions together: (Easy → Medium). Teacher checks each step, not just the final answer.

4) Independent Drill + Peer Support (10 minutes)
   - Student attempts 8 questions. Pair with a stronger buddy for checking (peer marking).

5) Re-check & Track (next class)
   - Give a 5-question mini-quiz on the same topics.
   - If score improves ≥ 15%, continue normal practice.
   - If not, repeat steps 2–4 with simpler questions.

Teacher Notes:
- Keep questions short, repeat daily for 3 days.
- Praise effort + progress, not only high marks.
`;
  };

  const printPlan = (title: string, content: string) => {
    const w = window.open("", "_blank");
    if (!w) return;

    const escaped = content
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; line-height: 1.5; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    pre { white-space: pre-wrap; font-size: 13px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="meta">Generated by TeachMate • Printable Handout</div>
  <pre>${escaped}</pre>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
    w.document.close();
  };

  const onGeneratePlan = (student: Student) => {
    const perTopic = getStudentTopicAverages(student.id);
    const plan = buildActionPlan(student.name, perTopic);
    setPlanOpenFor(student.id);
    setPlanText(plan);
  };

  // --- Dashboard-style Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4ea5f7] to-[#0f5ebb] dark:bg-[#120d1d] dark:from-[#120d1d] dark:to-[#120d1d] transition-colors duration-500">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full border-t-2 border-l-2 border-white dark:border-[#BB86FC] animate-spin"></div>
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-tr from-white to-[#e0f2fe] dark:from-[#6200EE] dark:to-[#BB86FC] animate-pulse blur-sm opacity-80"></div>
          <div className="w-8 h-8 rounded-full bg-white dark:bg-black shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background transition-colors duration-500">
      {/* Light Mode: Luminous Aether Background */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7]/70 to-[#0f5ebb]/70 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40"></div>
        <div className="absolute -bottom-32 -left-32 h-[700px] w-[700px] rounded-full bg-[#2b7de0] blur-[120px] opacity-40"></div>
      </div>

      {/* Dark Mode: Midnight Horizon Glow */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]"></div>

      {/* Header */}
      <Header
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/profile", label: "Profile" },
        ]}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {/* Hero */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center space-x-2 mb-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 dark:bg-green-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-50 dark:text-gray-400">
                  Analytics Live
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md dark:drop-shadow-none">
                Class Analytics
              </h1>
              <p className="mt-3 text-lg font-medium text-blue-100 dark:text-gray-400 drop-shadow-sm dark:drop-shadow-none">
                Spot weak topics, identify at-risk students, and track performance trends.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="animate-in fade-in zoom-in-95 duration-500 rounded-xl bg-white text-[#003366] px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-white/10 dark:text-white dark:border dark:border-white/10"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            {
              label: "Total Students",
              value: students.length,
              accent: "text-[#003366] dark:text-[#BB86FC]",
              delay: 0,
            },
            {
              label: "At Risk Students",
              value: atRiskStudents.length,
              accent: "text-red-600 dark:text-red-400",
              delay: 100,
            },
            {
              label: "Weak Topics",
              value: weakTopics().length,
              accent: "text-orange-600 dark:text-orange-400",
              delay: 200,
            },
            {
              label: "Total Assessments",
              value: scores.length,
              accent: "text-[#0EA5E9] dark:text-[#BB86FC]",
              delay: 300,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="group block h-full animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
              style={{ animationDelay: `${card.delay}ms` }}
            >
              <div className="tm-card h-full p-6 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.1),_transparent_50%)]"></div>

                <p className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className={`text-4xl font-extrabold mt-3 ${card.accent}`}>
                  {card.value}
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Updated from your latest records
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Performance Chart */}
          <div
            className="group block h-full animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
            style={{ animationDelay: `150ms` }}
          >
            <div className="tm-card h-full p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.1),_transparent_55%)]"></div>

              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                Student Performance Overview
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                Average score (%) by student across recorded assessments.
              </p>

              {chartData.length > 0 ? (
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="average" fill="#0EA5E9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Risk Distribution */}
          <div
            className="group block h-full animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
            style={{ animationDelay: `250ms` }}
          >
            <div className="tm-card h-full p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300 bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.1),_transparent_55%)]"></div>

              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                Student Risk Distribution
              </h2>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                Breakdown of student performance groups.
              </p>

              {students.length > 0 ? (
                <>
                  <div className="w-full h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={110}
                          paddingAngle={6}
                          dataKey="value"
                        >
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {riskData.map((item) => (
                      <div key={item.name} className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ NEW FEATURE #1: Early Warning Trend Predictor */}
        <div
          className="mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
          style={{ animationDelay: `320ms` }}
        >
          <div className="tm-card p-8 relative overflow-hidden bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_55%)]"></div>

            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  🎯 Early Warning Trend Predictor
                </h2>
                <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Proactive alerts for students trending toward failure (based on their recent score trajectory).
                </p>
              </div>

              <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-white/40 dark:border-white/10 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                Uses last 3 assessments (best with created_at)
              </div>
            </div>

            {trendingWarnings.length > 0 ? (
              <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingWarnings.map((x, idx) => {
                  const { student, avg, trend } = x;
                  const seriesText = trend.series.join(" → ");
                  const pred = trend.predictedNext ?? 0;

                  return (
                    <div
                      key={student.id}
                      className="group animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                      style={{ animationDelay: `${380 + idx * 80}ms` }}
                    >
                      <div className="bg-white/90 dark:bg-[#1E1E24] rounded-2xl p-5 border border-white/40 dark:border-white/5 transition-transform duration-200 hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Current Avg: {avg}%
                            </p>
                          </div>

                          <span className="rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 dark:border-red-500/20 px-3 py-1 text-xs font-extrabold text-red-700 dark:text-red-200">
                            Pred {pred}%
                          </span>
                        </div>

                        <div className="mt-4 rounded-xl bg-white/70 dark:bg-white/5 border border-white/40 dark:border-white/10 px-4 py-3">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Trajectory
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-gray-900 dark:text-white">
                            {seriesText} →{" "}
                            <span className="text-red-600 dark:text-red-300">{pred}</span>
                          </p>
                          <p className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            Alert: trending toward the at-risk zone — intervene early.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative z-10 mt-6 rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 p-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                No students are currently trending toward failure based on recent trajectories.
              </div>
            )}
          </div>
        </div>

        {/* At Risk Students + ✅ NEW FEATURE #2: One-Click Intervention Card */}
        {atRiskStudents.length > 0 && (
          <div
            className="mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
            style={{ animationDelay: `350ms` }}
          >
            {/* ✅ CHANGED ONLY: make outer section solid white (light mode), keep dark mode dark */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-red-500/25 bg-white dark:bg-red-500/10 p-8 shadow-xl">
              <div className="absolute inset-0 opacity-60 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(239,68,68,0.18),_transparent_55%)]"></div>

              <div className="relative z-10 flex items-center justify-between flex-wrap gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-red-200 drop-shadow-sm dark:drop-shadow-none">
                    ⚠️ At-Risk Students
                  </h2>
                  <p className="text-sm font-medium text-gray-600 dark:text-red-200/80">
                    Students below 40% average with at least 3 recorded assessments.
                  </p>
                </div>

                <Link
                  href="/interventions"
                  className="whitespace-nowrap rounded-xl bg-white text-red-700 dark:bg-red-500 dark:text-white px-6 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  Open Interventions →
                </Link>
              </div>

              <div className="relative z-10 space-y-3">
                {atRiskStudents.map((student) => {
                  const avg = safeRound(getStudentAverage(student.id));
                  const trend = getTrendInfo(student.id, 3);
                  const pred = trend.predictedNext;

                  return (
                    <div
                      key={student.id}
                      className="bg-white/90 dark:bg-[#1E1E24] rounded-2xl p-5 border border-white/40 dark:border-white/5 transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-extrabold text-gray-900 dark:text-white">
                            {student.name}
                          </p>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Average: {avg}%
                            {trend.series.length >= 3 && pred !== null ? (
                              <>
                                {" "}
                                • Trajectory:{" "}
                                <span className="font-extrabold text-gray-800 dark:text-gray-200">
                                  {trend.series.join(" → ")} →{" "}
                                  <span className="text-red-600 dark:text-red-300">
                                    {pred}%
                                  </span>
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Link
                            href="/interventions"
                            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-red-700"
                          >
                            Get Intervention
                          </Link>

                          <button
                            onClick={() => onGeneratePlan(student)}
                            className="px-5 py-2.5 rounded-xl bg-white text-[#003366] dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-extrabold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
                          >
                            Generate Action Plan
                          </button>
                        </div>
                      </div>

                      {planOpenFor === student.id && (
                        <div className="mt-5 rounded-2xl bg-white/70 dark:bg-white/5 border border-white/40 dark:border-white/10 p-5 animate-in fade-in zoom-in-95 duration-500">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                              📋 Printable 5-Step Remedial Plan
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  printPlan(`Action Plan - ${student.name}`, planText)
                                }
                                className="px-4 py-2 rounded-xl bg-[#0EA5E9] text-white font-extrabold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
                              >
                                Print
                              </button>
                              <button
                                onClick={() => {
                                  setPlanOpenFor(null);
                                  setPlanText("");
                                }}
                                className="px-4 py-2 rounded-xl bg-white text-gray-700 dark:bg-white/10 dark:text-white dark:border dark:border-white/10 font-extrabold text-sm shadow-lg transition-transform hover:scale-105 active:scale-95"
                              >
                                Close
                              </button>
                            </div>
                          </div>

                          <pre className="mt-4 whitespace-pre-wrap text-xs font-semibold text-gray-700 dark:text-gray-200 leading-relaxed">
                            {planText}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Weak Topics */}
        {weakTopics().length > 0 && (
          <div
            className="mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
            style={{ animationDelay: `450ms` }}
          >
            {/* ✅ CHANGED ONLY: make outer section solid white (light mode), keep dark mode dark */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-orange-500/25 bg-white dark:bg-orange-500/10 p-8 shadow-xl">
              <div className="absolute inset-0 opacity-60 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_55%)]"></div>

              <div className="relative z-10 mb-6">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-orange-200 drop-shadow-sm dark:drop-shadow-none">
                  📚 Topics Needing Attention
                </h2>
                <p className="text-sm font-medium text-gray-600 dark:text-orange-200/80">
                  Topics with class average below 50%.
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weakTopics().map((topic) => (
                  <div
                    key={topic.topic}
                    className="bg-white/90 dark:bg-[#1E1E24] rounded-2xl p-5 border border-white/40 dark:border-white/5 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <p className="font-extrabold text-gray-900 dark:text-white">
                      {topic.topic}
                    </p>
                    <p className="text-3xl font-extrabold text-orange-600 dark:text-orange-300 mt-2">
                      {safeRound(topic.average)}%
                    </p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Class Average
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW FEATURE #3: Class Heat Map by Topic × Student */}
        <div
          className="mt-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
          style={{ animationDelay: `520ms` }}
        >
          <div className="tm-card p-8 relative overflow-hidden bg-white/90 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5">
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.10),_transparent_55%)]"></div>

            <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  📊 Topic × Student Heat Map
                </h2>
                <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Each cell shows average score for a student on a topic (red/yellow/green). Fast “at-a-glance” diagnosis.
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-red-500/40 border border-red-500/40"></span>
                  &lt; 40%
                </span>
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/40"></span>
                  40–59%
                </span>
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-emerald-500/35 border border-emerald-500/35"></span>
                  ≥ 60%
                </span>
                <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/10"></span>
                  No data
                </span>
              </div>
            </div>

            {heatmap.topics.length === 0 || students.length === 0 ? (
              <div className="relative z-10 mt-6 rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5 p-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                No heatmap data yet — add scores across topics to visualize patterns.
              </div>
            ) : (
              <div className="relative z-10 mt-6 overflow-auto rounded-2xl border border-white/40 dark:border-white/10 bg-white/30 dark:bg-white/5">
                <div className="min-w-[900px]">
                  {/* Header row */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `240px repeat(${heatmap.topics.length}, minmax(120px, 1fr))`,
                    }}
                  >
                    <div className="p-4 font-extrabold text-sm text-gray-800 dark:text-gray-200 border-b border-white/40 dark:border-white/10">
                      Student
                    </div>
                    {heatmap.topics.map((t) => (
                      <div
                        key={t}
                        className="p-4 font-extrabold text-sm text-gray-800 dark:text-gray-200 border-b border-white/40 dark:border-white/10"
                      >
                        {t}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {heatmap.matrix.map(({ student, row }, idx) => (
                    <div
                      key={student.id}
                      className="grid"
                      style={{
                        gridTemplateColumns: `240px repeat(${heatmap.topics.length}, minmax(120px, 1fr))`,
                      }}
                    >
                      <div className="p-4 border-b border-white/40 dark:border-white/10">
                        <p className="font-extrabold text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Avg: {safeRound(getStudentAverage(student.id))}%
                        </p>
                      </div>

                      {heatmap.topics.map((topic) => {
                        const v = row[topic] ?? null;
                        return (
                          <div
                            key={`${student.id}-${topic}`}
                            className={`p-4 border-b border-white/40 dark:border-white/10`}
                          >
                            <div
                              className={`rounded-xl border px-3 py-2 text-sm font-extrabold text-gray-900 dark:text-white ${heatColor(
                                v
                              )}`}
                            >
                              {heatText(v)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}