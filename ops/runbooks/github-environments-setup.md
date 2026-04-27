# GitHub Environments setup (one-time)

This is a **manual** configuration in the GitHub UI. Do it once per repository (or when onboarding a new org/repo) so deploy workflows can use scoped secrets and production approvals.

## 1. Create environments

In the GitHub repo: **Settings → Environments → New environment**.

1. **`staging`**
   - Do **not** add deployment protection rules that require reviewers (staging should deploy automatically on release tags).
   - Optionally add **wait timer** or **deployment branches** if your org policy requires it; the platform spec assumes tag-driven deploys without human approval on staging.

2. **`production`**
   - Under **Environment protection rules**, enable **Required reviewers**.
   - Add at least one member or team from the **platform team** who is authorised to approve production rollouts (see [promote-production.md](promote-production.md)).
   - Save. **Done when** the GitHub UI shows **≥ 1 required reviewer** for `production`.

## 2. Attach secrets to each environment

Attach secrets to **`staging`** and **`production`** as appropriate (names only here):

| Secret / variable | Used for | Typical environment |
|-------------------|----------|----------------------|
| `STAGING_DATABASE_URL` | Migration job and implied DB target for staging | `staging` |
| `PRODUCTION_DATABASE_URL` | Migration job against production Postgres | `production` |
| Registry login (e.g. `REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`) | Build and push images | both (or org-level if you prefer) |
| Bunny / container platform tokens and IDs (e.g. `BUNNYNET_API_KEY`, `STAGING_*_APP_ID`, `STAGING_*_CONTAINER`, production counterparts) | Deploy steps and health-check URLs | match workflow `environment:` blocks |

Exact names must match what `.github/workflows/release-staging.yml` and `release-production.yml` reference. Keep values out of git; use GitHub **Environment secrets** (or variables for non-sensitive URLs if you split them).

## 3. Verify workflows

- Open **Actions** and confirm `release-staging.yml` lists `environment: staging` and `release-production.yml` lists `environment: production`.
- Trigger a harmless dry run if your org allows (e.g. workflow_dispatch on a branch) or wait for the first real tag and confirm secrets resolve.

## 4. Ownership

Re-review this setup when:

- Platform team membership changes (update required reviewers on `production`).
- Registry or Bunny projects rotate credentials.
- You add a new region or duplicate environment (e.g. disaster recovery).
