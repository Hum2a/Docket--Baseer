# Deployment

## Environments

| | Staging | Production |
|---|---|---|
| Git | `develop` | tag `v*` (from `main`) |
| Neon | `staging` branch | `main` branch |
| Worker | `[env.staging]` | `[env.production]` |
| R2 | `docket-documents-staging` | `docket-documents` |
| App | `jobtracker-staging.baseer.co.uk` | `jobtracker.baseer.co.uk` |
| API | `jobtracker-api-staging.baseer.co.uk` | `jobtracker-api.baseer.co.uk` |

## DNS

On the `baseer.co.uk` Cloudflare zone (the new account), add:

| Hostname | Target |
|---|---|
| `jobtracker.baseer.co.uk` | Pages project (production) |
| `jobtracker-staging.baseer.co.uk` | Pages project (staging) |
| `jobtracker-api.baseer.co.uk` | Worker custom domain (production) |
| `jobtracker-api-staging.baseer.co.uk` | Worker custom domain (staging) |

Attach each as a custom domain on the corresponding Pages/Workers project so Universal SSL covers them. Use single-level subdomains only (avoid `api.jobtracker.baseer.co.uk`).

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

## Secrets

Set via Cloudflare dashboard / `wrangler secret put` and GitHub Actions secrets:

- `DATABASE_URL` (or Hyperdrive)
- `OWNER_ID` (defaults to `seed-user-baseer` in wrangler vars)
- Hyperdrive config IDs
