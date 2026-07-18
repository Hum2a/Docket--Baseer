# Deployment

## Environments

| | Staging | Production |
|---|---|---|
| Git | `develop` | tag `v*` (from `main`) |
| Neon | `staging` branch | `main` branch |
| Worker | `[env.staging]` | `[env.production]` |
| R2 | `docket-documents-staging` | `docket-documents` |
| App | `docket-staging.baseer.co.uk` | `docket.baseer.co.uk` |
| API | staging Worker / custom domain | `docket-api.humzab1711.workers.dev` |

## DNS / custom domains

1. Ensure `baseer.co.uk` is an active zone on the **same** Cloudflare account Wrangler uses (`wrangler whoami`).
2. Deploy Workers/Pages first (custom domains are **not** in `wrangler.toml` routes — that fails if the zone is missing).
3. In the dashboard, attach custom domains:

| Hostname | Target |
|---|---|
| `docket.baseer.co.uk` | Pages project (production) |
| `docket-staging.baseer.co.uk` | Pages project (staging) |
| `docket-api.baseer.co.uk` | Worker `docket-api` (optional; currently workers.dev) |
| `docket-api-staging.baseer.co.uk` | Worker `docket-api-staging` |

Use single-level subdomains only.

## Commands

```bash
npm run deploy:staging
npm run deploy:production
```

GitHub Actions:

- CI on PRs
- Deploy staging on push to `develop`
- Deploy production on tags matching `v*`

Use Cloudflare API credentials for the **baseer.co.uk** account (`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`).

## Secrets & publish

Non-secret vars (`APP_URL`, `API_URL`, `OWNER_ID`) live in [`apps/api/wrangler.toml`](../apps/api/wrangler.toml).

Worker **secrets** (`DATABASE_URL`, optional `RESEND_API_KEY` for reminder digests) — push from local `.env`:

```bash
npm run cf:secrets -- production
npm run cf:secrets -- staging
# or one key:
npm run cf:secrets -- production RESEND_API_KEY
```

Verify the Resend domain for `@baseer.co.uk` before digests will deliver. See [RUNBOOK.md](./RUNBOOK.md).

One-shot publish (secrets → deploy API → deploy web → migrate → seed):

```bash
npm run publish:production
npm run publish:staging
```

Or set manually:

```bash
cd apps/api
npx wrangler secret put DATABASE_URL --env production
```
