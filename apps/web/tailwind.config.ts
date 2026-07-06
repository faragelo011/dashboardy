import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
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
        "accent-2": "oklch(var(--accent-2))",
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
        "warn-soft-ink": "oklch(var(--warn-soft-ink))",

        "danger-border": "oklch(var(--danger-border))",
        "danger-soft": "oklch(var(--danger-soft))",
        "danger-soft-strong": "oklch(var(--danger-soft-strong))",
        "danger-ink": "oklch(var(--danger-ink))",
        "danger-ink-strong": "oklch(var(--danger-ink-strong))",

        "viz-1": "oklch(var(--viz-1))",
        "viz-2": "oklch(var(--viz-2))",
        "viz-3": "oklch(var(--viz-3))",
        "viz-4": "oklch(var(--viz-4))",
        "viz-5": "oklch(var(--viz-5))",
        "viz-6": "oklch(var(--viz-6))",
        "viz-7": "oklch(var(--viz-7))",
        "viz-8": "oklch(var(--viz-8))",
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        ds: "var(--radius-sm)",
        "ds-md": "var(--radius-md)",
        "ds-lg": "var(--radius-lg)",
        "ds-xl": "var(--radius-xl)",
        pill: "var(--radius-full)",
      },
      boxShadow: {
        "ds-xs": "var(--shadow-xs)",
        "ds-sm": "var(--shadow-sm)",
        "ds-card": "var(--shadow-card)",
        "ds-md": "var(--shadow-md)",
        "ds-lg": "var(--shadow-lg)",
        "ds-focus": "var(--shadow-focus)",
      },
      animation: {
        "fade-in-up": "dby-fade-in-up var(--duration-entrance) var(--ease-out) forwards",
        "fade-in": "dby-fade-in var(--duration-slow) var(--ease-out) forwards",
        pulse: "dby-pulse 1.5s var(--ease-in-out) infinite",
      },
      keyframes: {
        "dby-fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "dby-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "dby-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        "@media (prefers-reduced-motion: reduce)": {
          ".animate-fade-in-up, .animate-fade-in, .animate-pulse": {
            animation: "none !important",
          },
        },
      });
    }),
  ],
};

export default config;
