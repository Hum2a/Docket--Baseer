# Data import (for humans & Claude Cowork)

Upload job applications into Docket so they appear on the board/list/stats.

Primary docs for automation. Example payload: [`examples/applications.import.json`](../examples/applications.import.json).

## Recommended commands

Because `npm run` on Windows/npm 11 can strip `--flags`, prefer **env vars** or call `node` directly.

### Via env + npm (best for Claude Cowork on Windows)

```powershell
$env:DOCKET_API_URL = "https://docket-api.humzab1711.workers.dev"
npm run data:import -- examples/applications.import.json

# Check only (no writes)
$env:DOCKET_IMPORT_CHECK = "1"
npm run data:import -- examples/applications.import.json
```

### Via node directly (full CLI flags work)

```powershell
node scripts/import-applications.mjs --api=https://docket-api.humzab1711.workers.dev examples/applications.import.json
node scripts/import-applications.mjs --check --api=https://docket-api.humzab1711.workers.dev examples/applications.import.json
Get-Content payload.json | node scripts/import-applications.mjs --api=https://docket-api.humzab1711.workers.dev --stdin
```

### Local API

```powershell
# terminal 1
npm run dev

# terminal 2
npm run data:import -- examples/applications.import.json
```

## Env vars

| Var | Purpose |
|---|---|
| `DOCKET_API_URL` | API base (production or local) |
| `DOCKET_IMPORT_CHECK=1` | Validate / print only — no writes |
| `API_URL` / `VITE_API_URL` | Fallbacks if `DOCKET_API_URL` unset |

## JSON format

Either `{ "applications": [ ... ] }` or a bare `[ ... ]` array.

| Field | Required | Notes |
|---|---|---|
| `company` | yes | string |
| `roleTitle` | yes | string (position) |
| `industry` | yes | free text, e.g. Technology, Fintech |
| `status` | no | `wishlist` \| `applied` \| `interview` \| `offer` \| `rejected` (default `wishlist`) |
| `location` | no | string |
| `jobUrl` | no | valid URL |
| `appliedDate` | no | ISO date or `YYYY-MM-DD` |
| `salaryRange` | no | free text |
| `source` | no | e.g. LinkedIn, referral |
| `notes` | no | string[] |
| `reminders` | no | `{ "dueDate", "message" }[]` |

## Claude Cowork workflow

1. Collect roles (LinkedIn, email, spreadsheet).
2. Write `import-YYYY-MM-DD.json` matching the schema.
3. Import:

```powershell
$env:DOCKET_API_URL = "https://docket-api.humzab1711.workers.dev"
npm run data:import -- .\import-YYYY-MM-DD.json
```

4. Refresh the site — cards show on the Kanban board.

**Agent tips**

- Set `DOCKET_IMPORT_CHECK=1` first on large/messy payloads.
- One failed row does not stop the batch; exit code is non-zero if any failed.
- No auth headers (single-owner instance).
- Do not put secrets in the JSON.
- When custom domains are live: `https://jobtracker-api.baseer.co.uk`.

## HTTP API (same endpoints the script uses)

| Method | Path |
|---|---|
| `POST` | `/api/applications` |
| `POST` | `/api/notes/application/:id` |
| `POST` | `/api/reminders/application/:id` |
| `GET` | `/api/applications` |

## Related

- Seed demo row: `npm run db:seed`
- Deploy: [`DEPLOYMENT.md`](./DEPLOYMENT.md)
