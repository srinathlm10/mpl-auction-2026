import type { Config } from "tailwindcss";

// Colours are CSS variables (see globals.css) so the light/dark theme and the
// per-sport accent can change without touching components.
const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: withAlpha("--background"),
        foreground: withAlpha("--foreground"),
        surface: withAlpha("--surface"),
        muted: withAlpha("--muted"),
        border: withAlpha("--border"),
        primary: {
          DEFAULT: withAlpha("--primary"),
          foreground: withAlpha("--primary-fg"),
        },
        accent: withAlpha("--accent"),
        gold: withAlpha("--gold"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 6px 18px -12px rgb(15 23 42 / 0.14)",
        lift: "0 2px 4px rgb(15 23 42 / 0.05), 0 18px 36px -18px rgb(15 23 42 / 0.28)",
      },
      letterSpacing: {
        display: "0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
