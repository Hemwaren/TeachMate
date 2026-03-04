"use client";

import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// Dynamic import for the PDF library
const loadHtml2Pdf = () => import("html2pdf.js");

// --- Types ---
type SchoolLevel = "primary" | "secondary";
type Stream = "Science" | "Accounting" | "Arts";
type QuestionType = "mcq" | "short";
type OutputMode = "quiz" | "worksheet";

type Question = {
  type: "mcq" | "short";
  question: string;
  options?: string[];
  answer: string;
};

// --- Subject Maps ---
const PRIMARY_SUBJECTS: Record<string, string[]> = {
  "Standard 1": ["Bahasa Melayu", "English", "Mathematics", "Science"],
  "Standard 2": ["Bahasa Melayu", "English", "Mathematics", "Science"],
  "Standard 3": ["Bahasa Melayu", "English", "Mathematics", "Science"],
  "Standard 4": ["Bahasa Melayu", "English", "Mathematics", "Science", "History", "Design & Technology"],
  "Standard 5": ["Bahasa Melayu", "English", "Mathematics", "Science", "History", "Design & Technology"],
  "Standard 6": ["Bahasa Melayu", "English", "Mathematics", "Science", "History", "Design & Technology"],
};

const SECONDARY_LOWER_SUBJECTS = [
  "Bahasa Melayu", "English", "Mathematics", "Science",
  "History", "Geography", "Design & Technology", "Basic Computer Science",
];

const UPPER_STREAM_SUBJECTS: Record<Stream, string[]> = {
  Science: ["Bahasa Melayu", "English", "History", "Add Mathematics", "Physics", "Chemistry", "Biology"],
  Accounting: ["Bahasa Melayu", "English", "Science", "Mathematics", "History", "Principles of Accounts", "Economics", "Business"],
  Arts: ["Bahasa Melayu", "English", "Science", "Mathematics", "History", "Geography"],
};

// --- Topic placeholders per subject ---
const TOPIC_PLACEHOLDER: Record<string, string> = {
  "Mathematics": "e.g. Algebra, Fractions, Decimals",
  "Add Mathematics": "e.g. Differentiation, Integration, Vectors",
  "Science": "e.g. Photosynthesis, States of Matter",
  "Biology": "e.g. Cell Division, Genetics, Ecosystems",
  "Chemistry": "e.g. Chemical Bonding, Acids & Bases, Mole Concept",
  "Physics": "e.g. Newton's Laws, Waves, Electromagnetism",
  "History": "e.g. Formation of Malaysia, The Renaissance",
  "Geography": "e.g. River Systems, Climate Change, Population",
  "English": "e.g. Essay Writing, Grammar, Literature",
  "Bahasa Melayu": "e.g. Karangan, Tatabahasa, Pemahaman",
  "Principles of Accounts": "e.g. Trial Balance, Cash Flow Statement",
  "Economics": "e.g. Supply and Demand, Market Structures",
  "Business": "e.g. Marketing Mix, Entrepreneurship",
  "Design & Technology": "e.g. Product Design, Material Properties",
  "Basic Computer Science": "e.g. Algorithms, Data Structures, Networking",
};

// Language subjects — language selector is hidden when these are selected
const LANGUAGE_SUBJECTS = new Set(["Bahasa Melayu", "English"]);

export default function QuizGeneratorPage() {
  useTheme();

  // --- School Level & Grade ---
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>("primary");
  const [grade, setGrade] = useState("Standard 1");
  const [stream, setStream] = useState<Stream>("Science");

  // --- Derived subject list ---
  const subjectList: string[] = (() => {
    if (schoolLevel === "primary") return PRIMARY_SUBJECTS[grade] ?? [];
    const isUpper = grade === "Form 4" || grade === "Form 5";
    if (isUpper) return UPPER_STREAM_SUBJECTS[stream];
    return SECONDARY_LOWER_SUBJECTS;
  })();

  // --- Core inputs ---
  const [subject, setSubject] = useState(subjectList[0]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState<QuestionType>("mcq");
  const [language, setLanguage] = useState("English");
  const [outputMode, setOutputMode] = useState<OutputMode>("quiz");

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Grade options
  const gradeOptions =
    schoolLevel === "primary"
      ? ["Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5", "Standard 6"]
      : ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"];

  const isUpperSecondary = schoolLevel === "secondary" && (grade === "Form 4" || grade === "Form 5");
  const isLanguageSubject = LANGUAGE_SUBJECTS.has(subject);

  // Cascade: reset grade when level changes
  useEffect(() => {
    const newGrade = schoolLevel === "primary" ? "Standard 1" : "Form 1";
    setGrade(newGrade);
  }, [schoolLevel]);

  // Cascade: reset subject when grade/stream changes
  useEffect(() => {
    const list: string[] =
      schoolLevel === "primary"
        ? PRIMARY_SUBJECTS[grade] ?? []
        : isUpperSecondary
          ? UPPER_STREAM_SUBJECTS[stream]
          : SECONDARY_LOWER_SUBJECTS;

    setSubject(list[0] ?? "");
  }, [grade, stream, schoolLevel, isUpperSecondary]);

  async function handleGenerate() {
    if (!topic.trim()) return toast.error("Please enter a topic first.");
    setLoading(true);
    setQuestions([]);
    setShowAnswers(false);

    const effectiveType = outputMode === "worksheet" ? "short" : questionType;
    const effectiveLanguage = isLanguageSubject ? subject : language;
    const gradeLabel = schoolLevel === "primary" ? grade : grade;

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          gradeLevel: gradeLabel,
          difficulty,
          numQuestions,
          questionType: effectiveType,
          language: effectiveLanguage,
        }),
      });

      if (res.status === 429) throw new Error("Rate Limited");
      if (!res.ok) throw new Error("Generation failed");

      const data = (await res.json()) as Question[];
      setQuestions(data);
      toast.success(outputMode === "worksheet" ? "Worksheet synthesized!" : "Quiz assembled!");
    } catch (err: any) {
      toast.error(err?.message || "AI synthesis failed.");
    } finally {
      setLoading(false);
    }
  }

  const handleExportPDF = async () => {
    if (!resultRef.current) return;
    setExporting(true);
    try {
      const html2pdfModule = await loadHtml2Pdf();
      const html2pdf = html2pdfModule.default;
      const opt: any = {
        margin: [10, 10],
        filename: `TeachMate_${outputMode === "worksheet" ? "Worksheet" : "Quiz"}_${topic}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
      await html2pdf().set(opt).from(resultRef.current).save();
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0 && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [questions]);

  const isWorksheet = outputMode === "worksheet";
  const topicPlaceholder = TOPIC_PLACEHOLDER[subject] ?? "e.g. Enter a topic";

  // --- INPUT SECTION label helper ---
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">
      {children}
    </label>
  );

  const SelectField = ({
    value, onChange, children,
  }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white font-bold appearance-none"
    >
      {children}
    </select>
  );

  return (
    <div className="relative min-h-screen w-full transition-colors duration-700 bg-background">
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7] to-[#0f5ebb] overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40" />
      </div>
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]" />
      <Header links={[{ href: "/dashboard", label: "Dashboard" }]} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 pt-24 pb-20">

        {/* ── 1. INPUT PANEL ── */}
        {questions.length === 0 && !loading && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-black text-white mb-2 drop-shadow-md tracking-tight">
              Assessment <span className="opacity-70">Engine</span>
            </h1>
            <p className="text-white/60 font-medium mb-8 text-sm tracking-wide">
              Auto-create quizzes &amp; printable worksheets, complete with answer keys.
            </p>

            <div className="tm-card p-8 bg-white/90 backdrop-blur-xl dark:bg-[#1E1E24] shadow-2xl border-white/40">

              {/* Output Mode Toggle */}
              <div className="flex gap-2 mb-8 p-1 rounded-2xl bg-gray-100 dark:bg-white/5 w-fit">
                {(["quiz", "worksheet"] as OutputMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setOutputMode(m)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${outputMode === m
                        ? "bg-[#003366] dark:bg-[#6200EE] text-white shadow-lg"
                        : "text-gray-500 dark:text-white/30 hover:text-gray-800 dark:hover:text-white/60"
                      }`}
                  >
                    {m === "quiz" ? "📝 Quiz" : "📄 Worksheet"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                {/* School Level */}
                <div className="space-y-2">
                  <Label>School Level</Label>
                  <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-white/5">
                    {(["primary", "secondary"] as SchoolLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setSchoolLevel(lvl)}
                        className={`flex-1 py-3 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${schoolLevel === lvl
                            ? "bg-[#003366] dark:bg-[#6200EE] text-white shadow"
                            : "text-gray-500 dark:text-white/30"
                          }`}
                      >
                        {lvl === "primary" ? "Primary" : "Secondary"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade */}
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <SelectField value={grade} onChange={setGrade}>
                    {gradeOptions.map((g) => <option key={g}>{g}</option>)}
                  </SelectField>
                </div>

                {/* Stream — only for Form 4 & 5 */}
                {isUpperSecondary ? (
                  <div className="space-y-2">
                    <Label>Stream</Label>
                    <SelectField value={stream} onChange={(v) => setStream(v as Stream)}>
                      <option value="Science">Pure Science</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Arts">Arts</option>
                    </SelectField>
                  </div>
                ) : (
                  /* Empty placeholder to keep grid tidy */
                  <div />
                )}

                {/* Subject */}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <SelectField value={subject} onChange={setSubject}>
                    {subjectList.map((s) => <option key={s}>{s}</option>)}
                  </SelectField>
                </div>

                {/* Topic */}
                <div className="space-y-2 lg:col-span-2">
                  <Label>Topic</Label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    placeholder={topicPlaceholder}
                  />
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <SelectField value={difficulty} onChange={setDifficulty}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </SelectField>
                </div>

                {/* Number of Questions */}
                <div className="space-y-2">
                  <Label>No. of Questions</Label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold"
                  />
                </div>

                {/* Question Type — only for Quiz mode */}
                {!isWorksheet && (
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <SelectField
                      value={questionType}
                      onChange={(v) => setQuestionType(v as QuestionType)}
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="short">Short Answer</option>
                    </SelectField>
                  </div>
                )}

                {/* Language — hidden for language subjects */}
                {!isLanguageSubject && (
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <SelectField value={language} onChange={setLanguage}>
                      <option>English</option>
                      <option>Malay</option>
                      <option>Chinese</option>
                      <option>Tamil</option>
                    </SelectField>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                className="w-full rounded-2xl py-5 bg-[#003366] dark:bg-[#6200EE] text-white font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all"
              >
                {isWorksheet ? "Generate Worksheet" : "Generate Quiz"}
              </button>
            </div>
          </section>
        )}

        {/* ── 2. LOADING STATE ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-24 h-24 rounded-full border-4 border-white/20 border-t-white animate-spin mb-8" />
            <p className="text-white font-black tracking-[0.3em] uppercase text-sm animate-bounce">
              {isWorksheet ? "Compiling Worksheet..." : "Assembling Assessment..."}
            </p>
          </div>
        )}

        {/* ── 3. RESULT VIEW ── */}
        {questions.length > 0 && !loading && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-20">

            {/* Main Card */}
            <div
              ref={resultRef}
              className="flex-1 tm-card bg-white dark:bg-[#1E1E24] shadow-2xl overflow-hidden border-white/10 rounded-[2.5rem]"
            >
              {/* Card Header */}
              <div
                className={`px-10 py-5 flex items-center justify-between ${isWorksheet ? "bg-violet-600" : "bg-[#0EA5E9] dark:bg-[#6200EE]"
                  }`}
              >
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">
                    {isWorksheet ? "Printable Worksheet" : "Assessment"} · {grade}
                    {isUpperSecondary ? ` · ${stream}` : ""} · {subject}
                  </p>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5">{topic}</h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-widest">
                  {difficulty} · {questions.length}Q
                </span>
              </div>

              {/* Questions */}
              <div className="p-8 md:p-12 space-y-8">
                {questions.map((q, idx) => (
                  <div key={idx} className="group relative flex gap-5">
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-md mt-0.5 ${isWorksheet ? "bg-violet-500" : "bg-[#003366] dark:bg-[#6200EE]"
                        }`}
                    >
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug mb-4">
                        {q.question}
                      </p>

                      {/* MCQ Options */}
                      {q.type === "mcq" && q.options && !isWorksheet && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <div
                              key={oi}
                              className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showAnswers && q.answer === opt
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700/40 text-emerald-800 dark:text-emerald-300"
                                  : "bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300"
                                }`}
                            >
                              <span className="font-black text-[10px] mt-0.5 opacity-60 shrink-0">
                                {String.fromCharCode(65 + oi)}.
                              </span>
                              <span>{opt.replace(/^[A-D]\.\s*/, "")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Short answer blank lines */}
                      {(q.type === "short" || isWorksheet) && !showAnswers && (
                        <div className="space-y-2 mt-2">
                          {[1, 2].map((l) => (
                            <div key={l} className="h-px bg-gray-300 dark:bg-white/10 w-full" />
                          ))}
                          <div className="h-px bg-gray-300 dark:bg-white/10 w-3/4" />
                        </div>
                      )}

                      {/* Answer reveal */}
                      {showAnswers && (
                        <div className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Answer: </span>
                          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{q.answer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div data-html2canvas-ignore className="px-10 py-6 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  TeachMate Assessment © {new Date().getFullYear()}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setQuestions([]); setShowAnswers(false); }}
                    className="px-5 py-2 rounded-xl border-2 border-gray-100 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-gray-400 hover:border-gray-300 transition-all"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className={`px-6 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${isWorksheet ? "bg-violet-600 hover:bg-violet-700" : "bg-[#003366] dark:bg-[#6200EE]"
                      }`}
                  >
                    {exporting ? "Exporting..." : "PDF Export"}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 space-y-5 shrink-0">

              {/* Answer Key */}
              <div className="tm-card p-6 bg-white/10 backdrop-blur-xl border-white/20">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4 underline underline-offset-8">
                  Answer Key
                </h4>
                <button
                  onClick={() => setShowAnswers((v) => !v)}
                  className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showAnswers
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                >
                  {showAnswers ? "✓ Answers Visible" : "Reveal Answers"}
                </button>
                <p className="mt-3 text-[10px] text-white/30 leading-relaxed">
                  Toggle to show or hide correct answers. Hidden by default for student use.
                </p>
              </div>

              {/* Info Panel */}
              <div className="tm-card p-6 bg-white/10 backdrop-blur-xl border-white/20 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 underline underline-offset-8">
                  Assessment Info
                </h4>
                {[
                  { label: "Topic", value: topic },
                  { label: "Level", value: schoolLevel === "primary" ? "Primary" : "Secondary" },
                  { label: "Grade", value: grade },
                  ...(isUpperSecondary ? [{ label: "Stream", value: stream }] : []),
                  { label: "Subject", value: subject },
                  { label: "Difficulty", value: difficulty.charAt(0).toUpperCase() + difficulty.slice(1) },
                  { label: "Questions", value: String(questions.length) },
                  { label: "Mode", value: isWorksheet ? "Worksheet" : "Quiz" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-black text-white/70 text-right max-w-[55%] truncate">{value}</span>
                  </div>
                ))}
              </div>

              {/* Regenerate */}
              <button
                onClick={handleGenerate}
                className="w-full p-5 bg-gradient-to-br from-[#003366] to-[#0EA5E9] dark:from-[#6200EE] dark:to-[#BB86FC] rounded-3xl text-white font-black text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                ↻ Regenerate
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}