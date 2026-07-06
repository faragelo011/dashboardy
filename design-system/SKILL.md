---
name: dashboardy-design
description: Use this skill to generate well-branded interfaces and assets for Dashboardy, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

Dashboardy is an expert-authored, business-consumed internal BI platform. Its design system is **“Signal”**: bold and modern — electric-indigo signature with a violet secondary, Space Grotesk display + IBM Plex Sans body + IBM Plex Mono data, rounded surfaces with soft elevation, a confident balanced scale, and vivid data-viz — equally polished in light and dark.

**Start here**
- `readme.md` — full design guide: sources, content/copy rules, visual foundations, iconography, component index, caveats.
- `styles.css` — the only stylesheet to link; it `@import`s every token + font file.
- `tokens/` — colors (oklch, light+dark, accent-2 + brand gradient), typography, spacing/radii, elevation (soft shadows), motion, base reset.
- `components/` — React primitives (Forms, Feedback, Navigation, Data-display). Each has a `.jsx`, `.d.ts`, and `.prompt.md`.
- `guidelines/` — foundation specimen cards. `ui_kits/app/` — an interactive app recreation.

**If creating visual artifacts** (slides, mocks, throwaway prototypes): copy the tokens/assets you need and produce static HTML the user can view. Link `styles.css`, then use the CSS custom properties directly or mount components from the compiled bundle (`window.DashboardyDesignSystem_787e56`). Use light OR dark via `data-theme` on `<html>`.

**If working on production code**: reuse the token names (`--color-accent`, `--color-accent-2`, `--gradient-brand`, `--text-muted`, `--surface-card`, `--radius-md`, `--shadow-card`…) and component contracts rather than reinventing.

**Non-negotiables:** Space Grotesk (display/numbers) + IBM Plex Sans (body) + IBM Plex Mono (data); electric-indigo accent (hue ~272) with violet secondary (305); rounded shape (8px controls / 12px cards / 16px widgets / pill badges); soft, cool-tinted elevation (never heavy); balanced 14–15px text; sentence-case copy with UPPERCASE kickers; Lucide icons (stroke 2); status never by color alone (dot + label); honor `prefers-reduced-motion`; the brand gradient is for flourishes only; no emoji, no invented logo (Dashboardy is a Space Grotesk wordmark).

If the user invokes this skill without other guidance, ask what they want to build or design, ask a few focused questions, and act as an expert designer who outputs HTML artifacts *or* production code, depending on the need.
