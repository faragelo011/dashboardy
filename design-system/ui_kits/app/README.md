# Dashboardy — App UI kit

An interactive, click-through recreation of the Dashboardy web app (the internal BI platform), composed entirely from this design system's components. It is a **recreation for design reference**, not production code.

## Run it
Open `index.html`. It loads `styles.css`, the compiled `_ds_bundle.js`, React + Babel, and `app.jsx`.

## Flow
1. **Sign in** — centered auth card → continues on any input.
2. **Home** — workspace overview, session context, trust-boundary note.
3. **Members** (admin) — invite form, directory stats, paginated roster.
4. **Connections** (admin) — connection details form, live **Test connection** (status `active → pending_test → active`), procedure, security note.
5. **Collections** — flat collection list + create form.
6. **Questions** — saved-question editor with SQL + runtime parameters; **Execute / Force fresh** shows a loading skeleton then a results table with an execution-meta row.
7. **Dashboards** — list → open a dashboard **view** with a **global filter bar**, a 12-col widget grid (KPI, bar, line, table), per-widget **force-refresh**, per-widget **loading**, and a visible **override** indicator. Changing a global filter auto-refreshes bound widgets.

## Fidelity notes
- Top-nav shell, dense forms, flat bordered cards, oklch tokens, and light/dark theming all come straight from the real `.ds-*` system in `web/app/globals.css`.
- Charts are lightweight inline SVG (the app uses Recharts); they match the visual treatment (dashed gridlines, accent series, 2px stroke) rather than re-implementing the library.
- The legacy hardcoded-dark screens in the codebase (`questions/page.tsx`, `query-run`) are intentionally **not** reproduced — they predate the token system. See the root `readme.md`.

## Components used
`TopNav`, `ThemeToggle`, `WorkspaceBadge`, `PageHeader`, `Kicker`, `Card`, `Divider`, `Button`, `IconButton`, `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Alert`, `EmptyState`, `Skeleton`, `Stat`, `DataTable`, `Widget`.
