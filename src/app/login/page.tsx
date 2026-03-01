// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  async function signUp() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return setMsg(error.message);

    setMsg("✅ Signed up! Check your email to confirm (if email confirmation is ON). Then sign in.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">TeachMate Login</h1>
        <p className="text-sm text-gray-600 mt-1">Sign in or create an account</p>

        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {msg && <div className="text-sm text-red-600">{msg}</div>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-black text-white py-2 font-semibold disabled:opacity-60"
            type="submit"
          >
            {loading ? "Loading..." : "Sign In"}
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={signUp}
            className="w-full rounded-lg border py-2 font-semibold disabled:opacity-60"
          >
            Create Account
          </button>
        </form>
      </div>
    </main>
  );
}