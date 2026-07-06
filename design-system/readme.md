# Dashboardy Design System — “Signal”

**Signal** is the design system for **Dashboardy**, an expert-authored, business-consumed internal BI platform. BI analysts author governed SQL, saved questions, and dashboards from a Snowflake warehouse; business viewers and external clients consume dashboards and saved outputs without writing SQL.

Signal is a **bold, deliberate visual identity** — electric-indigo signature with a violet secondary, Space Grotesk display + IBM Plex Sans body, rounded surfaces with soft elevation, a confident type scale, and vivid data-viz — equally polished in **light and dark**. It is grounded in the real product’s information architecture, domain language, component inventory, and UX rules, but its look is a fresh, premium redesign (the product brief explicitly called for a fresh visual identity).

---

## Sources

Built from the attached **`web/`** codebase (Next.js 14 App Router, Tailwind, `@dashboardy/web`). What was taken as ground truth vs. reinvented:

- **Kept (structure & behavior):** the information architecture and routes, the component inventory (`.ds-*` layer), role-gating rules, connection lifecycle, filter/override/refresh behavior, execution outcomes, and all domain terminology.
- **Reinvented (the visual layer):** palette, typography, shape, elevation, density, and motion. The codebase’s original look (“Technical Dense” — Plus Jakarta Sans, indigo `262`, 4px radii, flat) was the *starting reference*; Signal replaces it.

Key files referenced: `web/app/globals.css` (token model + `.ds-*` inventory), `web/tailwind.config.ts`, `web/app/layout.tsx`, and the screens under `connections/`, `members/`, `collections/`, `dashboards/` (+ `widgets/`), `questions/`, `(auth)/sign-in`, `(protected)/`.

There is **no logo** in the codebase (`web/public/` is empty). Dashboardy is a **type-only wordmark** (Space Grotesk) — see the Brand cards. No mark was invented.

> **Two systems existed in the codebase.** The mature oklch-token + `.ds-*` system was the real one; a few screens (`questions/page.tsx`, `query-run`, `parameter-editor`, `results-table`, `dashboard-filter-bar`) still used hardcoded dark hex and were pre-migration scaffolds — deliberately not reproduced. The `questions` surface is rebuilt on Signal in the UI kit.

---

## Content & copy fundamentals

- **Voice:** precise, calm, operational — it explains *scope, freshness, and permission* rather than selling. “Runs a connection handshake against the warehouse. On success the connection becomes active.”
- **Person:** second person for the user’s actions (“Sign in with your workspace credentials”); third-person system statements for behavior (“The API never returns secrets after they are saved”).
- **Case:** Sentence case for headings, labels, buttons (“Save connection”, “Force fresh”). **UPPERCASE + wide tracking** only for kickers and table headers (“ADMINISTRATIVE SETTINGS”, “IDENTITY”).
- **Buttons are imperative verbs:** *Save connection · Test connection · Rotate credentials · Execute · Force fresh · Export CSV · Invite member · Clone question.*
- **Status is lowercase, terse, typed:** `active`, `pending test`, `test failed`, `not configured`; execution `timeout`, `row_limit_exceeded`, `warehouse_busy`, `authz_denied`.
- **Trust-first microcopy:** every ambiguous state gets a plain explanation — “Credentials are write-only and never returned after saving.”, “Bound widgets refresh immediately.”
- **Domain terms are canonical** (use exactly): tenant, workspace, member, collection, saved question, dashboard, widget, global filter, filter binding, filter override, data connection, governed execution, ad hoc SQL, clone, soft delete, result cache. Roles: **admin, analyst, viewer, external client**.
- **No emoji. No exclamation. No hype.** Figures are tabular and often zero-padded (`02`).

---

## Visual foundations

- **Aesthetic — Signal:** bold, modern, premium; confident color and type over a calm, rounded canvas. Balanced density: efficient but never cramped.
- **Color:** an **electric indigo** signature (oklch hue **272**, chroma ~0.23) with a **violet secondary** (hue **305**) and a restrained **brand gradient** (indigo → violet) for flourishes only. Refined cool-neutrals carry a faint indigo undertone; dark is a deep indigo-charcoal. Status: emerald (158) / amber (76) / rose-red (22). All values are oklch triplets consumed as `oklch(var(--token))` so alpha layers per use. **Both themes are first-class.** Data-viz has a vivid, ordered **8-hue** categorical palette (`--viz-1…8`) — never hue alone, always paired with labels.
- **Type:** **Space Grotesk** for display, headings, and big figures (geometric, technical, superb numerals); **IBM Plex Sans** for body and UI (precise, humane); **IBM Plex Mono** for data, IDs, SQL, and codes. A confident, balanced scale — 15px base body, 32–36px display/stats.
- **Shape:** rounded and modern — **8px** controls, **12px** cards, **16px** widgets/panels, **20px** modals, **pill** badges. Chart marks 6px.
- **Elevation:** surfaces are clean and rounded with **soft, cool-tinted shadows** — a whisper on resting cards, real lift on menus and modals — plus the accent **focus ring**. (Signal is *not* flat; depth is gentle, never heavy.)
- **Space:** 4px base grid; generous section rhythm; white cards float on a faintly tinted canvas.
- **Backgrounds:** solid surface tints, with the brand gradient reserved for the sign-in glow and rare flourishes. No busy imagery or texture.
- **Motion:** confident but restrained. Micro-interactions 140ms; entrances use a soft ease-out (with an optional gentle spring); loading is a `pulse` skeleton. No infinite decorative loops; everything collapses under `prefers-reduced-motion`.
- **Interaction:** buttons darken by one accent step on hover, nudge `scale(0.985)` on press, and carry a subtle resting shadow; inputs deepen their border on hover and show the accent ring + border on focus; nav’s active item uses the soft-accent pill.
- **Accessibility:** targets **WCAG 2.2 AA**. Status never relies on color alone — badges carry a dot **and** a label; overrides are labeled. Reduced-motion honored; visible focus everywhere.

---

## Iconography

- **Library:** **Lucide** — 24px viewBox, **stroke-width 2**, round caps/joins, `currentColor`. 15–16px inline, 20px standalone. The codebase hand-inlines this exact style; Signal standardizes on the real Lucide set (CDN in the Brand card; inline SVGs in components).
- Common glyphs: `layout-dashboard`, `database`, `users`, `folder`, `file-question`, `table`, `bar-chart-3`, `line-chart`, `filter`, `refresh-cw`, `download`, `key-round`, `sun`/`moon`, `plus`, `search`, `chevron-down`, `triangle-alert`, `check`, `lock`.
- **No emoji. No unicode-glyph icons.** Substitution flagged: the codebase bundles no icon set (icons are hand-inlined Lucide paths) — Signal uses **Lucide via CDN**; swap for `lucide-react` in production.

---

## Components

React primitives (namespace `window.DashboardyDesignSystem_787e56`). Each has a `.jsx`, a `.d.ts` contract, a `.prompt.md`, and a group card. Everything reads the CSS custom properties, so components are theme-aware and re-skin with the tokens.

**Forms** (`components/forms/`) — `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Checkbox`, `Field`.
**Feedback** (`components/feedback/`) — `Badge`, `Alert`, `EmptyState`, `Skeleton`.
**Navigation** (`components/navigation/`) — `TopNav`, `WorkspaceBadge`, `ThemeToggle`.
**Data display** (`components/data-display/`) — `Card`, `PageHeader`, `Kicker`, `Stat`, `Divider`, `DataTable`, `Widget`.

Highlights: `Badge` (pill with a status dot + label — never color alone), `Widget` (dashboard frame owning loading/error/empty states, the always-visible **override** indicator, and per-widget **force-refresh**; big values render in Space Grotesk), `DataTable` (client-side pagination over a server-capped result set), `Field` (the label + help/error row that composes every form).

### Intentional additions
- **`Skeleton`** — the app’s `SkeletonBlock` promoted to a primitive for the required loading patterns.
- **`--viz-1…8` palette** + **`--accent-2` / `--gradient-brand`** — a documented data-viz scale and a brand duo (the brief asks for data-visualization color semantics and a fresh identity).

---

## Foundations (Design System tab)

Specimen cards in `guidelines/`, grouped: **Colors** (accent + violet + gradient, ink, surfaces, status, data-viz, dark theme), **Type** (display, body, mono & stat, kickers & labels), **Spacing** (scale, radii, soft elevation), **Motion**, **Brand** (wordmark, Lucide iconography).

## UI kit

`ui_kits/app/` — an interactive click-through recreation of the Dashboardy app (sign-in → workspace home → members → connections → collections → questions → dashboards list → dashboard view with a global filter bar, widget grid, per-widget loading, force-refresh, and override indicator). See `ui_kits/app/README.md`.

---

## Index / manifest

```
styles.css                     Global entry — @import manifest only (link THIS)
tokens/
  fonts.css                    Space Grotesk · IBM Plex Sans · IBM Plex Mono (Google Fonts)
  colors.css                   oklch triplets (light + dark) + resolved layer + accent-2 + gradient + viz
  typography.css               families, balanced scale, weights, tracking
  spacing.css                  4px scale, rounded radii, control heights, layout, z-index
  elevation.css                soft cool-tinted shadows + focus ring
  motion.css                   durations, easings (incl. spring), keyframes, reduced-motion
  base.css                     document reset (html/body, selection, scrollbars, focus)
components/
  forms/          Button · IconButton · Input · Textarea · Select · Checkbox · Field
  feedback/       Badge · Alert · EmptyState · Skeleton
  navigation/     TopNav · WorkspaceBadge · ThemeToggle
  data-display/   Card · PageHeader · Kicker · Stat · Divider · DataTable · Widget
guidelines/       Foundation specimen cards (Colors · Type · Spacing · Motion · Brand)
ui_kits/app/      Interactive app recreation (index.html + app.jsx + README.md)
SKILL.md          Agent Skill manifest
readme.md         This file
```

Consumers link `styles.css` and read components from `window.DashboardyDesignSystem_787e56`. Generated files (`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`) are produced by the compiler — do not edit.

---

## Caveats

- **Fonts** load from **Google Fonts** (Space Grotesk, IBM Plex Sans, IBM Plex Mono). Self-host for production.
- **Icons** standardize on **Lucide via CDN** — swap for `lucide-react` in your app.
- **Charts** in the UI kit are lightweight inline SVG matching a Recharts-style treatment; the `Widget` supplies the frame, the chart engine stays a consumer choice.
- **Legacy dark scaffolds** in the codebase are deliberately excluded.
- This is a **redesign**, not a reproduction of the current app look — by request. The IA, components, and domain rules match the product; the visual identity is new.
