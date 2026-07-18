# Deployment

## Environments

| | Staging | Production |
|---|---|---|
| Git | `develop` | tag `v*` (from `main`) |
| Neon | `staging` branch | `main` branch |
| Worker | `[env.staging]` | `[env.production]` |
| R2 | `docket-documents-staging` | `docket-documents` |
| App | `baseer-staging.humza-butt.space` | `baseer.humza-butt.space` |
| API | `baseer-api-staging.humza-butt.space` | `baseer-api.humza-butt.space` |

## DNS

Add single-level CNAME records on the `humza-butt.space` Cloudflare zone for each hostname, then attach as custom domains on Pages/Workers so Universal SSL covers them. Do not nest (e.g. `api.baseer.…`).

## Commands

```bash
npm run deploy:staging
npm run deploy:production
```

GitHub Actions:

- CI on PRs
- Deploy staging on push to `develop`
- Deploy production on tags matching `v*`

## Secrets

Set via Cloudflare dashboard / `wrangler secret put` and GitHub Actions secrets:

- `BETTER_AUTH_SECRET`
- Hyperdrive config IDs
- Database URLs for migrate/seed jobs
