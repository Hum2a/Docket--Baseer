#!/usr/bin/env node
/**
 * Sync Baseer's "Job Application Tracker.csv" into the Docket Neon database.
 *
 * Run after finishing a batch of applications:
 *   npm run db:sync   (from apps/api)
 *
 * What it does:
 *   - Reads the tracker CSV (default: ../../../Job Application Tracker.csv,
 *     i.e. the "Career" folder two levels above the repo root — override with
 *     TRACKER_CSV_PATH if the file ever moves).
 *   - Skips any row still at "Not Started" (nothing to sync yet).
 *   - Upserts every other row into the `applications` table, matched on
 *     job_url for the fixed OWNER_ID. Existing rows are updated in place
 *     (status, applied date, salary, etc.); new ones are inserted.
 *   - Never deletes rows, and never touches notes/reminders/documents.
 *
 * Requires DATABASE_URL (and optionally OWNER_ID) in a `.env` file at the
 * repo root — see .env.example. Uses @neondatabase/serverless directly with
 * parameterized SQL (no Drizzle import here, so this script has no
 * dependency on the TS build).
 */
import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// .env loading (mirrors apps/api/src/db/load-env.ts; kept standalone here so
// this script has zero project-internal imports).
// ---------------------------------------------------------------------------
function loadEnv(repoRoot) {
  const envPath = resolve(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../.."); // apps/api/scripts -> apps/api -> apps -> repo root (Baseer-Job-Tracker)
loadEnv(repoRoot);

const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_ID = process.env.OWNER_ID || "seed-user-baseer";
const TRACKER_CSV_PATH = process.env.TRACKER_CSV_PATH
  ? resolve(process.env.TRACKER_CSV_PATH)
  : resolve(repoRoot, "../../Job Application Tracker.csv"); // repo root -> DocIt -> Career

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required. Set it in .env at the repo root (see .env.example).");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ---------------------------------------------------------------------------
// Minimal RFC4180 CSV parser (handles quoted fields with embedded commas).
// No external dependency needed for a file this size.
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip, \n handles the line break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

// ---------------------------------------------------------------------------
// Tracker Status -> Docket application_status enum
// (Docket has no "Withdrawn" state; tracked as "rejected" so it drops out of
// the active kanban columns. The original tracker Status stays the source of
// truth for the nuance.)
// ---------------------------------------------------------------------------
const STATUS_MAP = {
  "not started": "wishlist",
  applied: "applied",
  interview: "interview",
  offer: "offer",
  rejected: "rejected",
  withdrawn: "rejected",
};

function mapStatus(raw) {
  const key = (raw || "").trim().toLowerCase();
  return STATUS_MAP[key] ?? "wishlist";
}

function cleanOrNull(raw) {
  const v = (raw ?? "").trim();
  if (!v || v.toLowerCase() === "not listed" || v.toLowerCase() === "not specified") return null;
  return v;
}

function parseDateOrNull(raw) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function ensureSchemaExists() {
  const rows = await sql`SELECT to_regclass('public.applications') AS reg`;
  if (!rows[0]?.reg) {
    console.error(
      'The "applications" table doesn\'t exist in this database yet.\n' +
        "Run migrations first, from apps/api:\n" +
        "  npm run db:migrate\n" +
        "Then re-run: npm run db:sync",
    );
    process.exit(1);
  }
}

async function ensureOwner() {
  const rows = await sql`SELECT id FROM "user" WHERE id = ${OWNER_ID} LIMIT 1`;
  if (rows.length === 0) {
    await sql`
      INSERT INTO "user" (id, name, email)
      VALUES (${OWNER_ID}, 'Baseer', 'baseer@baseer.co.uk')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`Created owner row (${OWNER_ID}).`);
  }
}

async function upsertApplication(record) {
  if (record.jobUrl) {
    const existing = await sql`
      SELECT id FROM applications
      WHERE owner_id = ${OWNER_ID} AND job_url = ${record.jobUrl}
      LIMIT 1
    `;
    if (existing.length > 0) {
      await sql`
        UPDATE applications
        SET company = ${record.company},
            role_title = ${record.roleTitle},
            location = ${record.location},
            status = ${record.status},
            applied_date = ${record.appliedDate},
            salary_range = ${record.salaryRange},
            source = ${record.source},
            updated_at = now()
        WHERE id = ${existing[0].id}
      `;
      return "updated";
    }
  }

  await sql`
    INSERT INTO applications
      (owner_id, company, role_title, location, job_url, status, applied_date, salary_range, source)
    VALUES
      (${OWNER_ID}, ${record.company}, ${record.roleTitle}, ${record.location}, ${record.jobUrl},
       ${record.status}, ${record.appliedDate}, ${record.salaryRange}, ${record.source})
  `;
  return "inserted";
}

async function main() {
  if (!existsSync(TRACKER_CSV_PATH)) {
    console.error(`Tracker CSV not found at: ${TRACKER_CSV_PATH}`);
    console.error("Set TRACKER_CSV_PATH in .env if the file has moved.");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(TRACKER_CSV_PATH, "utf8"));
  if (rows.length === 0) {
    console.log("Tracker CSV is empty — nothing to sync.");
    return;
  }

  const header = rows[0].map((h) => h.trim());
  const colIndex = (name) => header.indexOf(name);
  const col = {
    company: colIndex("Company"),
    title: colIndex("Job Title"),
    location: colIndex("Location"),
    salary: colIndex("Salary"),
    status: colIndex("Status"),
    dateApplied: colIndex("Date Applied"),
    source: colIndex("Source"),
    url: colIndex("Job URL"),
  };
  const missing = Object.entries(col).filter(([, i]) => i === -1);
  if (missing.length > 0) {
    console.error(
      `Tracker CSV header is missing expected column(s): ${missing.map(([k]) => k).join(", ")}. ` +
        "Check the file hasn't been renamed or restructured.",
    );
    process.exit(1);
  }

  await ensureSchemaExists();
  await ensureOwner();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const r of rows.slice(1)) {
    if (r.length < header.length) continue;
    const statusRaw = r[col.status];
    if (!statusRaw || statusRaw.trim().toLowerCase() === "not started") {
      skipped++;
      continue;
    }

    const record = {
      company: (r[col.company] || "").trim() || "Unknown",
      roleTitle: (r[col.title] || "").trim() || "Unknown",
      location: cleanOrNull(r[col.location]),
      jobUrl: cleanOrNull(r[col.url]),
      status: mapStatus(statusRaw),
      appliedDate: parseDateOrNull(r[col.dateApplied]),
      salaryRange: cleanOrNull(r[col.salary]),
      source: cleanOrNull(r[col.source]),
    };

    const result = await upsertApplication(record);
    if (result === "inserted") inserted++;
    else updated++;
  }

  console.log(
    `Sync complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped (still "Not Started").`,
  );
}

main().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
