/**
 * Import applications (optional notes + reminders) via the Docket API.
 *
 * Designed for humans and agents (e.g. Claude Cowork):
 *
 *   npm run data:import -- examples/applications.import.json
 *   npm run data:import -- --api=https://docket-api.humzab1711.workers.dev path/to/file.json
 *   set DOCKET_API_URL=https://... && npm run data:import -- file.json
 *   type file.json | npm run data:import -- --stdin
 *
 * Payload shape: see docs/DATA_IMPORT.md and examples/applications.import.json
 *
 * Note: avoid npm-reserved flags like --dry-run; use --check instead.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const STATUSES = new Set([
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
]);

function parseArgs(argv) {
  const out = { api: null, stdin: false, dryRun: false, file: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--api" || a === "-a") out.api = argv[++i];
    else if (a.startsWith("--api=")) out.api = a.slice("--api=".length);
    else if (a === "--stdin") out.stdin = true;
    else if (a === "--check" || a === "-n") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else rest.push(a);
  }
  out.file = rest.find((x) => !x.startsWith("-")) ?? null;
  return out;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

function resolveApiBase(cliApi) {
  if (cliApi) return cliApi.replace(/\/$/, "");
  const env = {
    ...loadEnvFile(join(root, ".env")),
    ...loadEnvFile(join(root, "apps/web/.env")),
    ...process.env,
  };
  const base =
    env.DOCKET_API_URL || env.API_URL || env.VITE_API_URL || "http://localhost:8787";
  return base.replace(/\/$/, "");
}

function envFlagTrue(name) {
  const v = process.env[name];
  return v === "1" || v === "true" || v === "yes";
}

async function readStdin() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const chunks = [];
  for await (const line of rl) chunks.push(line);
  return chunks.join("\n");
}

function normalizePayload(raw) {
  let data = raw;
  if (typeof raw === "string") data = JSON.parse(raw);
  if (Array.isArray(data)) data = { applications: data };
  if (!data || !Array.isArray(data.applications)) {
    throw new Error(
      'JSON must be { "applications": [ ... ] } or a [ ... ] array of applications',
    );
  }
  return data.applications.map((row, i) => {
    if (!row.company || !row.roleTitle || !row.industry) {
      throw new Error(
        `applications[${i}]: company, roleTitle, and industry are required`,
      );
    }
    const status = row.status ?? "wishlist";
    if (!STATUSES.has(status)) {
      throw new Error(
        `applications[${i}]: invalid status "${status}". Use: ${[...STATUSES].join(", ")}`,
      );
    }
    return {
      company: String(row.company),
      roleTitle: String(row.roleTitle),
      industry: String(row.industry),
      location: row.location ?? null,
      jobUrl: row.jobUrl || null,
      status,
      appliedDate: row.appliedDate ?? null,
      salaryRange: row.salaryRange ?? null,
      source: row.source ?? null,
      notes: Array.isArray(row.notes)
        ? row.notes.map((n) => (typeof n === "string" ? n : n.body)).filter(Boolean)
        : [],
      reminders: Array.isArray(row.reminders)
        ? row.reminders.map((r) => ({
            dueDate: r.dueDate,
            message: r.message,
          }))
        : [],
    };
  });
}

async function api(base, path, init) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} → ${res.status}: ${body.error ?? JSON.stringify(body)}`,
    );
  }
  return body;
}

async function importOne(base, app, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would create ${app.company} — ${app.roleTitle}`);
    return { id: "dry-run", company: app.company };
  }

  const created = await api(base, "/api/applications", {
    method: "POST",
    body: JSON.stringify({
      company: app.company,
      roleTitle: app.roleTitle,
      industry: app.industry,
      location: app.location,
      jobUrl: app.jobUrl,
      status: app.status,
      appliedDate: app.appliedDate,
      salaryRange: app.salaryRange,
      source: app.source,
    }),
  });

  const id = created.data.id;

  for (const body of app.notes) {
    await api(base, `/api/notes/application/${id}`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  for (const rem of app.reminders) {
    if (!rem.dueDate || !rem.message) continue;
    const due = rem.dueDate.includes("T")
      ? rem.dueDate
      : new Date(`${rem.dueDate}T09:00:00.000Z`).toISOString();
    await api(base, `/api/reminders/application/${id}`, {
      method: "POST",
      body: JSON.stringify({ dueDate: due, message: rem.message }),
    });
  }

  return created.data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  npm run data:import -- <file.json>
  npm run data:import -- --api=https://host <file.json>
  set DOCKET_API_URL=https://host&& npm run data:import -- <file.json>
  npm run data:import -- --stdin < file.json
  npm run data:import -- --check <file.json>

See docs/DATA_IMPORT.md`);
    process.exit(0);
  }

  // npm 11 may strip --flags even after `--`; prefer env when using `npm run`.
  const dryRun = args.dryRun || envFlagTrue("DOCKET_IMPORT_CHECK");
  const base = resolveApiBase(args.api || process.env.DOCKET_API_URL);
  let raw;
  if (args.stdin || envFlagTrue("DOCKET_IMPORT_STDIN")) {
    raw = await readStdin();
  } else if (args.file) {
    const path = resolve(process.cwd(), args.file);
    if (!existsSync(path)) {
      console.error(`File not found: ${path}`);
      process.exit(1);
    }
    raw = readFileSync(path, "utf8");
  } else {
    console.error("Pass a JSON file path, or --stdin. Use --help for usage.");
    process.exit(1);
  }

  const apps = normalizePayload(raw);
  console.log(`Importing ${apps.length} application(s) → ${base}`);
  if (dryRun) console.log("(check mode — no writes)\n");

  let ok = 0;
  for (const app of apps) {
    try {
      const row = await importOne(base, app, dryRun);
      console.log(`  ✓ ${row.company} — ${app.roleTitle} (${row.id})`);
      ok += 1;
    } catch (err) {
      console.error(`  ✗ ${app.company} — ${app.roleTitle}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${ok}/${apps.length} imported.`);
  if (ok < apps.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
