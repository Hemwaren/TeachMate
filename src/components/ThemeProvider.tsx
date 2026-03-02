"use client";

import { createClient } from "@/lib/supabase/client";
import React, { createContext, useContext, useEffect, useState } from "react";

// 1. Define the context shape
type ThemeContextType = {
  theme: string;
  toggleTheme: () => void;
};

// 2. Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 3. Export the hook so Header.tsx can use it
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with a safe default to avoid null errors in components
  const [theme, setTheme] = useState<string>("light");
  const [mounted, setMounted] = useState(false);
  const [anim, setAnim] = useState(false);
  const supabase = createClient();

  // Load initial theme
  useEffect(() => {
    setMounted(true);
    
    async function loadInitialTheme() {
      try {
        // 1. Check Local Storage
        const stored = localStorage.getItem("tm-theme");
        if (stored === "light" || stored === "dark") {
          applyTheme(stored);
        } else {
          // 2. Check System Preference
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          applyTheme(prefersDark ? "dark" : "light");
        }

        // 3. Sync from Supabase (if logged in)
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.theme) {
          applyTheme(user.user_metadata.theme);
        }
      } catch (e) {
        console.error("Theme load error", e);
      }
    }
    
    loadInitialTheme();
  }, [supabase.auth]);

  const applyTheme = (t: string) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("tm-theme", t);
  };

  const toggleTheme = () => {
    setAnim(true);
    const newTheme = theme === "dark" ? "light" : "dark";
    
    applyTheme(newTheme);

    // Update server metadata in background
    supabase.auth.updateUser({ data: { theme: newTheme } }).catch(() => {});
    
    // Reset animation state
    setTimeout(() => setAnim(false), 400);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen opacity-0" />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="min-h-screen transition-colors duration-500">
        {children}

        {/* Floating Toggle Button (Preserved from your code) */}
        <button
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={toggleTheme}
          className="fixed right-6 bottom-6 z-[100] p-2 rounded-full shadow-2xl bg-[#003366] dark:bg-[#6200EE] text-white w-14 h-14 flex items-center justify-center transition-transform hover:scale-110 active:scale-90"
        >
          {theme === "dark" ? (
            <svg 
              className={anim ? "transform rotate-180 transition-transform duration-300" : "transition-transform duration-300"} 
              width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
            </svg>
          ) : (
            <svg 
              className={anim ? "transform rotate-180 transition-transform duration-300" : "transition-transform duration-300"} 
              width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </ThemeContext.Provider>
  );
}