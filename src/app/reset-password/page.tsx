"use client";

import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  // state for new password form
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // parse error_description from query string (e.g. link expired)
  useEffect(() => {
    const url = new URL(window.location.href);
    const errDesc = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (errDesc) {
      setMsg(decodeURIComponent(errDesc));
      url.search = "";
      window.history.replaceState(null, "", url.toString());
    }

    // if the link contained access_token we should grab the session so
    // Supabase client is aware and we can update the password immediately.
    if (window.location.href.includes("access_token")) {
      (async () => {
        try {
          const { data, error } = await (supabase.auth as any).getSessionFromUrl();
          if (error) {
            console.warn("session parsing error", error.message);
            setMsg(error.message);
          }
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [supabase]);

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords do not match");
      return;
    }
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("✅ Password updated! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    }
  }

  const isError = msg && !msg.includes("✅");

  if (!mounted) return null;

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden transition-colors duration-500
      bg-gradient-to-br from-[#4ea5f7]/70 to-[#0f5ebb]/70
      dark:bg-[#120d1d] dark:from-[#120d1d] dark:to-[#120d1d]"
    >
      <Header links={[{ href: "/", label: "Home" }]} />
      <div className="h-10" />

      <div className="flex min-h-[calc(100vh-80px)] pt-20 items-center justify-center p-4 md:p-8 relative z-10">
        <div className="animate-in fade-in zoom-in-[0.98] duration-1000 ease-out grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 rounded-[2rem] shadow-2xl overflow-hidden
          bg-white/10 backdrop-blur-xl border border-white/30
          dark:bg-[#1E1E24] dark:border dark:border-white/5 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* left panel could display branding/graphics; reuse from login page */}
          <section className="relative flex flex-col justify-between p-10 min-h-[300px] lg:min-h-[600px] overflow-hidden
            bg-transparent dark:bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop')] dark:bg-cover dark:bg-center"
          >
            <div className="absolute inset-0 hidden dark:block bg-black/50 backdrop-blur-[2px]"></div>
            <div className="relative z-10">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] drop-shadow-lg dark:drop-shadow-none">
                Teach<span className="opacity-70 font-light">Mate</span>
              </h1>
              <p className="mt-5 text-lg text-white/90 font-medium max-w-sm drop-shadow-md dark:drop-shadow-none leading-relaxed">
                Enter a new password for your account.
              </p>
            </div>
          </section>

          <section className="flex flex-col justify-center p-8 lg:p-14 bg-white/20 dark:bg-[#1E1E24]">
            <div className="mb-8">
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md dark:drop-shadow-none">
                Reset Password
              </h2>
              <p className="text-white/80 dark:text-white/60 font-medium">
                Set a new password to regain access.
              </p>
            </div>

            <form onSubmit={updatePassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
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
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl px-4 py-3.5 bg-white/90 dark:bg-[#2b2b36] border border-white/20 dark:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-[#6200EE] transition-all"
                required
              />

              {msg && (
                <div className={`text-sm p-4 rounded-xl border backdrop-blur-sm animate-in fade-in ${
                  isError
                    ? "bg-red-500/10 border-red-500/30 text-red-100 dark:text-red-400"
                    : "bg-green-500/10 border-green-500/30 text-green-100 dark:text-green-400"
                }`}>
                  {msg}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full mt-2 rounded-xl py-3.5 text-sm font-bold tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0
                  bg-[#003366] hover:bg-[#002244] hover:shadow-[0_10px_20px_rgba(0,51,102,0.3)]
                  dark:bg-[#6200EE] dark:hover:bg-[#5000c2] dark:hover:shadow-[0_0_20px_rgba(98,0,238,0.5)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
