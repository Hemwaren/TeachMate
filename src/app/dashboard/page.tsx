"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, SVGProps, useEffect, useState } from "react";

// --- Type Definitions ---
interface Profile {
  id: string;
  full_name: string;
}

interface DashboardCardProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  index: number; 
  isComplete?: boolean;
}

// --- Dynamic Greeting Logic ---
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// --- Dashboard Card Component ---
const DashboardCard = ({ href, icon, title, description, index }: DashboardCardProps) => (
  <Link 
    href={href} 
    className="group block h-full animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="tm-card h-full p-8 flex flex-col relative overflow-hidden z-10 transition-all duration-300
      bg-white/90 backdrop-blur-xl border-white/40
      dark:bg-[#1E1E24] dark:border-white/5
    ">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(98,0,238,0.1),_transparent_50%)]"></div>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg bg-blue-50 text-[#003366] group-hover:bg-[#0EA5E9] group-hover:text-white dark:bg-white/5 dark:text-[#BB86FC] dark:group-hover:bg-[#6200EE] dark:group-hover:text-white">
        {icon}
      </div>
      <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-[#003366] dark:group-hover:text-[#BB86FC] transition-colors">
        {title}
      </h3>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed flex-grow">
        {description}
      </p>
      <div className="mt-6 flex items-center text-sm font-bold opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-[#0EA5E9] dark:text-[#BB86FC]">
        Launch tool 
        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </div>
  </Link>
);

// --- Main Dashboard Page Component ---
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const greeting = getGreeting();

  useEffect(() => {
    const init = async () => {
      // if we were redirected directly to /dashboard after an OAuth flow
      // the URL may still contain the access_token.  Try to parse it and
      // persist a session before we call getUser().
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
          console.warn("dashboard oauth redirect parse failed", e);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);
      setTimeout(() => setLoading(false), 600);
    };

    init();
  }, [router, supabase]);

  // --- God Tier Loading State ---
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
      
      {/* Light Mode: Luminous Aether Full Background + Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none dark:hidden bg-gradient-to-br from-[#4ea5f7]/70 to-[#0f5ebb]/70 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-40"></div>
        <div className="absolute -bottom-32 -left-32 h-[700px] w-[700px] rounded-full bg-[#2b7de0] blur-[120px] opacity-40"></div>
      </div>
      
      {/* Dark Mode: Midnight Horizon Radial Glow */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_rgba(98,0,238,0.15),_transparent_60%)]"></div>

      {/* Header */}
      <Header links={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/profile", label: "Profile" }
      ]} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        
        {/* --- Hero / Welcome Section --- */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center space-x-2 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 dark:bg-green-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-50 dark:text-gray-400">System Online</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md dark:drop-shadow-none">
            {greeting}, <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white dark:from-[#BB86FC] dark:to-[#6200EE]">
              {profile?.full_name || user?.email?.split('@')[0]}
            </span>
          </h1>
          <p className="mt-3 text-lg font-medium text-blue-100 dark:text-gray-400 drop-shadow-sm dark:drop-shadow-none">
            What are we teaching today?
          </p>
        </div>

        {/* --- Missing Profile Banner (Soft Alert) --- */}
        {!profile && (
          <div className="mb-10 animate-in fade-in zoom-in-95 duration-500 delay-300 fill-mode-both">
            <div className="relative overflow-hidden rounded-2xl border border-white/40 dark:border-amber-500/30 bg-white/20 dark:bg-amber-500/10 backdrop-blur-md p-6 shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-20 dark:opacity-5 text-white dark:text-amber-500">
                <IconUserCircle className="w-32 h-32" />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-white/30 dark:bg-amber-500/20 p-2 rounded-lg text-white dark:text-amber-400 backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white dark:text-amber-300 drop-shadow-sm dark:drop-shadow-none">Action Required</h3>
                    <p className="text-blue-50 dark:text-amber-400/80 font-medium drop-shadow-sm dark:drop-shadow-none">Please complete your profile configuration to unlock the full potential of TeachMate.</p>
                  </div>
                </div>
                <Link href="/profile" className="whitespace-nowrap rounded-xl bg-white text-[#003366] dark:bg-amber-500 dark:text-white px-6 py-2.5 text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* --- "Knowledge Constellation" Card Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <DashboardCard
            index={1}
            href="/lesson-generator"
            title="Lesson Plan Generator"
            description="Instantly generate structured, AI-assisted lesson plans tailored to your curriculum."
            icon={<IconDocument className="w-7 h-7" />}
          />
          <DashboardCard
            index={2}
            href="/quiz-generator"
            title="Quiz & Worksheet"
            description="Create engaging quizzes and comprehensive worksheets with auto-generated answer keys."
            icon={<IconClipboardCheck className="w-7 h-7" />}
          />
          <DashboardCard
            index={3}
            href="/students"
            title="Student Roster"
            description="Monitor student progress, track scores, and easily identify at-risk learners."
            icon={<IconUsers className="w-7 h-7" />}
          />
          <DashboardCard
            index={4}
            href="/analytics"
            title="Class Analytics"
            description="Deep dive into macro performance metrics and uncover weak topical areas."
            icon={<IconChartBar className="w-7 h-7" />}
          />
          <DashboardCard
            index={5}
            href="/interventions"
            title="AI Interventions"
            description="Receive targeted, AI-powered pedagogical strategies for struggling students."
            icon={<IconSparkles className="w-7 h-7" />}
          />
          <DashboardCard
            index={6}
            href="/profile"
            title="Configuration"
            description="Update your teaching preferences, subjects, and regional settings."
            icon={<IconUserCircle className="w-7 h-7" />}
          />
        </div>
      </main>
    </div>
  );
}

// --- High-Fidelity SVG Icons ---
const IconDocument = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconClipboardCheck = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
  </svg>
);
const IconUsers = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const IconChartBar = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const IconSparkles = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.456-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.456-2.456L17.25 14.25l.398 1.197a3.375 3.375 0 002.456 2.456L21 18l-1.197.398a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);
const IconUserCircle = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);