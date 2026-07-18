# Runbook

## Local development

```bash
npm install
npm run setup          # creates .env, apps/api/.dev.vars, apps/web/.env; syncs secrets
# edit .env and set DATABASE_URL if still a placeholder, then: npm run setup
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8787

## Common tasks

| Task | Command |
|---|---|
| Typecheck/lint | `npm run check` |
| Unit + RLS | `npm test` / `npm run test:rls` |
| E2E | `npm run test:e2e` |
| Env sanity | `npm run doctor` |
| Sync agent rules | `npm run rules:sync` |
| Full gate | `npm run ship-it` |

## Auth cookie issues

If sessions do not stick across Pages/Workers, verify `COOKIE_DOMAIN` matches the app host (`baseer.humza-butt.space` or staging equivalent), not the API host.

## R2

Buckets stay private. Only short-lived (5–10 min) signed URLs from `apps/api/src/lib/r2.ts`.

## Future: reminder digests

Optional Phase 8 follow-up: daily Resend email listing due/overdue reminders. Not implemented in v1 — would require a scheduled Worker cron and Resend API key.

## Incidents

1. Confirm Worker logs in Cloudflare dashboard.
2. Confirm Hyperdrive + Neon branch connectivity.
3. Run `npm run db:rls:check` against the affected branch.
4. Roll back Worker/Pages deployment if needed.
