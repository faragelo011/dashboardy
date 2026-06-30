import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  // Theme toggle sets data-theme="dark" on <html>; dark: variants respond to it.
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        "ink-strong": "oklch(var(--ink-strong))",
        ink: "oklch(var(--ink))",
        "ink-muted": "oklch(var(--ink-muted))",
        "ink-faint": "oklch(var(--ink-faint))",

        "surface-app": "oklch(var(--surface-app))",
        "surface-0": "oklch(var(--surface-0))",
        "surface-1": "oklch(var(--surface-1))",
        "surface-2": "oklch(var(--surface-2))",
        "surface-3": "oklch(var(--surface-3))",
        "surface-4": "oklch(var(--surface-4))",
        "surface-5": "oklch(var(--surface-5))",

        "border-0": "oklch(var(--border-0))",
        "border-1": "oklch(var(--border-1))",
        "border-2": "oklch(var(--border-2))",
        "border-3": "oklch(var(--border-3))",
        "border-4": "oklch(var(--border-4))",

        accent: "oklch(var(--accent))",
        "accent-hover": "oklch(var(--accent-hover))",
        "accent-active": "oklch(var(--accent-active))",
        "accent-soft": "oklch(var(--accent-soft))",
        "accent-soft-ink": "oklch(var(--accent-soft-ink))",
        "accent-border": "oklch(var(--accent-border))",
        focus: "oklch(var(--focus))",
        "focus-ring": "oklch(var(--focus-ring))",

        success: "oklch(var(--success))",
        "success-soft": "oklch(var(--success-soft))",
        "success-soft-ink": "oklch(var(--success-soft-ink))",

        warn: "oklch(var(--warn))",
        "warn-soft": "oklch(var(--warn-soft))",

        "danger-border": "oklch(var(--danger-border))",
        "danger-soft": "oklch(var(--danger-soft))",
        "danger-soft-strong": "oklch(var(--danger-soft-strong))",
        "danger-ink": "oklch(var(--danger-ink))",
        "danger-ink-strong": "oklch(var(--danger-ink-strong))",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        // Dense system: tight radii. 4px for inputs/buttons, 6px for cards.
        ds: "4px",
        "ds-lg": "6px",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 1s ease-out forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        "@media (prefers-reduced-motion: reduce)": {
          ".animate-fade-in-up, .animate-fade-in": {
            animation: "none !important",
          },
        },
      });
    }),
  ],
};

export default config;
