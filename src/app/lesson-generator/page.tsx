"use client";

import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Dynamic import for the PDF library
const loadHtml2Pdf = () => import("html2pdf.js");

// --- Types ---
type LessonFlowStep = { step: string; timeMin: number };

type LessonPlan = {
  title: string;
  overview: string;
  learningObjectives: string[];
  materials: string[];
  lessonFlow: LessonFlowStep[];
  homework: string;
};

type Icebreaker = {
  type: "Provocative" | "Quick-Fire" | "Real-World";
  content: string;
};

export default function LessonGeneratorPage() {
  const { theme } = useTheme();
  const supabase = createClient();

  // --- State Management: Core Inputs ---
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Form 3");
  const [durationMin, setDurationMin] = useState(60);
  const [classSize, setClassSize] = useState(40);
  const [language, setLanguage] = useState("English");

  // --- State Management: UI & Results ---
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [result, setResult] = useState<LessonPlan | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // --- State Management: Wow Features ---
  const [prismMode, setPrismMode] = useState<"Standard" | "Remedial" | "Enrichment">("Standard");
  const [isDifferentiating, setIsDifferentiating] = useState(false);
  const [icebreakers, setIcebreakers] = useState<Icebreaker[] | null>(null);
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  
  // LIVE MODE SPECIFIC STATE
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // --- Function: Generate Core Lesson ---
  async function generateLesson() {
    if (!topic) return toast.error("Please enter a topic first.");
    setLoading(true);
    setResult(null);
    setIcebreakers(null);
    setPrismMode("Standard");

    try {
      const res = await fetch("/api/ai/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, gradeLevel, durationMin, classSize, language }),
      });

      if (res.status === 429) throw new Error("Rate Limited");
      if (!res.ok) throw new Error("Generation failed");

      const data = (await res.json()) as LessonPlan;
      setResult(data);
      toast.success("Blueprint synthesized!");
    } catch (err) {
      toast.error("AI synthesize failed.");
    } finally {
      setLoading(false);
    }
  }

  // --- Feature 1: Differentiation Prism ---
  async function differentiate(mode: "Remedial" | "Enrichment") {
    if (!result) return;
    setIsDifferentiating(true);
    setPrismMode(mode);
    const toastId = toast.loading(`Refracting...`);

    try {
      const res = await fetch("/api/ai/differentiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: result, mode, gradeLevel }),
      });
      const data = await res.json();
      setResult(data);
      toast.success(`${mode} pathways ready!`, { id: toastId });
    } catch (err) {
      toast.error("Prism refraction failed.", { id: toastId });
    } finally {
      setIsDifferentiating(false);
    }
  }

  // --- Feature 2: Icebreaker Spark ---
  async function generateHooks() {
    if (!topic) return;
    setIsGeneratingHooks(true);
    try {
      const res = await fetch("/api/ai/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject }),
      });
      const data = await res.json();
      setIcebreakers(data.hooks);
      toast.success("Icebreaker sparks ignited!");
    } catch (err) {
      toast.error("Failed to spark hooks.");
    } finally {
      setIsGeneratingHooks(false);
    }
  }

  // --- Feature 3: Live Session Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLiveMode) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  const handleExportPDF = async () => {
    if (!resultRef.current) return;
    setExporting(true);
    try {
      const html2pdfModule = await loadHtml2Pdf();
      const html2pdf = html2pdfModule.default;
      const opt: any = {
        margin: [10, 10],
        filename: `TeachMate_${topic}.pdf`,
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      await html2pdf().set(opt).from(resultRef.current).save();
    } finally {
      setExporting(false);
    }
  };

  async function saveToLibrary() {
    if (!result) return;
    setSavingToDb(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login required");
    const { error } = await supabase.from("lesson_plans").insert({
      teacher_id: user.id, topic, grade_level: gradeLevel, content: result
    });
    setSavingToDb(false);
    if (!error) toast.success("Archived in Library");
  }

  useEffect(() => {
    if (result && resultRef.current && !isLiveMode) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, isLiveMode]);

  // Calculations for HUD
  const totalSeconds = durationMin * 60;
  const currentStep = result?.lessonFlow[activeStepIndex];
  const stepTargetSeconds = (currentStep?.timeMin || 0) * 60;

  return (
    <div className={`relative min-h-screen w-full transition-colors duration-700 ${isLiveMode ? 'bg-[#050505] overflow-hidden select-none' : 'bg-background'}`}>
      
      {/* Background FX (Hidden in Live Mode) */}
      {!isLiveMode && (
        <>
          <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7] to-[#0f5ebb] overflow-hidden">
            <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40"></div>
          </div>
          <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]"></div>
          <Header links={[{ href: "/dashboard", label: "Dashboard" }]} />
        </>
      )}

      <main className={`relative z-10 max-w-6xl mx-auto px-4 ${isLiveMode ? 'pt-0 h-screen flex flex-col' : 'pt-24 pb-20'}`}>
        
        {/* --- 1. INPUT PANEL (Normal Mode) --- */}
        {!result && !loading && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            {/* header + back link */}
            <div className="flex items-center justify-between flex-wrap mb-8">
              <h1 className="text-4xl font-black text-white drop-shadow-md tracking-tight">
                Lesson <span className="opacity-70">Architect</span>
              </h1>
              <Link
                href="/dashboard"
                className="animate-in fade-in slide-in-from-right-6 duration-700 rounded-xl bg-white text-[#003366] dark:bg-white/10 dark:text-white px-5 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 border border-white/40 dark:border-white/10 backdrop-blur"
              >
                ← Back to Dashboard
              </Link>
            </div>
            <div className="tm-card p-8 bg-white/90 backdrop-blur-xl dark:bg-[#1E1E24] shadow-2xl border-white/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white font-bold appearance-none">
                      <option>Bahasa Melayu</option>
                      <option>English</option>
                      <option>Mathematics</option>
                      <option>Science</option>
                      <option>History</option>
                      <option>Geography</option>
                      <option>Physics</option>
                      <option>Chemistry</option>
                      <option>Biology</option>
                      <option>Art Education</option>
                      <option>Music</option>
                      <option>Islamic Education</option>
                      <option>Moral Education</option>
                      <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Topic</label>
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-[#0EA5E9]" placeholder="e.g. Introduction to Calculus" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Grade</label>
                  <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold">
                    <option>Form 1</option><option>Form 2</option><option>Form 3</option><option>Form 4</option><option>Form 5</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Duration (Min)</label>
                  <input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] text-gray-900 dark:text-white font-bold">
                    <option>English</option><option>Malay</option><option>Chinese</option><option>Tamil</option>
                  </select>
                </div>
              </div>
              <button onClick={generateLesson} className="w-full rounded-2xl py-5 bg-[#003366] dark:bg-[#6200EE] text-white font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-95 transition-all">
                Synthesize Pedagogical Data
              </button>
            </div>
          </section>
        )}

        {/* --- 2. LOADING STATE --- */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-24 h-24 rounded-full border-4 border-white/20 border-t-white animate-spin mb-8"></div>
            <p className="text-white font-black tracking-[0.3em] uppercase text-sm animate-bounce">Accessing Neural Pedagogical Network...</p>
          </div>
        )}

        {/* --- 3. RESULT VIEW (Standard Mode) --- */}
        {result && !isLiveMode && (
          <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-20">
            <div ref={resultRef} className={`flex-1 transition-all duration-700 rounded-[2.5rem] overflow-hidden border-8 ${
              prismMode === 'Remedial' ? 'border-emerald-500/30' : prismMode === 'Enrichment' ? 'border-amber-500/30' : 'border-white/10'
            }`}>
              <div className="tm-card p-10 md:p-14 bg-white dark:bg-[#1E1E24] shadow-2xl relative">
                <div className={`absolute top-0 right-0 px-10 py-4 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-bl-3xl ${
                  prismMode === 'Remedial' ? 'bg-emerald-500' : prismMode === 'Enrichment' ? 'bg-amber-500' : 'bg-[#0EA5E9] dark:bg-[#6200EE]'
                }`}>{prismMode} Blueprint</div>

                <header className="mb-12 border-b border-gray-100 dark:border-white/5 pb-10">
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">{result.title}</h2>
                  <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{result.overview}</p>
                </header>

                {icebreakers && (
                  <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {icebreakers.map((h, i) => (
                      <div key={i} className="p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30">
                        <span className="text-[9px] font-black uppercase tracking-widest text-yellow-600">Spark: {h.type}</span>
                        <p className="mt-2 text-xs font-bold text-gray-800 dark:text-yellow-100 italic leading-relaxed">"{h.content}"</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-1 space-y-10">
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0ea5e9] mb-4">Objectives</h3>
                      <ul className="space-y-3">{result.learningObjectives.map((obj, i) => (<li key={i} className="flex gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">● {obj}</li>))}</ul>
                    </section>
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0ea5e9] mb-4">Resources</h3>
                      <div className="flex flex-wrap gap-2">{result.materials.map((m, i) => (<span key={i} className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">{m}</span>))}</div>
                    </section>
                  </div>
                  <div className="lg:col-span-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0ea5e9] mb-8">Phase Flow</h3>
                    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-blue-400/20">
                      {result.lessonFlow.map((step, i) => (
                        <div key={i} className="relative flex items-center gap-6 group">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#003366] dark:bg-[#6200EE] text-white shrink-0 z-10 shadow-lg text-[10px] font-black">{step.timeMin}m</div>
                          <div className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group-hover:border-blue-400/50 transition-all font-bold text-sm text-gray-800 dark:text-gray-200">{step.step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div data-html2canvas-ignore className="mt-14 pt-8 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TeachMate Blueprint © {new Date().getFullYear()}</p>
                  <div className="flex gap-3">
                    <button onClick={saveToLibrary} className="px-6 py-2 rounded-xl border-2 border-blue-50 text-xs font-bold text-gray-500 dark:text-gray-400">Archive</button>
                    <button onClick={handleExportPDF} className="px-6 py-2 rounded-xl bg-[#003366] dark:bg-[#6200EE] text-xs font-black text-white uppercase tracking-widest">PDF Export</button>
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBAR COMMANDS */}
            <aside className="w-full lg:w-80 space-y-6">
              <div className="tm-card p-6 bg-white/10 backdrop-blur-xl border-white/20">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-6 underline underline-offset-8">Prism Refraction</h4>
                <div className="space-y-3">
                   <button onClick={() => setPrismMode("Standard")} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${prismMode === 'Standard' ? 'bg-[#0EA5E9] text-white' : 'bg-white/5 text-white/40'}`}>Standard</button>
                   <button onClick={() => differentiate("Remedial")} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${prismMode === 'Remedial' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/40'}`}>Remedial Path</button>
                   <button onClick={() => differentiate("Enrichment")} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${prismMode === 'Enrichment' ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-white/40'}`}>Enrichment Path</button>
                </div>
              </div>
              <button onClick={generateHooks} disabled={isGeneratingHooks || icebreakers !== null} className="w-full p-6 bg-yellow-400 rounded-3xl text-[#003366] font-black text-[11px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                {isGeneratingHooks ? "Synthesizing Hooks..." : "Spark Icebreakers"}
              </button>
              <div className="p-8 bg-gradient-to-br from-green-600 to-emerald-800 rounded-[2.5rem] text-white shadow-2xl">
                 <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Ready to deliver?</p>
                 <h4 className="text-xl font-black mb-6 leading-tight">Launch HUD Teleprompter</h4>
                 <button onClick={() => { setIsLiveMode(true); setElapsedSeconds(0); setActiveStepIndex(0); }} className="w-full py-4 bg-white text-emerald-800 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-50 transition-all">
                   Enter Live Stage
                 </button>
              </div>
            </aside>
          </div>
        )}

        {/* --- 4. GOD TIER LIVE MODE HUD --- */}
        {isLiveMode && result && (
          <div className="flex-1 flex flex-col pt-8 pb-12 animate-in fade-in duration-700">
            
            {/* Top Mission Status */}
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Studio</span>
                </div>
                <h2 className="text-xl font-black text-white/90 tracking-tight">{result.title}</h2>
              </div>
              <button onClick={() => setIsLiveMode(false)} className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                Terminate Session
              </button>
            </div>

            {/* Global Progress Bar */}
            <div className="mb-12 space-y-2">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                  <span>Lesson Completion</span>
                  <span>{Math.floor(elapsedSeconds / 60)}m / {durationMin}m</span>
               </div>
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#0EA5E9] via-[#6200EE] to-[#0EA5E9] transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(14,165,233,0.5)]"
                    style={{ width: `${Math.min((elapsedSeconds / totalSeconds) * 100, 100)}%` }}
                  />
               </div>
            </div>

            {/* MAIN HUD STAGE */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-h-[60vh]">
               
               {/* Left: Step Details */}
               <div className="lg:col-span-8 h-full flex flex-col justify-center">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-4 text-[#0EA5E9] font-black text-xs uppercase tracking-[0.4em]">
                       <span className="opacity-40">Phase</span>
                       <span className="text-2xl">{activeStepIndex + 1}</span>
                       <span className="opacity-40">/ {result.lessonFlow.length}</span>
                    </div>
                    
                    {/* The Instruction Prompt */}
                    <div className="relative">
                       <div className="absolute -left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0EA5E9] to-transparent rounded-full opacity-50"></div>
                       <p className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tight animate-in slide-in-from-left-8 duration-500">
                         {result.lessonFlow[activeStepIndex].step}
                       </p>
                    </div>
                  </div>
               </div>

               {/* Right: Phase Visuals & AI Check-ins */}
               <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Step Timer Circle */}
                  <div className="relative aspect-square w-48 mx-auto flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                        <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="283" strokeDashoffset={283 - (283 * (activeStepIndex + 1)) / result.lessonFlow.length} className="text-[#0EA5E9] transition-all duration-1000" />
                     </svg>
                     <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black text-white">{result.lessonFlow[activeStepIndex].timeMin}</span>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Minutes</span>
                     </div>
                  </div>

                  {/* AI Check-in Notification */}
                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-[#003366] border border-blue-400/30 shadow-2xl transform hover:scale-[1.02] transition-transform">
                     <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-blue-200 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">AI Command: Check-in</span>
                     </div>
                     <p className="text-sm font-bold text-white leading-relaxed italic">
                        "Stop here and ask: Does anyone see how this links to our last project?"
                     </p>
                  </div>
               </div>
            </div>

            {/* FLOATING HUD CONTROLS */}
            <div className="mt-auto flex justify-center items-center gap-8 py-8">
               <button 
                 disabled={activeStepIndex === 0}
                 onClick={() => setActiveStepIndex(prev => prev - 1)}
                 className="p-8 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white disabled:opacity-0 transition-all hover:bg-white/10"
               >
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
               </button>

               <div className="flex flex-col items-center">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">Navigator</div>
                  <div className="flex gap-2">
                     {result.lessonFlow.map((_, i) => (
                        <div key={i} className={`h-1.5 transition-all duration-500 rounded-full ${i === activeStepIndex ? 'w-8 bg-[#0EA5E9]' : 'w-2 bg-white/10'}`}></div>
                     ))}
                  </div>
               </div>

               <button 
                 onClick={() => {
                   if(activeStepIndex < result.lessonFlow.length - 1) setActiveStepIndex(prev => prev + 1);
                   else {
                     setIsLiveMode(false);
                     toast.success("Mission Accomplished: Lesson Complete!");
                   }
                 }}
                 className="p-8 rounded-full bg-[#6200EE] text-white shadow-[0_0_30px_rgba(98,0,238,0.5)] hover:scale-110 active:scale-95 transition-all"
               >
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
               </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}