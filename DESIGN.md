---
name: Dashboardy
description: Technical, dense, dual-theme (light + dark) workspace administration for data and reporting.
colors:
  ink-strong: "oklch(20% 0.01 260)"
  ink: "oklch(32% 0.012 260)"
  ink-muted: "oklch(50% 0.012 260)"
  ink-faint: "oklch(62% 0.010 260)"
  surface-app: "oklch(99% 0.002 250)"
  surface-0: "oklch(100% 0 0)"
  surface-1: "oklch(98.5% 0.003 250)"
  surface-2: "oklch(97% 0.004 250)"
  surface-3: "oklch(94% 0.005 250)"
  surface-4: "oklch(91% 0.006 250)"
  surface-5: "oklch(88% 0.007 250)"
  border-0: "oklch(95% 0.004 260)"
  border-1: "oklch(90% 0.004 260)"
  border-2: "oklch(84% 0.006 260)"
  border-3: "oklch(76% 0.008 260)"
  border-4: "oklch(66% 0.010 260)"
  accent: "oklch(52% 0.18 262)"
  accent-hover: "oklch(46% 0.19 262)"
  accent-active: "oklch(40% 0.20 262)"
  accent-soft: "oklch(96% 0.02 262)"
  accent-soft-ink: "oklch(40% 0.13 262)"
  accent-border: "oklch(84% 0.04 262)"
  focus: "oklch(52% 0.18 262)"
  focus-ring: "oklch(70% 0.12 262)"
  success: "oklch(52% 0.13 155)"
  success-soft: "oklch(96% 0.02 155)"
  success-soft-ink: "oklch(36% 0.09 155)"
  warn: "oklch(60% 0.14 70)"
  warn-soft: "oklch(96% 0.04 70)"
  danger-border: "oklch(86% 0.04 25)"
  danger-soft: "oklch(96% 0.03 25)"
  danger-soft-strong: "oklch(94% 0.04 25)"
  danger-ink: "oklch(50% 0.19 25)"
  danger-ink-strong: "oklch(44% 0.20 25)"
dark_colors:
  ink-strong: "oklch(97% 0.003 250)"
  ink: "oklch(86% 0.005 250)"
  ink-muted: "oklch(66% 0.010 258)"
  ink-faint: "oklch(50% 0.010 258)"
  surface-app: "oklch(16% 0.012 258)"
  surface-0: "oklch(14% 0.012 258)"
  surface-1: "oklch(19% 0.013 258)"
  surface-2: "oklch(22% 0.014 258)"
  surface-3: "oklch(25% 0.015 258)"
  surface-4: "oklch(29% 0.015 258)"
  surface-5: "oklch(33% 0.015 258)"
  border-0: "oklch(24% 0.012 258)"
  border-1: "oklch(28% 0.012 258)"
  border-2: "oklch(34% 0.013 258)"
  border-3: "oklch(42% 0.014 258)"
  border-4: "oklch(52% 0.014 258)"
  accent: "oklch(66% 0.16 262)"
  accent-hover: "oklch(72% 0.15 262)"
  accent-active: "oklch(78% 0.13 262)"
  accent-soft: "oklch(30% 0.06 262)"
  accent-soft-ink: "oklch(72% 0.13 262)"
  accent-border: "oklch(42% 0.06 262)"
  focus: "oklch(66% 0.16 262)"
  focus-ring: "oklch(48% 0.10 262)"
  success: "oklch(70% 0.15 155)"
  success-soft: "oklch(28% 0.05 155)"
  success-soft-ink: "oklch(72% 0.13 155)"
  warn: "oklch(78% 0.15 70)"
  warn-soft: "oklch(30% 0.06 70)"
  danger-border: "oklch(40% 0.08 25)"
  danger-soft: "oklch(30% 0.06 25)"
  danger-soft-strong: "oklch(34% 0.07 25)"
  danger-ink: "oklch(72% 0.16 25)"
  danger-ink-strong: "oklch(78% 0.15 25)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.12em"
rounded:
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
components:
  field:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface-3}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface-3}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "8px 20px"
  button-quiet:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  button-danger:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
---

# Design System: Dashboardy

## 1. Overview

**Creative North Star: "Technical Dense"**

Dashboardy is an operational tool for people who look at data and credentials all day. The interface is built for that posture: compact, legible, information-rich. It should feel like a precise instrument, not a marketing surface.

This system favors **density over breathing room**, **structure over elevation**, and **operational copy over flourish**. Hierarchy comes from type weight, surface steps, and crisp borders — never from drop shadows or blur.

**Key characteristics:**
- Compact type scale and tight spacing; a 13–14px base, not 16px.
- Flat surfaces separated by 1px borders and surface steps. No structural shadows.
- One confident **accent** (a calibrated indigo) used for primary actions and focus states.
- Two themes — **light** and **dark** — behind a user toggle. Every token has a value in both.
- Operational voice: "Rotate credentials", not "Vault Rotation Protocol".

## 2. Theming model

The app supports a light theme (default, `:root`) and a dark theme (`[data-theme="dark"]`). Both are generated by `scripts/sync-design-tokens.mjs` from the `colors:` and `dark_colors:` frontmatter blocks at the top of this file into `app/globals.css` between the `DESIGN_TOKENS_START`/`DESIGN_TOKENS_END` markers. Tailwind reads those CSS variables as semantic color utilities (e.g. `bg-surface-1`, `text-ink-muted`, `border-border-2`), so a single `data-theme` swap on `<html>` re-skins the whole app with no per-component branching.

**The toggle is dependency-free.** A small inline script in `app/layout.tsx` sets `data-theme` before paint (no FOUC), `theme-provider.tsx` mirrors it into React state, and `theme-toggle.tsx` renders the sun/moon control in the nav. Theme choice persists in `localStorage`.

**Rule of thumb:** never hardcode a hex/rgb/oklch value in a component. Always use a semantic token. If you find yourself reaching for a raw color, the token set is missing something — extend it here, re-run `tokens:sync`, and use the utility.

## 3. Colors

A cool charcoal neutral scale with one indigo accent and full status ramp. Light and dark values are tuned separately (dark is not an inverted light — borders and surfaces are rebuilt for contrast).

### Accent
- **Accent** (`{colors.accent}`): the single primary-action color and focus hue. Used on primary buttons, active focus rings, and the rare emphasis link. Desaturated indigo, calibrated per-theme.

### Neutrals
- **Ink** (`{colors.ink-strong}`, `{colors.ink}`, `{colors.ink-muted}`, `{colors.ink-faint}`): four steps of text hierarchy. Strong for headings, base for body, muted for secondary, faint for placeholders and disabled glyphs.
- **Surfaces** (`{colors.surface-app}`, `{colors.surface-0}` … `{colors.surface-5}`): the app canvas plus a six-step container ladder. Use steps to separate regions before reaching for borders.
- **Borders** (`{colors.border-0}` … `{colors.border-4}`): a five-step edge scale. `border-1` for most dividers, `border-2` for input edges, `border-3/4` for hover/active emphasis.

### Status
- **Success** (`{colors.success}`, `{colors.success-soft}`, `{colors.success-soft-ink}`): active / healthy states.
- **Warn** (`{colors.warn}`, `{colors.warn-soft}`): pending / transitional states (e.g. pending test).
- **Danger** (`{colors.danger-ink}`, `{colors.danger-border}`, `{colors.danger-soft}`): failures and destructive actions.

### Named rule
**The One Accent Rule.** Accent signals a decisive action or the current focus. If a screen reads "accent-heavy", the rule is broken. Status colors carry their own meaning; they are not accent substitutes.

## 4. Typography

**Fonts:** system sans-serif (`--font-body`) for everything. Monospace for identifiers, timestamps, and credentials. Serif is available but discouraged — density lives in the sans stack.

**Character:** compact, technical, confident. Hierarchy comes from weight and size, not from tracking or color.

### Hierarchy (built)
- **Page title:** 600 / ~24–30px, tight tracking.
- **Section heading:** 600 / ~18px.
- **Body:** 400 / 13–14px / 1.5.
- **Label** (`.ds-label`): 500 / 12px.
- **Kicker** (`.ds-kicker`): 600 / 11px, uppercase, wide tracking, muted — sets context, never competes with the title.
- **Mono** (`.ds-mono`): system monospace / 13px, negative tracking — for values the user will copy or compare.

### Named rule
**The Quiet Kicker Rule.** Kickers label sections; they do not decorate them. Keep them muted and small.

## 5. Elevation

Flat by default. Depth is structural: surface steps + 1px borders + alignment. **No structural drop shadows.** Shadows, if ever introduced, are reserved for transient, state-driven overlays (e.g. an open popover), never for cards or panels.

### Named rule
**The Flat-By-Default Rule.** If a shadow is needed to make the UI legible, the surface steps and borders are wrong.

## 6. Component layer (`@layer components`)

Shared primitives live in `app/globals.css` under `@layer components`, prefixed `ds-`. They read tokens, so they adapt to theme automatically. Use them as base classes and add Tailwind utilities only for layout.

- **`.ds-input` / `.ds-textarea` / `.ds-select`** — the one input style. Kills divergence between boxy and underline variants. 4px radius, `surface-0` fill, `border-2` edge, accent focus ring.
- **`.ds-btn` + `.ds-btn-primary/-secondary/-ghost/-danger`** — four button roles. Primary = accent; secondary = surface + border; ghost = transparent; danger = danger-soft fill.
- **`.ds-card`** — surface-1 + border-1, 6px radius, no shadow. The default container.
- **`.ds-badge` + `.ds-badge--ok/-warn/-danger/-idle`** — status badges with a leading status dot.
- **`.ds-kicker` / `.ds-label` / `.ds-help` / `.ds-mono`** — type primitives.
- **`.ds-divider` / `.ds-row`** — hairline separators.
- **`.ds-stat`** — monospace large figure for counted metrics.
- **`.ds-alert` + `.ds-alert--danger/-info`** — inline notices.

## 7. Do's and Don'ts

### Do
- **Do** use semantic tokens (`bg-surface-1`, `text-ink-muted`, `border-border-1`) everywhere. Never raw colors in components.
- **Do** keep the accent rare — primary actions and focus states only.
- **Do** prefer borders and surface steps over shadows for structure.
- **Do** use monospace for identifiers, timestamps, and credentials.
- **Do** write operational copy. "Rotate credentials" beats "Commit Rotation".
- **Do** ensure every component reads correctly in both themes — if you add a color, add it to `colors:` and `dark_colors:`.

### Don't
- **Don't** hardcode hex/rgb/oklch values in components.
- **Don't** use drop shadows or blur glows for cards or panels.
- **Don't** use theatrical or marketing copy in operational UI.
- **Don't** introduce a second accent. Status colors are not accents.
- **Don't** ship a screen that only works in one theme.
