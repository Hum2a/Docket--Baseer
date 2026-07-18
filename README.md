# Docket

Personal job application tracker for Baseer — kanban board, list view, notes/reminders, document storage, and stats.

## Stack

React 19 + Vite · Hono on Cloudflare Workers · Neon Postgres (Hyperdrive + Drizzle + RLS) · R2 · no login (fixed OWNER_ID)

## Quick start

```bash
npm install
npm run setup          # env files, .dev.vars, auth secret, rules sync
# set DATABASE_URL in .env if needed, then re-run setup
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:8787  

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start web + API |
| `npm run check` | Typecheck |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run test:rls` | RLS tests |
| `npm run doctor` | Env/scaffold sanity |
| `npm run ship-it` | check + test + build |
| `npm run deploy:staging` / `deploy:production` | Cloudflare deploy |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and [AGENTS.md](AGENTS.md).
