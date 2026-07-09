# Dashboardy Web — Design System

This document captures the visual system implemented in `apps/web` (tokens + Tailwind extensions).

## Principles

- Warm cream canvas + coral accent + warm-navy dark surfaces (editorial product UI).
- Prioritize legibility and data comprehension; color-block elevation over heavy shadows.
- Serif display for page titles; humanist sans for body/UI; monospace for code/data.
- Motion is functional; honor `prefers-reduced-motion`.

## Color

**Strategy**: warm cream canvas (`#faf9f5`), coral primary (`#cc785c`), warm dark product chrome (`#181715`). Light and dark themes are first-class.

**Implementation**: CSS variables store bare OKLCH triplets, consumed via `oklch(var(--token))`.

- **Tokens file**: `app/styles/tokens/colors.css`
- **Tailwind mapping**: `tailwind.config.ts`

Key semantic roles:

- **Text**: `--text-strong`, `--text-primary`, `--text-muted`, `--text-faint`, `--text-on-accent`
- **Surfaces**: `--surface-canvas`, `--surface-base`, `--surface-card`, `--surface-raised`
- **Borders**: `--border-subtle`, `--border-default`, `--border-strong` (hairline cream)
- **Accent**: coral `--color-accent` (+ hover/active/soft)
- **Status**: success / warn / danger
- **Data viz**: `--viz-1..8` (coral-led), `--viz-grid`, `--viz-axis-ink`

**Gradients**: `--gradient-brand` (coral → amber) for rare flourishes only (e.g. sign-in visual).

## Typography

**Font pairing** (open-source substitutes for licensed faces):

- **Display**: Cormorant Garamond (weight 400–500, negative tracking)
- **Body/UI**: Inter
- **Code/data**: JetBrains Mono

**Tokens**: `app/styles/tokens/typography.css` · **Fonts**: `app/styles/tokens/fonts.css`

Scale highlights: body 16px, controls 14px, page display 32px, stats 36px (display serif).

## Spacing & Layout

- 4px base grid (`app/styles/tokens/spacing.css`)
- Product density (comfortable); marketing-scale `--space-section` (96px) is rare
- Radii: controls 8px, cards 12px, widgets 16px, pills full
- Max content width ~1200px (`--container-max`)

## Elevation

Color-block first; shadows rare and warm-ink tinted (`app/styles/tokens/elevation.css`). Focus ring uses coral at ~15% alpha.

## Motion

Restrained ease-out micro-interactions (`app/styles/tokens/motion.css`). Global `prefers-reduced-motion` support.

## Theming

`data-theme="light|dark"` on `<html>` with `localStorage` key `dashboardy-theme` and system preference fallback.

- Bootstrap: `app/layout.tsx`
- Provider: `app/theme-provider`

## Components

Static CSS primitives in `app/styles/components.css` (`.dby-*` / `.ds-*`):

- Buttons, icon buttons, inputs, selects, textarea, fields
- Cards, badges, alerts, empty states, skeletons
- Page header, data table, widget chrome, nav, sign-in

Wrapped by React components under `components/ds/`.
