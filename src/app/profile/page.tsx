"use client";

import Header from "@/components/Header";
import { useTheme } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Define the shape of stored plans for TypeScript
interface SavedPlan {
  id: string;
  topic: string;
  grade_level: string;
  created_at: string;
  content: {
    title: string;
    overview: string;
    learningObjectives: string[];
    materials: string[];
    lessonFlow: { step: string; timeMin: number }[];
    homework: string;
  };
}

export default function ProfilePage() {
  const { theme } = useTheme();
  const supabase = createClient();

  // --- UI & Content State ---
  const [activeTab, setActiveTab] = useState<"profile" | "plans">("profile");
  const [selectedPlan, setSelectedPlan] = useState<SavedPlan | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    subject: "",
    grade_level: "",
    school: "",
    region: "",
  });
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  
  // --- Animation & Loading States ---
  const [bloom, setBloom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Initial Load: Fetch Profile
  useEffect(() => {
    fetchProfile();
  }, []);

  // Context Switch: Fetch Plans when tab changes
  useEffect(() => {
    if (activeTab === "plans") {
      fetchPlans();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          subject: data.subject || "",
          grade_level: data.grade_level || "",
          school: data.school || "",
          region: data.region || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      toast.error("Could not retrieve your synthesized library.");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm("Permanent Archive Deletion: Are you sure?")) return;
    try {
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
      if (error) throw error;
      setPlans(plans.filter(p => p.id !== id));
      toast.success("Blueprint removed.");
    } catch (err) {
      toast.error("Deletion failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      
      toast.success("Identity Synced!");
      setBloom(true);
      setTimeout(() => setBloom(false), 1200);
    } catch (err) {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const completeness = Math.round((Object.values(profile).filter(Boolean).length / 5) * 100);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#120d1d]">
        <div className="w-16 h-16 border-4 border-[#0EA5E9] dark:border-[#BB86FC] border-t-transparent animate-spin rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background transition-colors duration-500">
      
      {/* 
        ====================================================================
        AMBIENT THEME BACKGROUNDS
        ====================================================================
      */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7]/60 to-[#0f5ebb]/60 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40"></div>
        <div className="absolute -bottom-32 -left-32 h-[700px] w-[700px] rounded-full bg-[#2b7de0] blur-[120px] opacity-40"></div>
      </div>
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]"></div>

      <Header links={[{ href: "/dashboard", label: "Dashboard" }, { href: "/profile", label: "Profile" }]} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        
        {/* --- HERO HEADER SECTION --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8 animate-in fade-in slide-in-from-top-6 duration-700">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            {/* Knowledge Tree SVG */}
            <div className={`relative w-24 h-24 md:w-32 md:h-32 transition-all duration-700 ${bloom ? "scale-110 rotate-6" : "scale-100"}`}>
              <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-2xl">
                <defs>
                  <linearGradient id="leafGrad" x1="0%" x2="100%">
                    <stop offset="0%" stopColor={theme === 'dark' ? '#03DAC6' : '#ffffff'} />
                    <stop offset="100%" stopColor={theme === 'dark' ? '#018786' : '#e0f2fe'} />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.1)" />
                <g className={`transition-all duration-500 ${bloom ? "filter brightness-125 saturate-150" : ""}`}>
                  <path d="M20 36 C12 34 8 26 12 18 C16 10 24 8 30 12 C36 16 40 24 36 32 C32 40 26 38 20 36Z" fill="url(#leafGrad)" />
                  <path d="M10 44 C6 40 8 32 14 30 C18 28 22 30 26 34 C18 36 12 48 10 44Z" fill={theme === 'dark' ? '#BB86FC' : '#ffffff'} opacity="0.8" />
                </g>
              </svg>
            </div>
            
            <div>
              <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-blue-100 dark:text-gray-400 hover:underline mb-1 block">← Dashboard</Link>
              <h1 className="text-4xl font-black text-white drop-shadow-md tracking-tight">Pedagogical Hub</h1>
              <p className="text-blue-50 dark:text-gray-400 font-medium">Manage your identity and synthesized blueprints.</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="bg-white/10 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex gap-2">
             <button 
               onClick={() => setActiveTab("profile")} 
               className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'profile' ? 'bg-white text-[#003366] shadow-xl scale-105' : 'text-white hover:bg-white/10'}`}
             >
               Profile
             </button>
             <button 
               onClick={() => setActiveTab("plans")} 
               className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'plans' ? 'bg-white text-[#003366] shadow-xl scale-105' : 'text-white hover:bg-white/10'}`}
             >
               Library ({plans.length})
             </button>
          </div>
        </div>

        {/* --- TAB CONTENT: PROFILE FORM --- */}
        <div className="max-w-4xl mx-auto">
          {activeTab === "profile" ? (
            <form onSubmit={handleSubmit} className="tm-card p-8 md:p-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 bg-white/50 backdrop-blur-xl border-white/40 dark:bg-[#1E1E24] dark:border-white/5 shadow-2xl">
              
              <div className="space-y-8">
                {/* Identity Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.full_name} 
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} 
                      className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-[#6200EE] outline-none transition-all font-semibold" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Subject Specialization</label>
                    <select 
                      value={profile.subject} 
                      onChange={(e) => setProfile({ ...profile, subject: e.target.value })} 
                      className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-[#6200EE] outline-none transition-all font-semibold appearance-none"
                    >
                      <option value="">Select Subject</option>
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
                </div>

                {/* Academic Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Target Grade Level</label>
                    <select 
                      value={profile.grade_level} 
                      onChange={(e) => setProfile({ ...profile, grade_level: e.target.value })} 
                      className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-[#6200EE] outline-none transition-all font-semibold appearance-none"
                    >
                      <option value="">Select Grade</option>
                      <option>Form 1</option>
                      <option>Form 2</option>
                      <option>Form 3</option>
                      <option>Form 4</option>
                      <option>Form 5</option>
                      <option>Form 6 (Pre-U)</option>
                      <option>College / University</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Educational Institution</label>
                    <input 
                      type="text" 
                      value={profile.school} 
                      onChange={(e) => setProfile({ ...profile, school: e.target.value })} 
                      className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-[#6200EE] outline-none transition-all font-semibold" 
                      required 
                    />
                  </div>
                </div>

                {/* Region Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[#003366]/60 dark:text-white/40 ml-1">Geographic Region</label>
                  <select 
                    value={profile.region} 
                    onChange={(e) => setProfile({ ...profile, region: e.target.value })} 
                    className="w-full rounded-xl px-4 py-4 bg-gray-50 dark:bg-[#2b2b36] border-none text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0EA5E9] dark:focus:ring-[#6200EE] outline-none transition-all font-semibold appearance-none"
                  >
                    <option value="">Select Region</option>
                    <option>Northern Region (Perlis, Kedah, Penang, Perak)</option>
                    <option>Central Region (Selangor, KL, Putrajaya, N. Sembilan)</option>
                    <option>Southern Region (Melaka, Johor)</option>
                    <option>Eastern Region (Pahang, Terengganu, Kelantan)</option>
                    <option>East Malaysia (Sabah, Sarawak, Labuan)</option>
                    <option>Malaysia - Rural</option>
                    <option>Thailand - Rural</option>
                    <option>Indonesia - Rural</option>
                    <option>Philippines - Rural</option>
                    <option>Vietnam - Rural</option>
                    <option>Other ASEAN</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="w-full rounded-2xl py-4 bg-[#003366] dark:bg-[#6200EE] text-white font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
                  >
                    {saving ? "Archiving Identity..." : "Update Identity"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* --- TAB CONTENT: LESSON PLANS GRID --- */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {loadingPlans ? (
                 <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white animate-spin rounded-full"></div>
                    <p className="text-white font-black uppercase tracking-widest text-[10px]">Accessing Synthesized Blueprints...</p>
                 </div>
              ) : plans.length === 0 ? (
                <div className="col-span-full tm-card p-12 text-center bg-white/20 border-white/30 backdrop-blur-xl">
                  <p className="text-white font-bold text-lg">Your Archive is empty.</p>
                  <Link href="/lesson-generator" className="mt-4 inline-block text-xs font-black uppercase tracking-widest text-blue-100 hover:text-white underline underline-offset-8">Generate your first blueprint →</Link>
                </div>
              ) : (
                plans.map((plan, idx) => (
                  <div key={plan.id} className="tm-card p-6 bg-white/90 dark:bg-[#1E1E24] border-white/40 dark:border-white/5 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 fill-mode-both" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-[#0EA5E9]/10 text-[#003366] dark:text-[#BB86FC] text-[10px] font-black uppercase tracking-tighter rounded-full border border-[#0EA5E9]/20">{plan.grade_level}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(plan.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-6">{plan.topic}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedPlan(plan)} className="flex-1 py-3 bg-[#003366] dark:bg-[#6200EE] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">View Blueprint</button>
                      <button onClick={() => handleDeletePlan(plan.id)} className="px-4 py-3 border border-red-200 dark:border-red-900/30 text-red-500 text-[10px] font-black uppercase rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* --- MODAL VIEWER OVERLAY --- */}
        {selectedPlan && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#003366]/60 dark:bg-black/80 backdrop-blur-xl" onClick={() => setSelectedPlan(null)}></div>
            
            {/* Document Modal */}
            <div className="relative w-full max-w-5xl max-h-full overflow-y-auto tm-card bg-white dark:bg-[#1E1E24] p-8 md:p-14 shadow-2xl border-white/20 animate-in zoom-in-95 duration-500">
              
              <button onClick={() => setSelectedPlan(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors z-20">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <header className="mb-12 border-b border-gray-100 dark:border-white/5 pb-10">
                <div className="inline-flex px-4 py-1.5 rounded-full bg-blue-50 dark:bg-purple-900/30 text-[#0EA5E9] dark:text-[#BB86FC] text-[10px] font-black uppercase tracking-widest mb-4">Archived AI Script</div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">{selectedPlan.content.title}</h2>
                <p className="text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-4xl">{selectedPlan.content.overview}</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                
                {/* Left Section: Specifications */}
                <div className="lg:col-span-1 space-y-12">
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#0ea5e9] dark:text-[#BB86FC] mb-6">Learning Objectives</h3>
                    <ul className="space-y-4">
                      {selectedPlan.content.learningObjectives.map((obj, i) => (
                        <li key={i} className="flex gap-4 text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="text-[#0ea5e9] shrink-0 text-lg">●</span> {obj}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#0ea5e9] dark:text-[#BB86FC] mb-6">Materials Required</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedPlan.content.materials.map((m, i) => (
                        <span key={i} className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-[10px] font-black text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 uppercase tracking-widest">{m}</span>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Right Section: Timeline Flow */}
                <div className="lg:col-span-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[#0ea5e9] dark:text-[#BB86FC] mb-10">Strategic Execution Flow</h3>
                  <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#0EA5E9] before:via-[#6200EE] before:to-transparent">
                    {selectedPlan.content.lessonFlow.map((step, i) => (
                      <div key={i} className="relative flex items-center gap-8 group">
                        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#003366] dark:bg-[#6200EE] text-white shrink-0 z-10 shadow-2xl ring-4 ring-white dark:ring-[#1E1E24]">
                           <span className="text-[11px] font-black">{step.timeMin}m</span>
                        </div>
                        <div className="w-full p-6 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 group-hover:border-[#0EA5E9]/30 transition-colors">
                           <p className="text-base font-bold text-gray-800 dark:text-gray-100 leading-relaxed">{step.step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-14 p-8 rounded-3xl bg-blue-50/50 dark:bg-black/40 border-2 border-dashed border-blue-100 dark:border-white/5">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Homework & Assessment</div>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-300 italic leading-relaxed">"{selectedPlan.content.homework}"</p>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-16 pt-10 border-t border-gray-100 dark:border-white/5 flex flex-wrap gap-6 justify-between items-center">
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Archived on</p>
                   <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{new Date(selectedPlan.created_at).toLocaleDateString()} at {new Date(selectedPlan.created_at).toLocaleTimeString()}</p>
                 </div>
                 <button 
                   onClick={() => window.print()} 
                   className="px-10 py-3.5 bg-[#003366] dark:bg-[#6200EE] text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                 >
                   Print Blueprint
                 </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}