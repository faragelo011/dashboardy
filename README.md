# Dashboardy

Dashboardy is a monorepo for the Dashboardy product: a web experience backed by an API, with shared packages and automated delivery. This repository is organized for incremental platform work (see `specs/001-platform-foundation/` for the current foundation feature).

## Getting started

Follow **[specs/001-platform-foundation/quickstart.md](specs/001-platform-foundation/quickstart.md)** for environment setup, local services, and validation steps.

For local commit checks, install the hooks once:

```bash
uv run --directory apps/api pre-commit install
```
