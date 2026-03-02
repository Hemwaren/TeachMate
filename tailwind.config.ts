import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // This is correct! It enables the toggle.
  darkMode: "class",
  
  content: [
    // Scans root directories (If you DON'T use a src folder)
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    
    // Scans src directories (If you DO use a src folder)
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        'primary-variant': 'hsl(var(--primary-variant))',

        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        'secondary-variant': 'hsl(var(--secondary-variant))',

        surface: "hsl(var(--surface))",
        error: "hsl(var(--error))",

        'on-primary': 'hsl(var(--on-primary))',
        'on-secondary': 'hsl(var(--on-secondary))',
        'on-background': 'hsl(var(--on-background))',
        'on-surface': 'hsl(var(--on-surface))',
        'on-error': 'hsl(var(--on-error))',
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'soft-lifted': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.07)',
      },
      animation: {
        'aurora': 'aurora 8s ease-in-out infinite',
      },
      keyframes: {
        aurora: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
    },
  },
  plugins: [
    // Note: Since you are using "animate-in" and "fade-in" classes in the code,
    // you MUST have tailwindcss-animate installed: `npm install tailwindcss-animate`
        tailwindcssAnimate
  ],
};
export default config;