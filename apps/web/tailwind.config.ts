import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
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
        focus: "oklch(var(--focus))",
        "focus-ring": "oklch(var(--focus-ring))",

        "success-soft": "oklch(var(--success-soft))",
        "success-soft-ink": "oklch(var(--success-soft-ink))",

        "danger-border": "oklch(var(--danger-border))",
        "danger-soft": "oklch(var(--danger-soft))",
        "danger-soft-strong": "oklch(var(--danger-soft-strong))",
        "danger-ink": "oklch(var(--danger-ink))",
        "danger-ink-strong": "oklch(var(--danger-ink-strong))",
      },
    },
  },
  plugins: [],
};

export default config;
