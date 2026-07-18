# AGENTS.md — Docket

Single source of truth for coding agents working on Docket.

## What this is

Docket is a personal job application tracker for Baseer. Single-owner instance (no login), own Neon DB, own Cloudflare deployment. No billing, no multi-tenant licensing.

**Domains (zone `baseer.co.uk`):** app `jobtracker.baseer.co.uk` / `jobtracker-staging.baseer.co.uk`; API `jobtracker-api.baseer.co.uk` / `jobtracker-api-staging.baseer.co.uk`. Single-level subdomains on the zone (free Universal SSL wildcard).

## Stack

- Frontend: React 19 + Vite SPA, Tailwind v4 + shadcn/ui
- API: Hono on Cloudflare Workers
- DB: Neon Postgres via Hyperdrive, Drizzle ORM, RLS on every app table
- Auth: none — fixed `OWNER_ID` env for all rows
- Files: Cloudflare R2 (presigned URLs only)
- Monorepo: npm workspaces + Turborepo (never pnpm/yarn)
- Tests: Vitest (unit/RLS), Playwright (e2e)

## Hard rules

1. TypeScript strict throughout.
2. All DB access through Drizzle — never raw SQL in route handlers.
3. All file access through `apps/api/src/lib/r2.ts` — never construct bucket URLs inline.
4. Every table gets an RLS policy (`owner_id = auth.user_id()`) before any route touches it.
5. Hyperdrive: pool/reuse connections; do not open a new client per request.
6. No login — all API routes use `OWNER_ID` + RLS claim mapping.
7. Free tier only: no Cloudflare Containers/Queues; no nested subdomains needing Advanced Certificate Manager.
8. Kanban: optimistic UI on drop, reconcile with server, roll back on failure.
9. npm scripts use `<domain>:<action>`; bare names only for top-level aggregates.
10. Keep `.cursor/rules` as the canonical rules; run `npm run rules:sync` after edits.

## Layout

```
apps/web          React + Vite SPA
apps/api          Hono Worker + Drizzle
packages/shared   Shared Zod schemas / types
docs/             ARCHITECTURE, RLS, DEPLOYMENT, RUNBOOK
```

## Environments

| | Staging | Production |
|---|---|---|
| Branch | `develop` | `main` (tag `v*`) |
| Neon | `staging` | `main` |
| R2 | `docket-documents-staging` | `docket-documents` |
| App | `jobtracker-staging.baseer.co.uk` | `jobtracker.baseer.co.uk` |
| API | `jobtracker-api-staging.baseer.co.uk` | `jobtracker-api.baseer.co.uk` |

## Local setup

```bash
npm install
npm run setup          # .env, apps/api/.dev.vars, apps/web/.env, rules sync
npm run db:migrate
npm run db:seed
npm run dev
```

## Verification

```bash
npm run check
npm test
npm run test:e2e
npm run doctor
npm run ship-it
```
