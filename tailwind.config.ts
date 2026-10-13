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
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
