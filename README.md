# Dashboardy

Dashboardy is a monorepo for the Dashboardy product: a web experience backed by an API, with shared packages and automated delivery. This repository is organized for incremental platform work (see `specs/001-platform-foundation/` for the current foundation feature).

## Documentation

- **[docs/env.md](docs/env.md)** — environment variable reference (names, required vs optional, deployment names).
- **[specs/001-platform-foundation/quickstart.md](specs/001-platform-foundation/quickstart.md)** — local bring-up, staging deploy walkthrough, and validation checklist.
- **[ops/runbooks/README.md](ops/runbooks/README.md)** — index of operational runbooks.
- **[specs/001-platform-foundation/spec.md](specs/001-platform-foundation/spec.md)** — platform foundation feature specification.

## Required tooling

- **Node.js** 20 LTS (matches CI and container images).
- **pnpm** 9 (see `packageManager` in root `package.json`).
- **Python** 3.12 and **uv** (API dependency lockfile under `apps/api/`).
- **Docker** (local Postgres via `ops/docker-compose.yml`, optional image builds).

## Getting started

Follow **[specs/001-platform-foundation/quickstart.md](specs/001-platform-foundation/quickstart.md)** for environment setup, local services, and validation steps.

From the repo root you can run workspace checks:

```bash
pnpm lint
pnpm test
pnpm build
```

For local commit checks, install the hooks once:

```bash
uv run --directory apps/api pre-commit install
```
