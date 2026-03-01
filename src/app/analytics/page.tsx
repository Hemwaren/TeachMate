// app/analytics/page.tsx
"use client";

import { useState, useEffect } from "react";
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
}

export default function AnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: studentsData }, { data: scoresData }] = await Promise.all([
      supabase.from("students").select("*").eq("teacher_id", user.id),
      supabase.from("scores").select("*").eq("teacher_id", user.id),
    ]);

    if (studentsData) setStudents(studentsData);
    if (scoresData) setScores(scoresData);
    setLoading(false);
  };

  // Calculate metrics
  const getStudentAverage = (studentId: string) => {
    const studentScores = scores.filter((s) => s.student_id === studentId);
    if (studentScores.length === 0) return 0;
    const total = studentScores.reduce((acc, s) => acc + (s.score / s.total) * 100, 0);
    return total / studentScores.length;
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
      topicScores[s.topic].push((s.score / s.total) * 100);
    });

    return Object.entries(topicScores)
      .map(([topic, scores]) => ({
        topic,
        average: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .filter((t) => t.average < 50)
      .sort((a, b) => a.average - b.average);
  };

  const chartData = students.map((s) => ({
    name: s.name,
    average: Math.round(getStudentAverage(s.id)),
  }));

  const riskData = [
    { name: "At Risk", value: atRiskStudents.length, color: "#ef4444" },
    { name: "Need Improvement", value: students.filter((s) => {
      const avg = getStudentAverage(s.id);
      return avg >= 40 && avg < 60;
    }).length, color: "#f59e0b" },
    { name: "Performing Well", value: students.filter((s) => getStudentAverage(s.id) >= 60).length, color: "#10b981" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm font-medium text-gray-600">Total Students</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{students.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm font-medium text-gray-600">At Risk Students</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{atRiskStudents.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm font-medium text-gray-600">Weak Topics</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{weakTopics().length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <p className="text-sm font-medium text-gray-600">Total Assessments</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{scores.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Chart */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Performance Overview</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Risk Distribution */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Risk Distribution</h2>
            {students.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
            <div className="flex justify-center space-x-4 mt-4">
              {riskData.map((item) => (
                <div key={item.name} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* At Risk Students */}
        {atRiskStudents.length > 0 && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">⚠️ At-Risk Students</h2>
            <div className="space-y-3">
              {atRiskStudents.map((student) => (
                <div key={student.id} className="flex justify-between items-center bg-white rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-500">Average: {Math.round(getStudentAverage(student.id))}%</p>
                  </div>
                  <Link
                    href="/interventions"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Get Intervention
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Topics */}
        {weakTopics().length > 0 && (
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-orange-900 mb-4">📚 Topics Needing Attention</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weakTopics().map((topic) => (
                <div key={topic.topic} className="bg-white rounded-lg p-4 border border-orange-200">
                  <p className="font-medium text-gray-900">{topic.topic}</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{Math.round(topic.average)}%</p>
                  <p className="text-sm text-gray-500">Class Average</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}