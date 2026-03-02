This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

This README summarizes the "God Tier" architectural and functional upgrades implemented for the **Profile** and **Lesson Architect** modules of TeachMate.

---

# 🍎 TeachMate Module Updates: The Pedagogical Hub

## 1. 👤 Profile Module: The "Pedagogical Hub"
The Profile page was transformed from a static form into a dual-purpose control center.

### 🌟 Key Features
*   **Dual-Reality Tab Switcher:** A high-fidelity toggle to switch between **Identity** (Profile data) and **Library** (Archived blueprints).
*   **The Knowledge Tree (SVG Bloom):** A custom SVG visual that physically "blooms" and glows when the user saves their profile, symbolizing pedagogical growth.
*   **Completeness Engine:** A real-time tracking pill that calculates profile completion percentage.
*   **The Archive (Library):** A grid-based storage system that retrieves every lesson plan saved by the teacher from Supabase.
*   **Blueprint Viewer (Modal):** A distraction-free document viewer that allows teachers to reopen archived plans in a pixel-perfect, full-screen overlay.

### 🎨 Visuals & UX
*   **Glassmorphic Cards:** Uses `backdrop-blur-xl` and `bg-white/50` to float over the animated blue/purple backgrounds.
*   **Theme Integration:** The Knowledge Tree automatically adjusts its gradient colors (Teal for Light, Purple for Dark) to match the global theme.

---

## 2. 📝 Lesson Architect Module: Strategic Command Center
The Lesson Generator was upgraded into an AI-powered synthesis engine with real-time classroom utility.

### 🌟 "Wow" Features (The God Tier Additions)
*   **The Differentiation Prism:** Allows teachers to "refract" a standard lesson into **Remedial** (Simplified/Scaffolded) or **Enrichment** (Deep-dive/Challenging) versions with one click.
*   **The Icebreaker Spark:** A specialized AI route that generates three high-engagement hooks (Provocative, Quick-Fire, and Real-World) to start the class.
*   **Live Session HUD (Teleprompter):** 
    *   A distraction-free, high-contrast **Classroom HUD**.
    *   **Massive Focus Typography** for reading while moving around the room.
    *   **Phase Progress Tracker** with a circular timer for the current instruction.
    *   **AI Command Strip:** Real-time suggested "Check-in" questions to gauge student understanding.

### 🛠 Technical Enhancements
*   **5E Instructional Model:** The AI is now forced to follow the *Engage, Explore, Explain, Elaborate, Evaluate* framework.
*   **Supabase Persistence:** Integrated `saveToLibrary` functionality using `jsonb` column types to store complex structured data.
*   **Professional PDF Export:** Integrated `html2pdf.js` with scale-2 resolution and "System Clean" logic (hiding buttons during export).

---

## 3. 🧠 Resilient AI Infrastructure (Backend)
To solve "API Leaks" and "Service Busy" (503) errors, the backend was completely re-engineered for reliability.

*   **Model Fallback System:** The system now automatically cycles through `gemini-2.5-flash`, `gemini-1.5-flash`, and `gemini-1.5-pro` if one is busy.
*   **Smart Retry Logic:** Implemented 1000ms delay retries for overloaded servers and instant-skipping for 404/Not Found model errors.
*   **JSON Sanitization:** Robust regex cleaning ensures that even if the AI returns markdown or text preambles, the system parses the JSON data perfectly.

---

## 🎨 Global Visual Identity
Across both modules, the **Dual-Reality Gateway** is strictly enforced:
*   **Luminous Aether (Light):** `#4ea5f7` to `#0f5ebb` (Blue) with floating 3DToris and frosted Aerogel Glass.
*   **Midnight Horizon (Dark):** `#120d1d` (Deep Violet) with Electric Purple accents and Stealth Matte panels.

---
**Status:** All modules are synchronized, real-time ready, and database-persisted.
