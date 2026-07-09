# Product

## Register

product

## Users

Dashboardy serves a mixed set of roles inside one workspace:

- **Admins**: configure Snowflake connections, manage members, and grant external clients per-asset access.
- **Analysts**: author governed SQL, create saved questions, assemble dashboards, and maintain collections.
- **Viewers**: consume dashboards/questions, apply filters, and export bounded CSV when permitted.
- **External clients**: view only explicitly granted assets; no browsing outside grants.

Usage context: high-stakes decision-making (exec / GM), operational reviews, and analyst workflows. The UI should support both quick scans and deep inspection without feeling “busy.”

## Product Purpose

Enable organizations to author trusted analytics from Snowflake, organize reusable assets with clear permissions, and consume interactive dashboards with predictable freshness and export behavior — without becoming a general-purpose self-serve BI product.

Success looks like:

- Analysts ship reusable, governed dashboards faster with fewer “what does this number mean?” questions.
- Viewers understand scope, filters, and freshness at a glance and can confidently share/act.
- External clients get a safe, minimal surface with only what they’re allowed to see.

## Brand Personality

Calm, confident, precise.

Voice: concise, factual, and slightly technical. Avoid hype; show correctness and clarity.

## Anti-references

- Generic SaaS templates and “marketing-polish UI” tropes (gradient-text headlines, hero-metric clichés, endless identical card grids).
- “Mystery math” dashboards that hide filter scope, time windows, or freshness.
- Decorative UI that competes with data density (heavy ornament, gratuitous motion).

## Design Principles

1. **Explain the truth boundary**: make scope, filters, and freshness legible; don’t imply certainty you can’t support.
2. **Governance without friction**: permissions and roles should be obvious, not obstructive.
3. **Dense, but breathable**: support data-heavy surfaces with strong hierarchy and predictable spacing.
4. **One action, one outcome**: reduce ambiguity in destructive actions, exports, and refresh.
5. **Respect the reader**: minimal fluff; defaults optimized for clarity and speed.

## Accessibility & Inclusion

- Target **WCAG 2.2 AA** for core flows.
- Support **prefers-reduced-motion**: no essential meaning carried by animation; reduce to instant/crossfade.
- Maintain strong contrast for body text and data labels; ensure focus visibility for keyboard users.

