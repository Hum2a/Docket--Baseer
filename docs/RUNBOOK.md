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
| Import applications | `npm run data:import -- <file.json>` ([DATA_IMPORT.md](./DATA_IMPORT.md)) |
| Full gate | `npm run ship-it` |

## R2

Buckets stay private. Only short-lived (5–10 min) signed URLs from `apps/api/src/lib/r2.ts`.

## Email notifications (Resend)

Recipient defaults to `baseer@baseer.co.uk` (`REMINDER_EMAIL_TO` / `REMINDER_EMAIL_FROM` in `wrangler.toml`).

### New application (Claude Code / UI / import)

Every `POST /api/applications` sends a bespoke email:

- Subject: `Docket: You've been applied for {role} at {company}`
- Body: company, role, industry, status, salary, location, source, applied date, job URL, link to the detail page

Fires for board create, API create, and `npm run data:import` (same endpoint). Email is sent via `waitUntil` so create still succeeds if Resend fails.

### Reminder digests

Production/staging Workers run a cron at **08:00 UTC** (`0 8 * * *`) that emails incomplete reminders due today or overdue.

1. Verify the sending domain in [Resend](https://resend.com) for `@baseer.co.uk`.
2. Put `RESEND_API_KEY` in root `.env` or `apps/api/.dev.vars`, then:
   ```bash
   npm run cf:secrets -- production RESEND_API_KEY
   ```
3. Manual digest test:
   ```bash
   curl -X POST https://docket-api.humzab1711.workers.dev/api/reminders/digest
   ```
   If the key is missing, sends are skipped with a clear log (create/digest still succeed).

## Incidents

1. Confirm Worker logs in Cloudflare dashboard.
2. Confirm Hyperdrive + Neon branch connectivity.
3. Run `npm run db:rls:check` against the affected branch.
4. Roll back Worker/Pages deployment if needed.
