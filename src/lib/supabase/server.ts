// src/lib/supabase/server.ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        // ✅ IMPORTANT: do NOT set cookies here (it will crash in Server Components)
        // Only Route Handlers / Server Actions can set cookies.
        set() {},
        remove() {},
      },
    }
  );
}