---
name: Dashboardy
description: Calm, premium workspace administration for dashboards and reporting.
colors:
  ink-strong: "oklch(20% 0.02 255)"
  ink: "oklch(23% 0.018 255)"
  ink-muted: "oklch(47% 0.018 255)"
  ink-faint: "oklch(48% 0.018 255)"
  surface-app: "oklch(98.5% 0.006 255)"
  surface-0: "oklch(99.6% 0.004 255)"
  surface-1: "oklch(99.5% 0.004 255)"
  surface-2: "oklch(99.4% 0.004 255)"
  surface-3: "oklch(98% 0.006 255)"
  surface-4: "oklch(97.4% 0.008 255)"
  surface-5: "oklch(96.8% 0.01 255)"
  border-0: "oklch(91% 0.012 255)"
  border-1: "oklch(90% 0.014 255)"
  border-2: "oklch(89% 0.014 255)"
  border-3: "oklch(88% 0.018 255)"
  border-4: "oklch(82% 0.018 255)"
  accent: "oklch(46% 0.11 78)"
  accent-hover: "oklch(41% 0.115 78)"
  accent-active: "oklch(36% 0.11 78)"
  accent-soft: "oklch(94% 0.035 78)"
  accent-soft-ink: "oklch(38% 0.075 78)"
  focus: "oklch(58% 0.12 78)"
  focus-ring: "oklch(72% 0.07 78)"
  success-soft: "oklch(94% 0.04 150)"
  success-soft-ink: "oklch(38% 0.08 150)"
  danger-border: "oklch(84% 0.04 28)"
  danger-soft: "oklch(97% 0.02 28)"
  danger-soft-strong: "oklch(97% 0.025 28)"
  danger-ink: "oklch(42% 0.08 28)"
  danger-ink-strong: "oklch(37% 0.09 28)"
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

**Creative North Star: "The Quiet Atelier"**

Dashboardy's product UI is a workshop for careful decisions: clean surfaces, quiet structure, and deliberate emphasis. It should feel premium through restraint, not ornament, and remain readable under pressure without turning into a "starter kit" dashboard.

This system explicitly rejects generic SaaS template aesthetics, neon-on-black "crypto dashboard" styling, and spreadsheet-dense intimidation. It reduces cognitive load before adding features, and makes scope, access, and freshness easy to trust.

**Key Characteristics:**
- Tonal depth, not shadow theatrics.
- Few colors with sharp intent.
- Rounded geometry that reads modern, not playful.
- Clear states (hover, focus, disabled) that stay calm.
- **Heritage Gold** accent — warm, confident, and rare.

## 2. Colors

The palette is cool-ink neutrals with a single confident **Heritage Gold** accent used sparingly.

### Primary
- **Heritage Gold** ({colors.accent}): Primary actions, checkbox accents, and the rare "yes, do this now" moments. A warm, muted gold that reads as premium and deliberate.

### Neutral
- **Ink** ({colors.ink-strong}, {colors.ink}, {colors.ink-muted}): Hierarchy for headings, body, helper text. Muted ink carries secondary explanation rather than forcing extra UI chrome.
- **Paper Surfaces** ({colors.surface-app}, {colors.surface-0}, {colors.surface-4}, {colors.surface-5}): App background plus stepped containers. Use steps to separate regions before introducing new borders.
- **Edge Lines** ({colors.border-0}, {colors.border-3}, {colors.border-4}): Borders and dividers are thin and precise, used to clarify structure without shouting.

### Named Rules (optional, powerful)
**The One Accent Rule.** The primary Heritage Gold accent exists to signal decisive action and focus states. If a screen feels "gold-heavy", the rule is being broken. Use it sparingly — restraint is luxury.

## 3. Typography

**Display Font:** System sans (UI sans-serif stack)
**Body Font:** System sans (same stack)

**Character:** Editorially quiet, clean, and modern. Hierarchy comes from weight and tracking rather than loud color.

### Hierarchy
- **Display** (600, 30px, tight tracking): Page titles only.
- **Headline** (600, 20px): Section headings and key card headings.
- **Title** (600, 18px): Subsection labels where density increases (tables, panels).
- **Body** (400, 14px, 1.5): Most copy. Keep reading width around 65–75ch.
- **Label** (600, 12px, uppercase with tracking): Small structural markers (kickers, table headings).

### Named Rules (optional)
**The Quiet Kicker Rule.** Uppercased labels should set context, not compete with the title. Keep them small and muted.

## 4. Elevation

Dashboardy is tonal-layered and flat by default. Depth comes from surface steps and crisp edges; shadows, if introduced later, should be rare and state-driven (hover/focus), never structural.

### Named Rules (optional)
**The Flat-By-Default Rule.** If you need a shadow to make the UI understandable, the spacing and surface steps are wrong.

## 5. Components

### Buttons
- **Shape:** Gently curved, modern corners (12px).
- **Primary:** Heritage Gold with light ink on top, medium weight, comfortable padding (8px 20px).
- **Quiet:** Surface + border structure, used for secondary actions (Save role).
- **Danger:** Quiet styling with danger ink and danger border, used only for destructive actions.
- **Focus:** `focus-visible` uses a clear outline and ring in the same warm hue family as the accent.

### Inputs / Fields
- **Style:** Paper surface with a precise border, rounded (12px), and consistent height (44px min).
- **Focus:** Border + ring, never relying on color alone for meaning.
- **Disabled:** Tonal fade that still keeps text readable.

### Status Pills
- **Active:** Soft success surface + success ink.
- **Inactive:** Neutral soft surface + muted ink, never using opacity-only contrast drops.

### Tables / Roster Rows
- **Structure:** Header row in a slightly darker surface step, thin dividers, and tabular numerals for counts.
- **Density:** Comfortable row padding with clear column alignment; avoid "spreadsheet" tightness.

## 6. Do's and Don'ts

### Do:
- **Do** use surface steps before borders to create hierarchy (surfaces first, lines second).
- **Do** keep the Heritage Gold accent rare, and spend it on primary actions and focus states.
- **Do** show destructive actions as quiet but unmistakable (danger ink + border, no theatrics).
- **Do** keep copy short and operational, optimizing for repeat use and fast scanning.
- **Do** let the warm gold accent pop against the cool neutral surfaces for a premium feel.

### Don't:
- **Don't** drift into generic SaaS template aesthetics and "dashboard starter kit" sameness.
- **Don't** use neon-on-black, high-chroma "crypto dashboard" styling.
- **Don't** ship spreadsheet-dense, intimidating screens that force cognition before context.
- **Don't** overuse the gold — it earns its impact through scarcity.
