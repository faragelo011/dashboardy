/* @ds-bundle: {"format":4,"namespace":"DashboardyDesignSystem_787e56","components":[{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"DataTable","sourcePath":"components/data-display/DataTable.jsx"},{"name":"Divider","sourcePath":"components/data-display/Divider.jsx"},{"name":"Kicker","sourcePath":"components/data-display/Kicker.jsx"},{"name":"PageHeader","sourcePath":"components/data-display/PageHeader.jsx"},{"name":"Stat","sourcePath":"components/data-display/Stat.jsx"},{"name":"Widget","sourcePath":"components/data-display/Widget.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"ThemeToggle","sourcePath":"components/navigation/ThemeToggle.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"},{"name":"WorkspaceBadge","sourcePath":"components/navigation/WorkspaceBadge.jsx"}],"sourceHashes":{"components/data-display/Card.jsx":"5216552a0b36","components/data-display/DataTable.jsx":"8604400b8504","components/data-display/Divider.jsx":"57422333ea70","components/data-display/Kicker.jsx":"2156495a53b6","components/data-display/PageHeader.jsx":"592005ded74a","components/data-display/Stat.jsx":"235095e7c368","components/data-display/Widget.jsx":"4589161aa565","components/feedback/Alert.jsx":"ce47cc63d04d","components/feedback/Badge.jsx":"782c9be38fe6","components/feedback/EmptyState.jsx":"cd9276cb01ab","components/feedback/Skeleton.jsx":"b26f7bff8c6e","components/forms/Button.jsx":"decd5b269f52","components/forms/Checkbox.jsx":"22fd1d415277","components/forms/Field.jsx":"2a4dcba8e41b","components/forms/IconButton.jsx":"24311ecf5879","components/forms/Input.jsx":"4ba16b67d805","components/forms/Select.jsx":"b9481bbc0795","components/forms/Textarea.jsx":"cfb631376b3d","components/navigation/ThemeToggle.jsx":"369627148e47","components/navigation/TopNav.jsx":"38b84b5896a0","components/navigation/WorkspaceBadge.jsx":"a7af9865cd7b","ui_kits/app/app.jsx":"8562b0f3ffbb"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DashboardyDesignSystem_787e56 = window.DashboardyDesignSystem_787e56 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-card{background:var(--surface-base);border:1px solid var(--border-subtle);border-radius:var(--radius-md);box-shadow:var(--shadow-card);}
.dby-card--inset{background:var(--surface-sunken);box-shadow:none;}
.dby-card--dashed{border-style:dashed;border-color:var(--border-strong);box-shadow:none;}
.dby-card--pad-sm{padding:1.25rem;}
.dby-card--pad-md{padding:1.5rem;}
.dby-card--pad-lg{padding:1.75rem;}
.dby-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem;}
.dby-card__title{font-family:var(--font-display);font-size:var(--text-h2);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);color:var(--text-strong);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-card-css")) {
  const s = document.createElement("style");
  s.id = "dby-card-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Card — the flat, border-defined surface that holds almost everything:
 * forms, panels, list rows, widgets. No drop shadow — elevation is expressed
 * with borders + surface tints. Optional title/actions header.
 */
function Card({
  inset = false,
  dashed = false,
  padding = "md",
  title,
  actions,
  className = "",
  children,
  ...rest
}) {
  const classes = ["dby-card", inset ? "dby-card--inset" : "", dashed ? "dby-card--dashed" : "", padding && padding !== "none" ? `dby-card--pad-${padding}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), title || actions ? /*#__PURE__*/React.createElement("div", {
    className: "dby-card__head"
  }, title ? /*#__PURE__*/React.createElement("h2", {
    className: "dby-card__title"
  }, title) : /*#__PURE__*/React.createElement("span", null), actions ? /*#__PURE__*/React.createElement("div", null, actions) : null) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-divider{border:0;border-top:1px solid var(--border-subtle);height:0;margin:0;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-divider-css")) {
  const s = document.createElement("style");
  s.id = "dby-divider-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Divider — a hairline rule (matches `.ds-divider`). Separates sections
 * inside cards and forms.
 */
function Divider({
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("hr", _extends({
    className: ["dby-divider", className].filter(Boolean).join(" ")
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Divider.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Kicker.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-kicker{
  font-family:var(--font-body);font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-kicker);text-transform:uppercase;color:var(--text-muted);
  display:block;
}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-kicker-css")) {
  const s = document.createElement("style");
  s.id = "dby-kicker-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Kicker — the uppercase eyebrow above headings and section labels. Sets the
 * "Technical Dense" rhythm: 11px, 600, wide tracking, muted.
 */
function Kicker({
  as: Tag = "p",
  className = "",
  children,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: ["dby-kicker", className].filter(Boolean).join(" ")
  }, rest), children);
}
Object.assign(__ds_scope, { Kicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Kicker.jsx", error: String((e && e.message) || e) }); }

// components/data-display/PageHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-pagehead{display:flex;flex-direction:column;gap:.75rem;}
.dby-pagehead--bordered{border-bottom:1px solid var(--border-subtle);padding-bottom:2rem;}
.dby-pagehead__top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem;}
.dby-pagehead__main{display:flex;flex-direction:column;gap:.5rem;max-width:60ch;}
.dby-pagehead__title{font-family:var(--font-display);font-size:var(--text-h1);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);line-height:1.15;color:var(--text-strong);}
.dby-pagehead__desc{font-size:var(--text-body);line-height:1.6;color:var(--text-muted);}
.dby-pagehead__actions{display:flex;flex-wrap:wrap;gap:.5rem;flex-shrink:0;}
@media (min-width:640px){ .dby-pagehead__title{font-size:var(--text-display);} }
`;
if (typeof document !== "undefined" && !document.getElementById("dby-pagehead-css")) {
  const s = document.createElement("style");
  s.id = "dby-pagehead-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * PageHeader — the standard screen header: kicker + title + description, with
 * an optional actions cluster and an above-title slot (workspace badge). Every
 * primary surface opens with this block.
 */
function PageHeader({
  kicker,
  title,
  description,
  actions,
  above,
  bordered = true,
  className = "",
  ...rest
}) {
  const classes = ["dby-pagehead", bordered ? "dby-pagehead--bordered" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("header", _extends({
    className: classes
  }, rest), above ? /*#__PURE__*/React.createElement("div", null, above) : null, /*#__PURE__*/React.createElement("div", {
    className: "dby-pagehead__top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dby-pagehead__main"
  }, kicker ? /*#__PURE__*/React.createElement("p", {
    className: "dby-kicker"
  }, kicker) : null, title ? /*#__PURE__*/React.createElement("h1", {
    className: "dby-pagehead__title"
  }, title) : null, description ? /*#__PURE__*/React.createElement("p", {
    className: "dby-pagehead__desc"
  }, description) : null), actions ? /*#__PURE__*/React.createElement("div", {
    className: "dby-pagehead__actions"
  }, actions) : null));
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-stat{display:flex;flex-direction:column;gap:.375rem;}
.dby-stat__label{font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-kicker);text-transform:uppercase;color:var(--text-muted);}
.dby-stat__value{font-family:var(--font-display);font-size:var(--text-stat);line-height:1;
  font-weight:var(--weight-semibold);letter-spacing:var(--tracking-tighter);color:var(--text-strong);
  font-variant-numeric:tabular-nums;}
.dby-stat__value--sm{font-size:1.5rem;}
.dby-stat__hint{font-size:var(--text-caption);color:var(--text-muted);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-stat-css")) {
  const s = document.createElement("style");
  s.id = "dby-stat-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Stat — a large counted figure in the monospace stack. Use for directory
 * counts and KPI-style figures. Label sits above as a kicker; optional hint
 * below for comparison context.
 */
function Stat({
  value,
  label,
  hint,
  size = "md",
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["dby-stat", className].filter(Boolean).join(" ")
  }, rest), label ? /*#__PURE__*/React.createElement("span", {
    className: "dby-stat__label"
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    className: `dby-stat__value${size === "sm" ? " dby-stat__value--sm" : ""}`
  }, value), hint ? /*#__PURE__*/React.createElement("span", {
    className: "dby-stat__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-alert{
  display:flex;gap:.625rem;padding:.75rem .875rem;border-radius:var(--radius-sm);
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.5;
  border-left:var(--border-width-accent) solid transparent;
}
.dby-alert__icon{flex:0 0 auto;margin-top:.05rem;display:inline-flex;}
.dby-alert__body{display:flex;flex-direction:column;gap:.15rem;min-width:0;}
.dby-alert__title{font-weight:var(--weight-semibold);}
.dby-alert--info{background:var(--color-accent-soft);border-left-color:var(--color-accent);color:var(--color-accent-soft-ink);}
.dby-alert--danger{background:var(--color-danger-soft);border-left-color:var(--color-danger);color:var(--color-danger);}
.dby-alert--success{background:var(--color-success-soft);border-left-color:var(--color-success);color:var(--color-success-ink);}
.dby-alert--warn{background:var(--color-warn-soft);border-left-color:var(--color-warn);color:var(--color-warn-ink);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-alert-css")) {
  const s = document.createElement("style");
  s.id = "dby-alert-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Alert — an inline notice with a colored left rule. Use for typed execution
 * outcomes, sanitized connection errors, security notes, and permission
 * refusals. Not a toast — it sits in the content flow.
 */
function Alert({
  tone = "info",
  title,
  icon,
  className = "",
  children,
  ...rest
}) {
  const classes = ["dby-alert", `dby-alert--${tone}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes,
    role: tone === "danger" ? "alert" : undefined
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "dby-alert__icon",
    "aria-hidden": "true"
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    className: "dby-alert__body"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "dby-alert__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", null, children) : null));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-badge{
  display:inline-flex;align-items:center;gap:.3125rem;
  padding:.1875rem .5625rem;border-radius:var(--radius-full);
  border:1px solid var(--border-default);background:var(--surface-card);
  color:var(--text-muted);font-family:var(--font-body);
  font-size:var(--text-micro);font-weight:var(--weight-medium);
  letter-spacing:.02em;line-height:1.4;white-space:nowrap;
}
.dby-badge__dot{width:.4375rem;height:.4375rem;border-radius:var(--radius-full);
  background:var(--text-faint);flex-shrink:0;}
.dby-badge--ok{color:var(--color-success-ink);background:var(--color-success-soft);border-color:oklch(var(--success) / .3);}
.dby-badge--ok .dby-badge__dot{background:var(--color-success);}
.dby-badge--warn{color:var(--color-warn-ink);background:var(--color-warn-soft);border-color:oklch(var(--warn) / .3);}
.dby-badge--warn .dby-badge__dot{background:var(--color-warn);}
.dby-badge--danger{color:var(--color-danger);background:var(--color-danger-soft);border-color:var(--color-danger-border);}
.dby-badge--danger .dby-badge__dot{background:var(--color-danger);}
.dby-badge--info{color:var(--color-accent-soft-ink);background:var(--color-accent-soft);border-color:var(--color-accent-border);}
.dby-badge--info .dby-badge__dot{background:var(--color-accent);}
.dby-badge--idle .dby-badge__dot{background:var(--text-faint);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-badge-css")) {
  const s = document.createElement("style");
  s.id = "dby-badge-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Badge — a compact status pill with a leading status dot. The dot shape +
 * text label mean status never relies on color alone (WCAG). Use for
 * connection lifecycle, execution outcomes, member status, export flags.
 */
function Badge({
  tone = "neutral",
  dot = true,
  className = "",
  children,
  ...rest
}) {
  const classes = ["dby-badge", tone !== "neutral" ? `dby-badge--${tone}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "dby-badge__dot",
    "aria-hidden": "true"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-empty{
  display:flex;flex-direction:column;align-items:center;gap:.5rem;text-align:center;
  padding:3rem 1.5rem;background:var(--surface-card);
  border:1px dashed var(--border-strong);border-radius:var(--radius-md);
}
.dby-empty__icon{color:var(--text-faint);margin-bottom:.25rem;display:inline-flex;}
.dby-empty__kicker{font-size:var(--text-micro);font-weight:600;letter-spacing:var(--tracking-kicker);
  text-transform:uppercase;color:var(--text-muted);}
.dby-empty__desc{font-size:var(--text-caption);line-height:1.45;color:var(--text-muted);max-width:40ch;}
.dby-empty__action{margin-top:.5rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-empty-css")) {
  const s = document.createElement("style");
  s.id = "dby-empty-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * EmptyState — a dashed panel for "nothing here yet" surfaces: no collections,
 * no questions, no dashboards, no grants, no results. Kicker + description +
 * optional action.
 */
function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
  ...rest
}) {
  const classes = ["dby-empty", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "dby-empty__icon",
    "aria-hidden": "true"
  }, icon) : null, title ? /*#__PURE__*/React.createElement("span", {
    className: "dby-empty__kicker"
  }, title) : null, description ? /*#__PURE__*/React.createElement("span", {
    className: "dby-empty__desc"
  }, description) : null, action ? /*#__PURE__*/React.createElement("div", {
    className: "dby-empty__action"
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-skeleton{
  display:block;background:var(--surface-raised);border-radius:var(--radius-sm);
  animation:dby-pulse 1.5s var(--ease-in-out) infinite;
}
.dby-skeleton--circle{border-radius:var(--radius-full);}
@media (prefers-reduced-motion: reduce){ .dby-skeleton{animation:none;} }
`;
if (typeof document !== "undefined" && !document.getElementById("dby-skeleton-css")) {
  const s = document.createElement("style");
  s.id = "dby-skeleton-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Skeleton — a pulsing placeholder block for loading states (shell, per-widget,
 * table rows). Mirrors the app's `animate-pulse rounded bg-surface-2`. Respects
 * reduced-motion. Give it a `width`/`height` (number = px, or any CSS length).
 */
function Skeleton({
  width = "100%",
  height = "1rem",
  circle = false,
  radius,
  className = "",
  style = {},
  ...rest
}) {
  const classes = ["dby-skeleton", circle ? "dby-skeleton--circle" : "", className].filter(Boolean).join(" ");
  const px = v => typeof v === "number" ? `${v}px` : v;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: classes,
    "aria-hidden": "true",
    style: {
      width: px(width),
      height: px(height),
      borderRadius: radius ? px(radius) : undefined,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject component CSS once per document (hover/active/focus states that
   inline styles can't express). Values mirror the app's .ds-btn exactly. */
const CSS = `
.dby-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:.375rem;
  border-radius:var(--radius-sm);padding:.5625rem 1.05rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);font-weight:600;
  line-height:1.2;border:1px solid transparent;cursor:pointer;white-space:nowrap;
  transition:var(--transition-control);text-decoration:none;
}
.dby-btn:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-btn:active:not(:disabled){transform:scale(0.985);}
.dby-btn:disabled,.dby-btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed;}
.dby-btn--sm{padding:.375rem .75rem;font-size:var(--text-caption);}
.dby-btn--lg{padding:.6875rem 1.35rem;font-size:var(--text-body);}
.dby-btn--full{width:100%;}
.dby-btn__icon{display:inline-flex;flex:0 0 auto;}

.dby-btn--primary{background:var(--color-accent);color:var(--text-on-accent);border-color:transparent;box-shadow:var(--shadow-xs);}
.dby-btn--primary:not(:disabled):hover{background:var(--color-accent-hover);border-color:var(--color-accent-hover);}
.dby-btn--primary:not(:disabled):active{background:var(--color-accent-active);border-color:var(--color-accent-active);}

.dby-btn--secondary{background:var(--surface-base);color:var(--text-primary);border-color:var(--border-default);box-shadow:var(--shadow-xs);}
.dby-btn--secondary:not(:disabled):hover{background:var(--surface-raised);border-color:var(--border-strong);}

.dby-btn--ghost{background:transparent;color:var(--text-muted);border-color:transparent;}
.dby-btn--ghost:not(:disabled):hover{background:var(--surface-card);color:var(--text-primary);}

.dby-btn--danger{background:var(--color-danger-soft);color:var(--color-danger);border-color:var(--color-danger-border);}
.dby-btn--danger:not(:disabled):hover{background:oklch(var(--danger-soft-strong));border-color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-btn-css")) {
  const s = document.createElement("style");
  s.id = "dby-btn-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Button — the primary action control. Four variants, three sizes.
 * Matches Dashboardy's `.ds-btn` system (dense, 4px radius, 120ms transitions).
 */
function Button({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = "",
  type = "button",
  children,
  ...rest
}) {
  const classes = ["dby-btn", `dby-btn--${variant}`, size !== "md" ? `dby-btn--${size}` : "", fullWidth ? "dby-btn--full" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: classes
  }, rest), leftIcon ? /*#__PURE__*/React.createElement("span", {
    className: "dby-btn__icon"
  }, leftIcon) : null, children, rightIcon ? /*#__PURE__*/React.createElement("span", {
    className: "dby-btn__icon"
  }, rightIcon) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/data-display/DataTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-table-wrap{width:100%;overflow-x:auto;}
.dby-table{width:100%;border-collapse:collapse;text-align:left;font-size:var(--text-body-sm);}
.dby-table thead th{
  padding:.375rem .625rem;font-size:var(--text-micro);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-faint);
  border-bottom:1px solid var(--border-default);white-space:nowrap;
}
.dby-table tbody td{padding:.5rem .625rem;color:var(--text-primary);border-bottom:1px solid var(--border-subtle);vertical-align:middle;}
.dby-table tbody tr:last-child td{border-bottom:0;}
.dby-table tbody tr:hover td{background:var(--surface-card);}
.dby-table__mono{font-family:var(--font-mono);font-size:var(--text-body-sm);letter-spacing:var(--tracking-tight);color:var(--text-muted);}
.dby-table__cell--right{text-align:right;}
.dby-table__cell--center{text-align:center;}
.dby-table__empty{padding:1.5rem .625rem;color:var(--text-muted);font-size:var(--text-body-sm);}
.dby-table__pager{display:flex;align-items:center;justify-content:space-between;gap:1rem;
  padding-top:.75rem;margin-top:.25rem;border-top:1px solid var(--border-subtle);}
.dby-table__range{font-size:var(--text-caption);color:var(--text-muted);font-variant-numeric:tabular-nums;}
.dby-table__pager-btns{display:flex;gap:.5rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-table-css")) {
  const s = document.createElement("style");
  s.id = "dby-table-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * DataTable — columnar data with optional client-side pagination over a
 * server-capped result set (never an unbounded "load more"). Columns declare
 * alignment, monospace, and custom cell renderers.
 */
function DataTable({
  columns = [],
  rows = [],
  pageSize,
  emptyMessage = "No rows returned.",
  getRowKey,
  className = "",
  ...rest
}) {
  const [page, setPage] = React.useState(0);
  const paginated = typeof pageSize === "number" && pageSize > 0;
  const total = rows.length;
  const pageCount = paginated ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const current = Math.min(page, pageCount - 1);
  const start = paginated ? current * pageSize : 0;
  const view = paginated ? rows.slice(start, start + pageSize) : rows;
  const alignClass = a => a === "right" ? " dby-table__cell--right" : a === "center" ? " dby-table__cell--center" : "";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["dby-table-shell", className].filter(Boolean).join(" ")
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "dby-table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "dby-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    className: alignClass(c.align).replace("dby-table__cell", "dby-table__cell"),
    style: {
      textAlign: c.align || "left",
      width: c.width
    }
  }, c.header)))), /*#__PURE__*/React.createElement("tbody", null, view.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    className: "dby-table__empty",
    colSpan: columns.length
  }, emptyMessage)) : view.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: getRowKey ? getRowKey(row, start + i) : start + i
  }, columns.map(c => {
    const content = c.render ? c.render(row, start + i) : row[c.key];
    return /*#__PURE__*/React.createElement("td", {
      key: c.key,
      className: (c.mono ? "dby-table__mono" : "") + alignClass(c.align),
      style: {
        textAlign: c.align || "left"
      }
    }, content === null || content === undefined || content === "" ? "—" : content);
  })))))), paginated && total > pageSize ? /*#__PURE__*/React.createElement("div", {
    className: "dby-table__pager"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dby-table__range"
  }, start + 1, "\u2013", Math.min(start + pageSize, total), " of ", total), /*#__PURE__*/React.createElement("div", {
    className: "dby-table__pager-btns"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    disabled: current === 0,
    onClick: () => setPage(p => Math.max(0, p - 1))
  }, "Previous"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    disabled: current >= pageCount - 1,
    onClick: () => setPage(p => Math.min(pageCount - 1, p + 1))
  }, "Next"))) : null);
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-checkbox{display:inline-flex;align-items:center;gap:.5rem;cursor:pointer;font-size:var(--text-body-sm);color:var(--text-primary);}
.dby-checkbox input{
  height:1rem;width:1rem;flex:0 0 auto;cursor:pointer;
  border:1px solid var(--border-default);border-radius:var(--radius-sm);
  accent-color:var(--color-accent);
}
.dby-checkbox input:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-checkbox--disabled{opacity:.55;cursor:not-allowed;}
.dby-checkbox--disabled input{cursor:not-allowed;}
.dby-checkbox__text{color:var(--text-muted);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-checkbox-css")) {
  const s = document.createElement("style");
  s.id = "dby-checkbox-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Checkbox — a boolean control with an inline label. Uses the native input
 * tinted with the accent color (matches the app's `accent-accent` checkboxes).
 */
const Checkbox = React.forwardRef(function Checkbox({
  label,
  disabled = false,
  className = "",
  children,
  ...rest
}, ref) {
  const classes = ["dby-checkbox", disabled ? "dby-checkbox--disabled" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", {
    className: classes
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: "checkbox",
    disabled: disabled
  }, rest)), label || children ? /*#__PURE__*/React.createElement("span", {
    className: "dby-checkbox__text"
  }, label ?? children) : null);
});
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
const CSS = `
.dby-field{display:flex;flex-direction:column;gap:.375rem;}
.dby-field__label{
  font-size:var(--text-caption);font-weight:var(--weight-medium);
  letter-spacing:var(--tracking-wide);color:var(--text-primary);
  display:inline-flex;gap:.35em;align-items:baseline;
}
.dby-field__optional{color:var(--text-faint);font-weight:var(--weight-regular);}
.dby-field__help{font-size:var(--text-caption);line-height:1.45;color:var(--text-muted);}
.dby-field__error{font-size:var(--text-caption);line-height:1.45;color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-field-css")) {
  const s = document.createElement("style");
  s.id = "dby-field-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Field — label + control + help/error wrapper. The ubiquitous form row in
 * Dashboardy. If `htmlFor` is given it renders a `<label for>` + `<div>`,
 * otherwise it wraps the control in an implicit `<label>`.
 */
function Field({
  label,
  htmlFor,
  optional = false,
  hint,
  help,
  error,
  className = "",
  children
}) {
  const labelNode = label ? /*#__PURE__*/React.createElement("span", {
    className: "dby-field__label"
  }, label, optional ? /*#__PURE__*/React.createElement("span", {
    className: "dby-field__optional"
  }, "(optional)") : null, hint ? /*#__PURE__*/React.createElement("span", {
    className: "dby-field__optional"
  }, hint) : null) : null;
  const footer = /*#__PURE__*/React.createElement(React.Fragment, null, help && !error ? /*#__PURE__*/React.createElement("span", {
    className: "dby-field__help"
  }, help) : null, error ? /*#__PURE__*/React.createElement("span", {
    className: "dby-field__error",
    role: "alert"
  }, error) : null);
  const classes = ["dby-field", className].filter(Boolean).join(" ");
  if (htmlFor) {
    return /*#__PURE__*/React.createElement("div", {
      className: classes
    }, label ? /*#__PURE__*/React.createElement("label", {
      className: "dby-field__label",
      htmlFor: htmlFor
    }, label, optional ? /*#__PURE__*/React.createElement("span", {
      className: "dby-field__optional"
    }, "(optional)") : null, hint ? /*#__PURE__*/React.createElement("span", {
      className: "dby-field__optional"
    }, hint) : null) : null, children, footer);
  }
  return /*#__PURE__*/React.createElement("label", {
    className: classes
  }, labelNode, children, footer);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-iconbtn{
  display:inline-flex;align-items:center;justify-content:center;
  height:var(--control-height-sm);width:var(--control-height-sm);flex:0 0 auto;
  border-radius:var(--radius-sm);border:1px solid var(--border-default);
  background:var(--surface-base);color:var(--text-muted);cursor:pointer;
  transition:var(--transition-control);padding:0;box-shadow:var(--shadow-xs);
}
.dby-iconbtn:not(:disabled):hover{border-color:var(--border-strong);background:var(--surface-raised);color:var(--text-primary);}
.dby-iconbtn:focus-visible{outline:none;box-shadow:var(--shadow-focus);}
.dby-iconbtn:disabled{opacity:.5;cursor:not-allowed;}
.dby-iconbtn--ghost{border-color:transparent;background:transparent;}
.dby-iconbtn--ghost:not(:disabled):hover{background:var(--surface-card);border-color:transparent;}
.dby-iconbtn--sm{height:1.75rem;width:1.75rem;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-iconbtn-css")) {
  const s = document.createElement("style");
  s.id = "dby-iconbtn-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * IconButton — a square, icon-only control (theme toggle, row actions,
 * toolbar). Pass a 15px stroke-2 icon (Lucide) as children.
 */
function IconButton({
  variant = "default",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}) {
  const classes = ["dby-iconbtn", variant === "ghost" ? "dby-iconbtn--ghost" : "", size === "sm" ? "dby-iconbtn--sm" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: classes
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Widget.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const RefreshIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "14",
  height: "14",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 12a9 9 0 0 1 15-6.7L21 8"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 3v5h-5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 12a9 9 0 0 1-15 6.7L3 16"
}), /*#__PURE__*/React.createElement("path", {
  d: "M3 21v-5h5"
}));
const CSS = `
.dby-widget{display:flex;flex-direction:column;gap:.5rem;height:100%;min-height:0;
  border:1px solid var(--border-subtle);background:var(--surface-base);
  border-radius:var(--radius-lg);padding:1.1rem 1.15rem;box-shadow:var(--shadow-card);}
.dby-widget__head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;min-height:1.25rem;}
.dby-widget__title{font-size:var(--text-caption);font-weight:var(--weight-medium);
  text-transform:uppercase;letter-spacing:var(--tracking-wide);color:var(--text-muted);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dby-widget__chrome{display:flex;align-items:center;gap:.375rem;flex-shrink:0;}
.dby-widget__body{flex:1;min-height:0;display:flex;flex-direction:column;}
.dby-widget__msg{font-size:var(--text-body-sm);color:var(--text-muted);}
.dby-widget__msg--error{color:var(--color-danger);}
.dby-widget__kpi{font-family:var(--font-display);font-size:2.1rem;line-height:1;font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tighter);color:var(--text-strong);font-variant-numeric:tabular-nums;
  display:flex;align-items:center;flex:1;}
.dby-widget__foot{font-size:var(--text-micro);color:var(--text-faint);letter-spacing:var(--tracking-wide);
  display:flex;gap:.75rem;flex-wrap:wrap;}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-widget-css")) {
  const s = document.createElement("style");
  s.id = "dby-widget-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Widget — the dashboard widget frame (chrome) for KPI, bar, line, and table
 * content. Owns the title, the visible override indicator, per-widget refresh,
 * and the loading/error/empty states so one slow widget never blocks the
 * canvas. The chart/value/table itself is passed as children.
 */
function Widget({
  title,
  state = "ok",
  error,
  emptyMessage = "No data",
  kpi,
  override = false,
  onRefresh,
  footer,
  minHeight,
  className = "",
  children,
  ...rest
}) {
  const classes = ["dby-widget", className].filter(Boolean).join(" ");
  let body;
  if (state === "loading") {
    body = /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: 1,
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Skeleton, {
      width: "55%",
      height: 22
    }), /*#__PURE__*/React.createElement(__ds_scope.Skeleton, {
      width: "85%",
      height: 12
    }), /*#__PURE__*/React.createElement(__ds_scope.Skeleton, {
      width: "70%",
      height: 12
    }));
  } else if (state === "error") {
    body = /*#__PURE__*/React.createElement("p", {
      className: "dby-widget__msg dby-widget__msg--error",
      role: "alert"
    }, error || "Execution failed");
  } else if (state === "empty") {
    body = /*#__PURE__*/React.createElement("p", {
      className: "dby-widget__msg"
    }, emptyMessage);
  } else if (kpi !== undefined) {
    body = /*#__PURE__*/React.createElement("div", {
      className: "dby-widget__kpi"
    }, kpi);
  } else {
    body = children;
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes,
    style: minHeight ? {
      minHeight
    } : undefined
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "dby-widget__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dby-widget__title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "dby-widget__chrome"
  }, override ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "info"
  }, "override") : null, onRefresh ? /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    variant: "ghost",
    size: "sm",
    "aria-label": "Force refresh",
    onClick: onRefresh
  }, /*#__PURE__*/React.createElement(RefreshIcon, null)) : null)), /*#__PURE__*/React.createElement("div", {
    className: "dby-widget__body"
  }, body), footer ? /*#__PURE__*/React.createElement("div", {
    className: "dby-widget__foot"
  }, footer) : null);
}
Object.assign(__ds_scope, { Widget });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Widget.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-input{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.5625rem .75rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.4;
  color:var(--text-primary);transition:var(--transition-control);
}
.dby-input::placeholder{color:var(--text-faint);}
.dby-input:not(:disabled):hover{border-color:var(--border-strong);}
.dby-input:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);background:var(--surface-base);}
.dby-input:disabled{opacity:.55;cursor:not-allowed;background:var(--surface-card);}
.dby-input[aria-invalid="true"]{border-color:var(--color-danger);}
.dby-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px oklch(var(--danger-ink) / .16);}
.dby-input--sm{padding:.375rem .5rem;font-size:var(--text-caption);}
.dby-input--mono{font-family:var(--font-mono);font-size:var(--text-body-sm);letter-spacing:var(--tracking-tight);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-input-css")) {
  const s = document.createElement("style");
  s.id = "dby-input-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Input — single-line text field (text, email, password, number, date, search).
 * Mirrors the app's `.ds-input`. Set `invalid` to wire the danger + aria state.
 */
const Input = React.forwardRef(function Input({
  size = "md",
  mono = false,
  invalid = false,
  className = "",
  type = "text",
  ...rest
}, ref) {
  const classes = ["dby-input", size === "sm" ? "dby-input--sm" : "", mono ? "dby-input--mono" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: type,
    className: classes,
    "aria-invalid": invalid || undefined
  }, rest));
});
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CHEVRON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23808896' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>";
const CSS = `
.dby-select{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.5625rem 2.25rem .5625rem .75rem;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.4;
  color:var(--text-primary);transition:var(--transition-control);cursor:pointer;
  -webkit-appearance:none;-moz-appearance:none;appearance:none;
  background-image:url("${CHEVRON}");background-repeat:no-repeat;
  background-position:right .7rem center;background-size:16px 16px;
}
.dby-select:not(:disabled):hover{border-color:var(--border-strong);}
.dby-select:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);}
.dby-select:disabled{opacity:.55;cursor:not-allowed;background-color:var(--surface-card);}
.dby-select--sm{padding:.375rem 1.75rem .375rem .5rem;font-size:var(--text-caption);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-select-css")) {
  const s = document.createElement("style");
  s.id = "dby-select-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Select — native dropdown styled to match `.ds-select`. Provide either an
 * `options` array or `<option>` children.
 */
const Select = React.forwardRef(function Select({
  options,
  size = "md",
  className = "",
  children,
  ...rest
}, ref) {
  const classes = ["dby-select", size === "sm" ? "dby-select--sm" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("select", _extends({
    ref: ref,
    className: classes
  }, rest), options ? options.map(o => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value,
      disabled: opt.disabled
    }, opt.label);
  }) : children);
});
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-textarea{
  width:100%;background:var(--surface-base);border:1px solid var(--border-default);
  border-radius:var(--radius-sm);padding:.625rem .75rem;min-height:6rem;resize:vertical;
  font-family:var(--font-body);font-size:var(--text-body-sm);line-height:1.5;
  color:var(--text-primary);transition:var(--transition-control);
}
.dby-textarea--mono{font-family:var(--font-mono);letter-spacing:var(--tracking-tight);}
.dby-textarea::placeholder{color:var(--text-faint);}
.dby-textarea:not(:disabled):hover{border-color:var(--border-strong);}
.dby-textarea:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--shadow-focus);}
.dby-textarea:disabled{opacity:.55;cursor:not-allowed;background:var(--surface-card);}
.dby-textarea[aria-invalid="true"]{border-color:var(--color-danger);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-textarea-css")) {
  const s = document.createElement("style");
  s.id = "dby-textarea-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Textarea — multi-line input. Default is the body font; set `mono` for
 * code-like content (SQL, PEM keys), matching the app's SQL editor field.
 */
const Textarea = React.forwardRef(function Textarea({
  mono = false,
  invalid = false,
  className = "",
  rows = 4,
  ...rest
}, ref) {
  const classes = ["dby-textarea", mono ? "dby-textarea--mono" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("textarea", _extends({
    ref: ref,
    rows: rows,
    className: classes,
    "aria-invalid": invalid || undefined
  }, rest));
});
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ThemeToggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SunIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "15",
  height: "15",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "4"
}), /*#__PURE__*/React.createElement("path", {
  d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
}));
const MoonIcon = () => /*#__PURE__*/React.createElement("svg", {
  width: "15",
  height: "15",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
}));
const STORAGE_KEY = "dashboardy-theme";
function readTheme() {
  if (typeof document === "undefined") return "light";
  const current = document.documentElement.dataset.theme;
  if (current === "dark" || current === "light") return current;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch (e) {}
  return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * ThemeToggle — flips the whole app between light and dark by setting
 * `data-theme` on <html> and persisting to localStorage
 * (`dashboardy-theme`), matching the app's no-FOUC bootstrap.
 */
function ThemeToggle(props) {
  const [theme, setTheme] = React.useState("light");
  React.useEffect(() => {
    setTheme(readTheme());
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {}
    }
  };
  const isDark = theme === "dark";
  return /*#__PURE__*/React.createElement(__ds_scope.IconButton, _extends({
    "aria-label": isDark ? "Switch to light theme" : "Switch to dark theme",
    title: isDark ? "Switch to light theme" : "Switch to dark theme",
    onClick: toggle
  }, props), isDark ? /*#__PURE__*/React.createElement(SunIcon, null) : /*#__PURE__*/React.createElement(MoonIcon, null));
}
Object.assign(__ds_scope, { ThemeToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ThemeToggle.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-nav{
  position:sticky;top:0;z-index:var(--z-header);
  border-bottom:1px solid var(--border-subtle);
  background:oklch(var(--surface-app) / .8);
  -webkit-backdrop-filter:saturate(1.6) blur(12px);backdrop-filter:saturate(1.6) blur(12px);
}
.dby-nav--static{position:static;}
.dby-nav__inner{
  margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;
  padding:.875rem 2rem;
}
.dby-nav__brand{
  font-family:var(--font-display);font-size:var(--text-body);font-weight:var(--weight-semibold);
  letter-spacing:var(--tracking-tight);color:var(--text-strong);text-decoration:none;
  transition:color var(--duration-fast) var(--ease-standard);white-space:nowrap;
}
.dby-nav__brand:hover{color:var(--color-accent);}
.dby-nav__right{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.75rem;}
.dby-nav__links{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.375rem;}
.dby-nav__link{
  border-radius:var(--radius-sm);padding:.375rem .625rem;
  font-size:var(--text-caption);font-weight:var(--weight-medium);letter-spacing:var(--tracking-tight);
  color:var(--text-muted);text-decoration:none;transition:var(--transition-colors);white-space:nowrap;
}
.dby-nav__link:hover{background:var(--surface-card);color:var(--text-primary);}
.dby-nav__link--active{background:var(--color-accent-soft);color:var(--color-accent-soft-ink);}
.dby-nav__divider{height:1.25rem;width:1px;flex-shrink:0;background:var(--border-default);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-nav-css")) {
  const s = document.createElement("style");
  s.id = "dby-nav-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * TopNav — the sticky workspace shell header: text wordmark, permission-gated
 * nav links, and an actions slot (theme toggle, sign out). Dashboardy has no
 * logo mark; the brand is set in type.
 */
function TopNav({
  brand = "Dashboardy",
  brandHref = "/",
  items = [],
  actions,
  sticky = true,
  maxWidth = "var(--container-max)",
  className = "",
  ...rest
}) {
  const classes = ["dby-nav", sticky ? "" : "dby-nav--static", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("header", _extends({
    className: classes
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "dby-nav__inner",
    style: {
      maxWidth
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "dby-nav__brand",
    href: brandHref
  }, brand), /*#__PURE__*/React.createElement("div", {
    className: "dby-nav__right"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "dby-nav__links",
    "aria-label": "Workspace"
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.href ?? it.label,
    href: it.href,
    className: `dby-nav__link${it.active ? " dby-nav__link--active" : ""}`,
    "aria-current": it.active ? "page" : undefined,
    onClick: it.onClick
  }, it.label))), actions ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "dby-nav__divider",
    "aria-hidden": "true"
  }), actions) : null)));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/WorkspaceBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.dby-wsbadge{
  display:inline-flex;align-items:center;gap:.5rem;
  border:1px solid var(--border-subtle);background:var(--surface-card);
  border-radius:var(--radius-sm);padding:.25rem .625rem;
  font-size:var(--text-caption);color:var(--text-primary);white-space:nowrap;
}
.dby-wsbadge__label{color:var(--text-muted);}
.dby-wsbadge__name{font-weight:var(--weight-medium);color:var(--text-strong);}
`;
if (typeof document !== "undefined" && !document.getElementById("dby-wsbadge-css")) {
  const s = document.createElement("style");
  s.id = "dby-wsbadge-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * WorkspaceBadge — the tenant/workspace identity chip. Reinforces the
 * single-workspace context (MVP) at the top of primary surfaces.
 */
function WorkspaceBadge({
  name,
  label = "Workspace",
  className = "",
  ...rest
}) {
  const classes = ["dby-wsbadge", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: classes,
    "data-testid": "workspace-badge"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "dby-wsbadge__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "dby-wsbadge__name"
  }, name));
}
Object.assign(__ds_scope, { WorkspaceBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/WorkspaceBadge.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/app.jsx
try { (() => {
/* global React, ReactDOM */
// Dashboardy — interactive UI-kit recreation. Composes the design-system
// components (window.DashboardyDesignSystem_787e56) into click-through screens
// that mirror the real Next.js app: sign-in → workspace → admin → dashboards.

const NS = window.DashboardyDesignSystem_787e56;
const {
  TopNav,
  ThemeToggle,
  WorkspaceBadge,
  PageHeader,
  Card,
  Button,
  IconButton,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Badge,
  Alert,
  EmptyState,
  Skeleton,
  Stat,
  DataTable,
  Divider,
  Widget,
  Kicker
} = NS;
const {
  useState,
  useEffect,
  useRef,
  Fragment
} = React;

/* ---------- tiny inline icons (Lucide-style, stroke 2) ---------- */
const Ico = {
  plus: "M12 5v14M5 12h14",
  search: "M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M21 21l-4.3-4.3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  external: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
};
function Icon({
  name,
  size = 15
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: Ico[name]
  }));
}

/* ---------- lightweight SVG charts (viz palette) ---------- */
function BarChart({
  data,
  height = 150
}) {
  const w = 320,
    pad = 6,
    max = Math.max(...data.map(d => d.y));
  const bw = (w - pad * 2) / data.length;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${height}`,
    width: "100%",
    height: height,
    preserveAspectRatio: "none",
    role: "img",
    "aria-label": "Bar chart"
  }, [0.25, 0.5, 0.75].map(g => /*#__PURE__*/React.createElement("line", {
    key: g,
    x1: "0",
    x2: w,
    y1: height * g,
    y2: height * g,
    stroke: "oklch(var(--viz-grid))",
    strokeWidth: "1",
    strokeDasharray: "3 3",
    opacity: "0.6"
  })), data.map((d, i) => {
    const bh = d.y / max * (height - 20);
    return /*#__PURE__*/React.createElement("rect", {
      key: i,
      x: pad + i * bw + bw * 0.15,
      y: height - bh,
      width: bw * 0.7,
      height: bh,
      rx: "2",
      fill: "oklch(var(--viz-1))"
    });
  }));
}
function LineChart({
  data,
  height = 150
}) {
  const w = 320,
    max = Math.max(...data.map(d => d.y)),
    min = Math.min(...data.map(d => d.y));
  const pts = data.map((d, i) => {
    const x = i / (data.length - 1) * w;
    const y = height - 14 - (d.y - min) / (max - min || 1) * (height - 28);
    return [x, y];
  });
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = path + ` L ${w} ${height} L 0 ${height} Z`;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${height}`,
    width: "100%",
    height: height,
    preserveAspectRatio: "none",
    role: "img",
    "aria-label": "Line chart"
  }, [0.25, 0.5, 0.75].map(g => /*#__PURE__*/React.createElement("line", {
    key: g,
    x1: "0",
    x2: w,
    y1: height * g,
    y2: height * g,
    stroke: "oklch(var(--viz-grid))",
    strokeWidth: "1",
    strokeDasharray: "3 3",
    opacity: "0.6"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: "oklch(var(--viz-1) / 0.10)"
  }), /*#__PURE__*/React.createElement("path", {
    d: path,
    fill: "none",
    stroke: "oklch(var(--viz-1))",
    strokeWidth: "2"
  }));
}

/* ---------- fake data ---------- */
const REVENUE = [{
  x: "Jan",
  y: 42
}, {
  x: "Feb",
  y: 55
}, {
  x: "Mar",
  y: 61
}, {
  x: "Apr",
  y: 58
}, {
  x: "May",
  y: 73
}, {
  x: "Jun",
  y: 84
}, {
  x: "Jul",
  y: 91
}];
const REGIONS = [{
  x: "NA",
  y: 128
}, {
  x: "EMEA",
  y: 92
}, {
  x: "APAC",
  y: 74
}, {
  x: "LATAM",
  y: 39
}];
const MEMBERS = [{
  id: "m1",
  email: "amir@acme.com",
  role: "admin",
  status: "active",
  joined: "Feb 12, 2026"
}, {
  id: "m2",
  email: "lin@acme.com",
  role: "analyst",
  status: "active",
  joined: "Mar 03, 2026"
}, {
  id: "m3",
  email: "dana@acme.com",
  role: "viewer",
  status: "active",
  joined: "Mar 21, 2026"
}, {
  id: "m4",
  email: "sana@acme.com",
  role: "analyst",
  status: "active",
  joined: "Apr 19, 2026"
}, {
  id: "m5",
  email: "omar@acme.com",
  role: "viewer",
  status: "active",
  joined: "May 02, 2026"
}, {
  id: "m6",
  email: "partner@northwind.io",
  role: "external_client",
  status: "inactive",
  joined: "Apr 08, 2026"
}];
const COLLECTIONS = [{
  id: "c1",
  name: "Revenue",
  sort: 0
}, {
  id: "c2",
  name: "Growth",
  sort: 1
}, {
  id: "c3",
  name: "Operations",
  sort: 2
}];
const DASHBOARDS = [{
  id: "d1",
  title: "Revenue Overview",
  collection: "Revenue",
  updated: "2h ago"
}, {
  id: "d2",
  title: "Growth & Retention",
  collection: "Growth",
  updated: "Yesterday"
}, {
  id: "d3",
  title: "Ops Health",
  collection: "Operations",
  updated: "Apr 30"
}];
const RESULT_ROWS = Array.from({
  length: 23
}, (_, i) => ({
  region: ["NA", "EMEA", "APAC", "LATAM"][i % 4],
  segment: ["Enterprise", "Mid-market", "SMB"][i % 3],
  revenue: (42000 - i * 830).toLocaleString(),
  deals: 120 - i * 3
}));
const roleLabel = r => ({
  admin: "Admin",
  analyst: "Analyst",
  viewer: "Viewer",
  external_client: "External client"
})[r] || r;

/* ================= screens ================= */

function SignIn({
  onSignIn
}) {
  const [email, setEmail] = useState("analyst@acme.com");
  const [pw, setPw] = useState("••••••••");
  return /*#__PURE__*/React.createElement("main", {
    style: {
      minHeight: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      inset: 0,
      background: "radial-gradient(680px 340px at 50% -8%, oklch(var(--accent) / 0.16), transparent 72%)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 420,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      marginBottom: 24,
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: "-0.02em",
      color: "var(--text-strong)"
    }
  }, "Dashboardy"), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 7,
      width: 7,
      borderRadius: "var(--radius-full)",
      background: "var(--gradient-brand)"
    }
  })), /*#__PURE__*/React.createElement(Kicker, null, "Authorized access"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "var(--text-strong)"
    }
  }, "Sign in"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      margin: 0
    }
  }, "Sign in with your workspace credentials.")), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      position: "relative",
      borderRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSignIn();
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Password"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    value: pw,
    onChange: e => setPw(e.target.value)
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    fullWidth: true
  }, "Sign in"))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 11,
      color: "var(--text-faint)",
      marginTop: 16,
      textAlign: "center"
    }
  }, "Demo \u2014 any credentials continue.")));
}
function SessionRow({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Kicker, null, label), /*#__PURE__*/React.createElement("div", null, children));
}
function Home({
  role
}) {
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    above: /*#__PURE__*/React.createElement(WorkspaceBadge, {
      name: "Acme Analytics"
    }),
    kicker: "Overview",
    title: "Dashboardy",
    description: "Your workspace overview. Analytics and dashboard modules appear here as they are provisioned."
  }), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 22px"
    }
  }, "Session context"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(SessionRow, {
    label: "Workspace"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-primary)"
    }
  }, "acme-analytics")), /*#__PURE__*/React.createElement(SessionRow, {
    label: "Role"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      textTransform: "capitalize",
      color: "var(--text-primary)"
    }
  }, role)), /*#__PURE__*/React.createElement(SessionRow, {
    label: "Signed in as"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, role, "@acme.com")), /*#__PURE__*/React.createElement(SessionRow, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "ok"
  }, "active"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Divider, null)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      margin: "20px 0 0",
      maxWidth: "60ch"
    }
  }, "Trust boundary: analytical data lives in Snowflake. The app stores only metadata, permissions, and a short-TTL result cache \u2014 you can always force a fresh run.")));
}
function Connections() {
  const [status, setStatus] = useState("active");
  const [testing, setTesting] = useState(false);
  const test = () => {
    setTesting(true);
    setStatus("pending_test");
    setTimeout(() => {
      setStatus("active");
      setTesting(false);
    }, 1100);
  };
  const badge = {
    active: "ok",
    pending_test: "warn",
    test_failed: "danger",
    not_configured: "idle"
  }[status];
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Administrative settings",
    title: "Data connection",
    description: "Configure connectivity metadata and deploy credentials. Secrets are stored write-only and never displayed after saving.",
    actions: /*#__PURE__*/React.createElement(Badge, {
      tone: badge
    }, status.replace(/_/g, " "))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 32,
      marginTop: 32,
      alignItems: "start"
    },
    className: "kit-cols"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: 0
    }
  }, "Connection details"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    dot: false
  }, "Admin")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Display name"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "Primary Snowflake"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Warehouse"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "COMPUTE_WH"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Database"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "ANALYTICS_DB"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Schema",
    optional: true
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "PUBLIC"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "22px 0"
    }
  }, /*#__PURE__*/React.createElement(Divider, null)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 4px"
    }
  }, "Credentials"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      margin: "0 0 16px"
    }
  }, "Leave blank to keep existing. Use a password or an encrypted private key (PEM), not both."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Account"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "acme.us-east-1"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Role"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "SYSADMIN"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Password"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    placeholder: "Enter password"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Save connection"))), /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      borderBottom: "1px solid var(--border-subtle)",
      paddingBottom: 18,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 4px"
    }
  }, "Diagnostic test"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      margin: 0,
      maxWidth: "44ch"
    }
  }, "Runs a handshake against the warehouse. On success the connection becomes active.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: test,
    disabled: testing
  }, testing ? "Testing…" : "Test connection")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(SessionRow, {
    label: "Last tested"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-primary)"
    }
  }, "Jul 06, 2026 14:20 UTC")), /*#__PURE__*/React.createElement(SessionRow, {
    label: "Last successful"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-primary)"
    }
  }, "Jul 06, 2026 14:20 UTC"))))), /*#__PURE__*/React.createElement("aside", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 16px"
    }
  }, "Procedure"), /*#__PURE__*/React.createElement("ol", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, [["Step 1 · Save", "Enter metadata and initial credentials. Moves to pending test."], ["Step 2 · Test", "Run the diagnostic. A successful handshake activates the connection."], ["Step 3 · Rotate", "Replace credentials when needed. Rotation is gated by a successful test."]].map(([k, v]) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Kicker, null, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      lineHeight: 1.5
    }
  }, v))))), /*#__PURE__*/React.createElement(Alert, {
    tone: "info",
    title: "Security"
  }, "Credentials are write-only. The API never returns secrets after they are saved."))));
}
function Members() {
  const cols = [{
    key: "email",
    header: "Identity",
    render: r => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: "var(--text-primary)"
      }
    }, r.email), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-faint)"
      }
    }, r.id, "\u2026"))
  }, {
    key: "role",
    header: "Role",
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: "var(--text-primary)"
      }
    }, roleLabel(r.role))
  }, {
    key: "status",
    header: "Status",
    render: r => /*#__PURE__*/React.createElement(Badge, {
      tone: r.status === "active" ? "ok" : "idle"
    }, r.status)
  }, {
    key: "joined",
    header: "Joined",
    mono: true,
    align: "right"
  }, {
    key: "act",
    header: "",
    align: "right",
    render: () => /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm"
    }, "Remove")
  }];
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Workspace directory",
    title: "Members",
    description: "Manage access and roles for Acme Analytics.",
    actions: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 28
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Admins",
      value: "01"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Analysts",
      value: "02"
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Viewers",
      value: "02"
    }))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 32,
      marginTop: 32,
      alignItems: "start"
    },
    className: "kit-cols"
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: 0
    }
  }, "Invite member"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    dot: false
  }, "Admin")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      margin: "0 0 18px"
    }
  }, "A temporary password is created and must be reset on first sign-in."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    placeholder: "you@company.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Role"
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: "viewer",
      label: "Viewer"
    }, {
      value: "analyst",
      label: "Analyst"
    }, {
      value: "admin",
      label: "Admin"
    }, {
      value: "external_client",
      label: "External client"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Temporary password"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    placeholder: "Minimum 8 characters"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Invite member"))), /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 14px"
    }
  }, "Directory"), [["Active members", "5"], ["Inactive", "1"], ["External partners", "1"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderBottom: i < 2 ? "1px solid var(--border-subtle)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 500,
      color: "var(--text-muted)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-primary)"
    }
  }, v))))), /*#__PURE__*/React.createElement("section", {
    style: {
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 16px"
    }
  }, "Roster"), /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement(DataTable, {
    columns: cols,
    rows: MEMBERS,
    pageSize: 5,
    getRowKey: r => r.id
  }))));
}
function Collections() {
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Saved questions",
    title: "Collections",
    description: "Organize reusable questions into flat collections for Acme Analytics. Authors can create, rename, and delete empty collections."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      gap: 32,
      marginTop: 32,
      alignItems: "start"
    },
    className: "kit-cols"
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 14px"
    }
  }, "New collection"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Name"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Revenue"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Sort order"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "number",
    defaultValue: "0"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Create collection"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--text-muted)",
      margin: "0 0 14px"
    }
  }, "Active collections (", COLLECTIONS.length, ")"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, COLLECTIONS.map(c => /*#__PURE__*/React.createElement(Card, {
    key: c.id,
    padding: "md",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, c.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, "Sort order ", c.sort)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Rename"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Delete"))))))));
}
function DashboardsList({
  onOpen
}) {
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Dashboard builder",
    title: "Dashboards",
    description: "Assemble governed KPI, chart, and table widgets from saved questions for Acme Analytics."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 2fr",
      gap: 32,
      marginTop: 32,
      alignItems: "start"
    },
    className: "kit-cols"
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "md"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--text-strong)",
      margin: "0 0 14px"
    }
  }, "New dashboard"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Collection"
  }, /*#__PURE__*/React.createElement(Select, {
    options: COLLECTIONS.map(c => ({
      value: c.id,
      label: c.name
    }))
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Title"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Revenue Overview"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus"
    })
  }, "Create dashboard"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 14,
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: "var(--text-muted)",
      margin: 0
    }
  }, "Dashboards (", DASHBOARDS.length, ")"), /*#__PURE__*/React.createElement(Select, {
    size: "sm",
    options: ["All collections", ...COLLECTIONS.map(c => c.name)]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, DASHBOARDS.map(d => /*#__PURE__*/React.createElement(Card, {
    key: d.id,
    padding: "md",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(d),
    style: {
      all: "unset",
      cursor: "pointer",
      fontSize: 15,
      fontWeight: 600,
      color: "var(--text-strong)"
    }
  }, d.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, d.collection, " \xB7 updated ", d.updated)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => onOpen(d)
  }, "View"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Edit"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Delete"))))))));
}
function DashboardView({
  dashboard,
  onBack
}) {
  const [range, setRange] = useState("Last 6 months");
  const [region, setRegion] = useState("All regions");
  const [loading, setLoading] = useState({});
  const [nonce, setNonce] = useState(0);

  // Changing a global filter auto-refreshes bound widgets (all but the overridden one).
  const refreshBound = () => {
    setLoading({
      rev: true,
      kpi1: true,
      kpi2: true,
      line: true,
      table: true
    });
    setTimeout(() => setLoading({}), 750);
  };
  const onFilter = setter => e => {
    setter(e.target.value);
    refreshBound();
  };
  const refreshOne = key => {
    setLoading(l => ({
      ...l,
      [key]: true
    }));
    setTimeout(() => setLoading(l => ({
      ...l,
      [key]: false
    })), 700);
    setNonce(n => n + 1);
  };
  const st = k => loading[k] ? "loading" : "ok";
  const tableCols = [{
    key: "region",
    header: "Region"
  }, {
    key: "segment",
    header: "Segment"
  }, {
    key: "revenue",
    header: "Revenue",
    mono: true,
    align: "right",
    render: r => "$" + r.revenue
  }, {
    key: "deals",
    header: "Deals",
    align: "right"
  }];
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      borderBottom: "1px solid var(--border-subtle)",
      paddingBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Kicker, null, "Dashboard"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "var(--text-strong)",
      margin: 0
    }
  }, dashboard.title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrowLeft"
    }),
    onClick: onBack
  }, "Back to list"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Edit"))), /*#__PURE__*/React.createElement(Card, {
    padding: "sm",
    style: {
      marginTop: 20,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, "Global filters"), /*#__PURE__*/React.createElement(Field, {
    htmlFor: "f-range"
  }, /*#__PURE__*/React.createElement(Select, {
    id: "f-range",
    size: "sm",
    value: range,
    onChange: onFilter(setRange),
    options: ["Last 6 months", "Last 12 months", "YTD", "Last 30 days"]
  })), /*#__PURE__*/React.createElement(Field, {
    htmlFor: "f-region"
  }, /*#__PURE__*/React.createElement(Select, {
    id: "f-region",
    size: "sm",
    value: region,
    onChange: onFilter(setRegion),
    options: ["All regions", "NA", "EMEA", "APAC", "LATAM"]
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-faint)"
    }
  }, "Bound widgets refresh immediately."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "download"
    })
  }, "Export CSV"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gridAutoRows: "minmax(120px, auto)",
      gap: 12,
      marginTop: 16
    },
    className: "kit-wgrid"
  }, /*#__PURE__*/React.createElement(Widget, {
    title: "Total revenue",
    state: st("kpi1"),
    kpi: "$23.8M",
    onRefresh: () => refreshOne("kpi1"),
    footer: /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("span", null, "Cache hit"), /*#__PURE__*/React.createElement("span", null, "10m TTL"))
  }), /*#__PURE__*/React.createElement(Widget, {
    title: "Active deals",
    state: st("kpi2"),
    kpi: "1,284",
    onRefresh: () => refreshOne("kpi2"),
    footer: /*#__PURE__*/React.createElement("span", null, "Fresh")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 2",
      gridRow: "span 2"
    }
  }, /*#__PURE__*/React.createElement(Widget, {
    title: "Revenue by month",
    state: st("rev"),
    onRefresh: () => refreshOne("rev"),
    minHeight: 252,
    footer: /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("span", null, "Fresh"), /*#__PURE__*/React.createElement("span", null, "7 rows"))
  }, /*#__PURE__*/React.createElement(BarChart, {
    data: REVENUE,
    height: 190
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 2"
    }
  }, /*#__PURE__*/React.createElement(Widget, {
    title: "Revenue by region",
    override: true,
    state: st("line"),
    onRefresh: () => refreshOne("line"),
    minHeight: 120,
    footer: /*#__PURE__*/React.createElement("span", null, "Overridden: EMEA")
  }, /*#__PURE__*/React.createElement(LineChart, {
    data: REGIONS,
    height: 92
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "span 4"
    }
  }, /*#__PURE__*/React.createElement(Widget, {
    title: "Revenue detail",
    state: st("table"),
    onRefresh: () => refreshOne("table"),
    footer: /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("span", null, "Cache miss"), /*#__PURE__*/React.createElement("span", null, "23 of 23 rows"), /*#__PURE__*/React.createElement("span", null, "2m TTL"))
  }, /*#__PURE__*/React.createElement(DataTable, {
    key: nonce,
    columns: tableCols,
    rows: RESULT_ROWS,
    pageSize: 6,
    getRowKey: (r, i) => i
  })))));
}
function Questions() {
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);
  const run = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setRan(true);
    }, 800);
  };
  const cols = [{
    key: "region",
    header: "Region"
  }, {
    key: "segment",
    header: "Segment"
  }, {
    key: "revenue",
    header: "Revenue",
    mono: true,
    align: "right",
    render: r => "$" + r.revenue
  }, {
    key: "deals",
    header: "Deals",
    align: "right"
  }];
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(PageHeader, {
    kicker: "Saved questions",
    title: "Revenue by region",
    description: "Governed SQL with declared scalar parameters. Run against the workspace's active Snowflake connection."
  }), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Collection"
  }, /*#__PURE__*/React.createElement(Select, {
    options: COLLECTIONS.map(c => c.name)
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Title"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "Revenue by region"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "SQL"
  }, /*#__PURE__*/React.createElement(Textarea, {
    mono: true,
    rows: 4,
    defaultValue: "SELECT region, segment, revenue, deals\nFROM analytics.revenue\nWHERE period >= :start_date AND region = :region\nORDER BY revenue DESC"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "22px 0"
    }
  }, /*#__PURE__*/React.createElement(Divider, null)), /*#__PURE__*/React.createElement(Kicker, null, "Run question"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "start_date",
    hint: "date \xB7 required"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    defaultValue: "2026-01-01"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "region",
    hint: "string"
  }, /*#__PURE__*/React.createElement(Input, {
    defaultValue: "NA"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: run,
    disabled: running
  }, running ? "Running…" : "Execute"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: run,
    disabled: running
  }, "Force fresh"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "download"
    })
  }, "Export CSV"))), running ? /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      marginTop: 20,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Skeleton, {
    width: "30%",
    height: 12
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "90%",
    height: 12
  }), /*#__PURE__*/React.createElement(Skeleton, {
    width: "80%",
    height: 12
  })) : ran ? /*#__PURE__*/React.createElement(Card, {
    padding: "md",
    style: {
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 16,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color: "var(--text-faint)",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "Status: ok"), /*#__PURE__*/React.createElement("span", null, "412 ms"), /*#__PURE__*/React.createElement("span", null, "23 rows"), /*#__PURE__*/React.createElement("span", null, "Cache: miss")), /*#__PURE__*/React.createElement(DataTable, {
    columns: cols,
    rows: RESULT_ROWS,
    pageSize: 6,
    getRowKey: (r, i) => i
  })) : null);
}

/* ================= shell / router ================= */
const NAV = [["home", "Home"], ["members", "Members"], ["connections", "Connections"], ["collections", "Collections"], ["questions", "Questions"], ["dashboards", "Dashboards"]];
function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [screen, setScreen] = useState("home");
  const [openDash, setOpenDash] = useState(null);
  const role = "analyst";
  if (!signedIn) return /*#__PURE__*/React.createElement(SignIn, {
    onSignIn: () => {
      setSignedIn(true);
      setScreen("home");
    }
  });
  const go = s => {
    setScreen(s);
    setOpenDash(null);
  };
  let content;
  if (screen === "home") content = /*#__PURE__*/React.createElement(Home, {
    role: role
  });else if (screen === "connections") content = /*#__PURE__*/React.createElement(Connections, null);else if (screen === "members") content = /*#__PURE__*/React.createElement(Members, null);else if (screen === "collections") content = /*#__PURE__*/React.createElement(Collections, null);else if (screen === "questions") content = /*#__PURE__*/React.createElement(Questions, null);else if (screen === "dashboards") content = openDash ? /*#__PURE__*/React.createElement(DashboardView, {
    dashboard: openDash,
    onBack: () => setOpenDash(null)
  }) : /*#__PURE__*/React.createElement(DashboardsList, {
    onOpen: d => setOpenDash(d)
  });
  return /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(TopNav, {
    items: NAV.map(([k, label]) => ({
      label,
      href: "#",
      active: screen === k,
      onClick: e => {
        e.preventDefault();
        go(k);
      }
    })),
    actions: /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement(ThemeToggle, null), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setSignedIn(false)
    }, "Sign out"))
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "40px 32px 64px"
    }
  }, content));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/app.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Card = __ds_scope.Card;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Kicker = __ds_scope.Kicker;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Widget = __ds_scope.Widget;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.ThemeToggle = __ds_scope.ThemeToggle;

__ds_ns.TopNav = __ds_scope.TopNav;

__ds_ns.WorkspaceBadge = __ds_scope.WorkspaceBadge;

})();
