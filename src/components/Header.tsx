"use client";

import { useTheme } from "@/components/ThemeProvider";
import { createClient } from "@/lib/supabase/client"; // <-- Import Supabase
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface NavLink {
  href: string;
  label: string;
}

export default function Header({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Connect to our Global Theme Provider
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Auth State
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // 1. Check initial scroll
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // 2. Check initial Auth Session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();

    // 3. Listen for login/logout events dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    router.push("/login");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] w-full transition-all duration-500 ease-in-out ${
        scrolled
          ? "bg-white/70 dark:bg-[#120d1d]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* LEFT: Branding & Logo */}
          <Link href="/" className="group flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#003366] dark:from-[#BB86FC] dark:to-[#6200EE] shadow-lg shadow-blue-500/20 dark:shadow-purple-500/20">
              <svg className="h-6 w-6 text-white group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white drop-shadow-sm dark:drop-shadow-none">
              Teach<span className="font-light opacity-70">Mate</span>
            </span>
          </Link>

          {/* CENTER: Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-sm font-semibold tracking-wide transition-colors duration-300 ${
                    isActive 
                      ? "text-[#003366] dark:text-[#BB86FC]" 
                      : "text-gray-600 dark:text-gray-300 hover:text-[#003366] dark:hover:text-[#BB86FC]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 w-full h-0.5 bg-[#003366] dark:bg-[#BB86FC] rounded-full animate-in fade-in slide-in-from-left-2"></span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT: Actions & Theme Toggle */}
          <div className="hidden md:flex items-center space-x-6">
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              <div className="relative w-5 h-5">
                <svg className={`absolute inset-0 transform transition-transform duration-500 ${isDark ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <svg className={`absolute inset-0 transform transition-transform duration-500 ${isDark ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
            </button>

            <div className="flex items-center space-x-4 border-l border-gray-300 dark:border-white/20 pl-6">
              {user ? (
                // LOGGED IN VIEW
                <button 
                  onClick={handleSignOut} 
                  className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                // LOGGED OUT VIEW
                <>
                  <Link href="/login" className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-[#003366] dark:hover:text-[#BB86FC] transition-colors">
                    Sign In
                  </Link>
                  <Link href="/login?tab=signup" className="btn btn-primary px-5 py-2 text-sm shadow-md">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* MOBILE: Hamburger Button */}
          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300">
               {isDark ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               )}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-gray-600 dark:text-gray-300 focus:outline-none">
              {mobileMenuOpen ? (
                <svg className="h-6 w-6 animate-in spin-in-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-6 w-6 animate-in spin-in-[-90deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE: Dropdown Menu */}
      <div className={`md:hidden absolute top-full left-0 w-full overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-white/95 dark:bg-[#1E1E24]/95 backdrop-blur-2xl border-b border-gray-200 dark:border-white/10 px-4 py-6 shadow-2xl flex flex-col space-y-4">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className={`block px-4 py-3 rounded-xl text-base font-semibold transition-colors ${pathname === link.href ? "bg-blue-50 dark:bg-purple-900/30 text-[#003366] dark:text-[#BB86FC]" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
              {link.label}
            </Link>
          ))}
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10 flex flex-col space-y-3 px-2">
            {user ? (
               // LOGGED IN MOBILE VIEW
               <button onClick={handleSignOut} className="w-full py-3 text-center text-sm font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 rounded-xl transition-colors">
                 Sign Out
               </button>
            ) : (
               // LOGGED OUT MOBILE VIEW
               <>
                 <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-sm font-bold text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-white/20 rounded-xl">Sign In</Link>
                 <Link href="/login?tab=signup" onClick={() => setMobileMenuOpen(false)} className="w-full btn btn-primary py-3 text-center text-sm">Get Started</Link>
               </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}