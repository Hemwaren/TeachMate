"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  // --- State Management ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [school, setSchool] = useState("");
  const [region, setRegion] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  
  // Toggle State
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Auth Handlers ---
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setMsg(error.message);

    router.push("/dashboard");
    router.refresh();
  }

  // OAuth with Google (or any provider configured in Supabase)
  async function signInWithGoogle() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // send user directly to dashboard – the dashboard effect now knows
        // how to parse the OAuth callback from the URL and persist the
        // session before doing its user check.
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
    }

    if (data?.url) {
      // navigate to the URL that supabase returns (provider auth page)
      window.location.href = data.url;
    }
    // the user will be redirected by Supabase; if the redirect comes back to
    // this page we handle the callback in a useEffect below
  }

  async function signUp() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          subject,
          grade_level: gradeLevel,
          school,
          region,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) return setMsg(json?.error || "Signup failed");

      const userId = json.userId;
      if (userId) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (!signInError) {
          setMsg("✅ Account created — signing you in...");
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMsg("✅ Account created. Check your email to confirm, then sign in.");
        return;
      }

      setMsg("✅ Signed up! Check your email to confirm. Then sign in to complete your profile.");
    } catch (err: any) {
      setLoading(false);
      setMsg(err?.message ?? String(err));
    }
  }

  const isError = msg && !msg.includes("✅");

  // parse OAuth redirect from Supabase
  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        // TS types for SupabaseAuthClient currently don't include
        // `getSessionFromUrl`, so coerce to any. This is a safe shim
        // since the runtime certainly provides the method.
        const { data, error } = await (supabase.auth as any).getSessionFromUrl();
        if (error) {
          console.warn("OAuth redirect error", error.message);
          setMsg(error.message);
        }
        if (data?.session) {
          // ensure the user has a profile record (for oauth users we can't rely
          // on the manual signup endpoint). `upsert` will create one if absent.
          try {
            await supabase.from("profiles").upsert({
              id: data.session.user.id,
              full_name: data.session.user.user_metadata?.full_name ||
                data.session.user.user_metadata?.name ||
                null,
            });
          } catch (upsertErr) {
            console.warn("profile upsert failed", upsertErr);
          }

          // make absolutely sure the session is stored in localStorage before
          // navigating; `getSessionFromUrl` usually handles this but the library
          // can sometimes write asynchronously and our redirect race could lead
          // to Dashboard seeing `getUser()` return null.
          try {
            await supabase.auth.setSession(data.session);
            await supabase.auth.getSession();
          } catch (e) {
            console.warn("error persisting session", e);
          }

          router.push("/dashboard");
        }
      } catch (e: any) {
        console.error(e);
      }
    };

    // Only run on initial mount, and only if there is a hash/query indicating
    // an OAuth response.
    if (window.location.href.includes("access_token") || window.location.href.includes("error")) {
      handleOAuthRedirect();
    }
  }, [supabase, router]);

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden transition-colors duration-500
      /* Theme A (Light): Luminous Aether */
      bg-gradient-to-br from-[#4ea5f7]/70 to-[#0f5ebb]/70
      /* Theme B (Dark): Midnight Horizon */
      dark:bg-[#120d1d] dark:from-[#120d1d] dark:to-[#120d1d]"
    >
      {/* 
        ====================================================================
        BACKGROUND LAYERS: THE DUAL REALITIES
        ====================================================================
      */}

      {/* Header bar */}
      <Header links={[{ href: "/", label: "Home" }]} />
      {/* spacer to push page content below fixed header */}
      <div className="h-10" />

      {/* LIGHT MODE: Zero-Gravity 3D Shapes */}
      <div className="absolute inset-0 pointer-events-none dark:hidden overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[700px] w-[700px] rounded-full bg-[#6dbdfc] blur-[120px] opacity-50"></div>
        <div className="absolute -bottom-32 -left-32 h-[700px] w-[700px] rounded-full bg-[#2b7de0] blur-[120px] opacity-50"></div>
        
        {/* Floating Donut */}
        <div className="absolute top-[15%] left-[8%] opacity-70 animate-[bounce_6s_infinite_ease-in-out]">
          <div className="w-40 h-40 rounded-full border-[30px] border-l-transparent border-t-white/30 border-r-white/30 border-b-white/30 transform rotate-[-25deg] shadow-2xl backdrop-blur-md"></div>
        </div>

        {/* Floating Squiggle */}
        <div className="absolute bottom-[15%] right-[8%] opacity-80 animate-[pulse_4s_infinite_ease-in-out]">
          <svg width="180" height="180" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="rgba(255,255,255,0.2)" d="M45.7,-58.3C58.9,-46.3,69.1,-31.2,73.6,-14.2C78.1,2.8,76.9,21.7,68.4,37.3C59.9,52.9,44.1,65.2,27.1,70.9C10.1,76.6,-8.1,75.7,-24.6,69.2C-41.1,62.7,-55.9,50.6,-65.4,35.6C-74.9,20.6,-79.1,2.7,-74.6,-13.2C-70.1,-29.1,-56.9,-43,-42.6,-54.6C-28.3,-66.2,-12.9,-75.5,1.9,-77.8C16.7,-80.1,32.5,-70.3,45.7,-58.3Z" transform="translate(100 100)" className="backdrop-blur-xl" />
          </svg>
        </div>
      </div>

      {/* DARK MODE: Cinematic Nebula & Mountain Silhouette */}
      <div className="hidden dark:block absolute inset-0 pointer-events-none z-0">
        {/* Nebula Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6200EE]/20 blur-[150px] rounded-full"></div>
        {/* Mountain Horizon Gradient */}
        <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-[#05030a] via-[#120d1d]/90 to-transparent"></div>
      </div>


      {/* 
        ====================================================================
        THE PORTAL: SPLIT-SCREEN CARD
        ====================================================================
      */}
      <div className="flex min-h-[calc(100vh-80px)] pt-20 items-center justify-center p-4 md:p-8 relative z-10">
        
        {/* Entrance Animation Wrapper */}
        <div className="animate-in fade-in zoom-in-[0.98] duration-1000 ease-out grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 rounded-[2rem] shadow-2xl overflow-hidden
          /* Light Container: Aerogel Glass */
          bg-white/10 backdrop-blur-xl border border-white/30
          /* Dark Container: Stealth Matte */
          dark:bg-[#1E1E24] dark:border dark:border-white/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          
          {/* --- LEFT PANEL: VISUAL NARRATIVE --- */}
          <section className="relative flex flex-col justify-between p-10 min-h-[300px] lg:min-h-[600px] overflow-hidden
            /* Light: Blends transparently */
            bg-transparent 
            /* Dark: Cinematic Image */
            dark:bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop')] dark:bg-cover dark:bg-center"
          >
            {/* Dark Mode Overlay */}
            <div className="absolute inset-0 hidden dark:block bg-black/50 backdrop-blur-[2px]"></div>
            
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-white uppercase backdrop-blur-md shadow-sm">
                <span className="mr-3 flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                AI-Powered Platform
              </div>

              <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-lg dark:drop-shadow-none">
                Teach<span className="opacity-70 font-light">Mate</span>
              </h1>
              <p className="mt-5 text-lg text-white/90 font-medium max-w-sm drop-shadow-md dark:drop-shadow-none leading-relaxed">
                Capturing Moments. <br/> Creating Knowledge.
              </p>
            </div>

            <div className="relative z-10 mt-auto hidden lg:block">
              <div className="flex gap-2 items-center">
                <div className="h-1.5 w-10 bg-white rounded-full shadow-lg"></div>
                <div className="h-1.5 w-2 bg-white/40 rounded-full hover:bg-white/60 transition-colors cursor-pointer"></div>
                <div className="h-1.5 w-2 bg-white/40 rounded-full hover:bg-white/60 transition-colors cursor-pointer"></div>
              </div>
              <p className="mt-6 text-xs text-white/60 font-medium tracking-wide">
                © {new Date().getFullYear()} TeachMate Inc.
              </p>
            </div>
          </section>

          {/* --- RIGHT PANEL: FUNCTIONAL FORM --- */}
          <section className="flex flex-col justify-center p-8 lg:p-14
            /* Light: Frosted readability layer */
            bg-white/20 
            /* Dark: Solid Stealth Matte */
            dark:bg-[#1E1E24]"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md dark:drop-shadow-none">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-white/80 dark:text-white/60 font-medium">
                {isSignUp ? "Join our community of educators." : "Sign in to access your dashboard."}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); isSignUp ? signUp() : signIn(e); }} className="space-y-4">
              
              {/* 
                =================================================================
                THE MAGICAL TOGGLE (SMOOTH GRID TRANSITION)
                This uses a CSS Grid trick to push fields down with ZERO jumping.
                =================================================================
              */}
              <div 
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
                  isSignUp ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`space-y-4 pb-4 transform transition-transform duration-500 ease-in-out delay-75 ${
                    isSignUp ? "translate-y-0" : "translate-y-8"
                  }`}>
                    <input
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                      required={isSignUp}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        list="subjects"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                      />
                      <datalist id="subjects">
                        <option>English</option>
                        <option>Mathematics</option>
                        <option>Science</option>
                        <option>History</option>
                        <option>Other</option>
                      </datalist>

                      <input
                        list="grades"
                        placeholder="Grade"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                      />
                      <datalist id="grades">
                        <option>Primary School</option>
                        <option>Lower Secondary</option>
                        <option>Upper Secondary</option>
                        <option>College / University</option>
                        <option>Other</option>
                      </datalist>
                    </div>

                    <input
                      placeholder="School Name"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                    />

                    <input
                      list="regions"
                      placeholder="Region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                    />
                    <datalist id="regions">
                      <option>Northern Region</option>
                      <option>Central Region</option>
                      <option>Southern Region</option>
                      <option>Eastern Region</option>
                      <option>East Malaysia</option>
                    </datalist>
                  </div>
                </div>
              </div>

              {/* --- Core Inputs: Email & Password --- */}
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0f5ebb] dark:text-gray-400 dark:hover:text-[#6200EE] transition-colors"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745A10.51 10.51 0 0019.5 9.5c0-4.97-6-9-10.5-9-1.802 0-3.456.643-4.78 1.714L3.28 2.22zm-2.008 3.39L2.85 7.18C2.296 7.89 1.88 8.665 1.638 9.5c0 3.737 4.544 7.5 8.862 7.5 1.55 0 3.013-.48 4.256-1.312l1.632 1.633a.75.75 0 001.06-1.06l-16.177-16.176z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* --- Soft Alert Messages --- */}
              {msg && (
                <div className={`text-sm p-4 rounded-xl border backdrop-blur-sm animate-in fade-in ${
                  isError 
                    ? "bg-red-500/10 border-red-500/30 text-red-100 dark:text-red-400" 
                    : "bg-green-500/10 border-green-500/30 text-green-100 dark:text-green-400"
                }`}>
                  {msg}
                </div>
              )}

              {/* --- Action Button --- */}
              <button
                disabled={loading}
                type="submit"
                className="w-full mt-2 rounded-xl py-3.5 text-sm font-bold tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0
                /* Light: Authoritative Navy */
                bg-[#003366] hover:bg-[#002244] hover:shadow-[0_10px_20px_rgba(0,51,102,0.3)]
                /* Dark: Neon Beacon */
                dark:bg-[#6200EE] dark:hover:bg-[#5000c2] dark:hover:shadow-[0_0_20px_rgba(98,0,238,0.5)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </button>

              {/* --- Social Login (Secondary) --- */}
              <div className="mt-6">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/20 dark:border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-white/60 dark:text-white/40 text-xs uppercase tracking-wider">Or continue with</span>
                  <div className="flex-grow border-t border-white/20 dark:border-white/10"></div>
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-[#2b2b36] dark:hover:bg-[#363644] border border-white/20 dark:border-transparent text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Google
                  </button>
                  <button type="button" className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-[#2b2b36] dark:hover:bg-[#363644] border border-white/20 dark:border-transparent text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
                    GitHub
                  </button>
                </div>
              </div>

              {/* --- Form Toggle --- */}
              <div className="mt-6 text-center text-sm">
                <span className="text-white/80 dark:text-gray-400">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setMsg(null);
                  }}
                  className="ml-2 font-bold text-white hover:text-blue-200 dark:hover:text-[#b47af5] transition-colors decoration-2 hover:underline underline-offset-4"
                >
                  {isSignUp ? "Sign In" : "Register"}
                </button>
              </div>

            </form>
          </section>
        </div>
      </div>
    </main>
  );
}