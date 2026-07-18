/**
 * Push local secrets from .env / apps/api/.dev.vars to Cloudflare Workers.
 *
 * Usage:
 *   npm run cf:secrets -- production
 *   npm run cf:secrets -- staging
 *   npm run cf:secrets -- production DATABASE_URL
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "apps/api");

const envName = process.argv[2];
const onlyKey = process.argv[3];

if (!envName || !["staging", "production"].includes(envName)) {
  console.error("Usage: npm run cf:secrets -- <staging|production> [SECRET_NAME]");
  process.exit(1);
}

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
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
    out[key] = value;
  }
  return out;
}

function loadLocalEnv() {
  const merged = {};
  for (const path of [join(root, ".env"), join(apiDir, ".dev.vars")]) {
    if (!existsSync(path)) continue;
    Object.assign(merged, parseEnv(readFileSync(path, "utf8")));
  }
  return merged;
}

/** Secrets that must not live in wrangler.toml [vars]. */
const SECRET_KEYS = ["DATABASE_URL", "RESEND_API_KEY"];

function putSecret(name, value) {
  console.log(`  putting ${name} → env.${envName} …`);
  const wranglerJs = [
    join(apiDir, "node_modules/wrangler/bin/wrangler.js"),
    join(root, "node_modules/wrangler/bin/wrangler.js"),
  ].find((p) => existsSync(p));

  if (!wranglerJs) {
    throw new Error("wrangler not found — run npm install");
  }

  const result = spawnSync(process.execPath, [wranglerJs, "secret", "put", name, "--env", envName], {
    cwd: apiDir,
    input: `${value}\n`,
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Failed to put secret ${name}`);
  }
}

const local = loadLocalEnv();
const keys = onlyKey ? [onlyKey] : SECRET_KEYS;

console.log(`\nCloudflare secrets → ${envName}\n`);

let put = 0;
for (const key of keys) {
  const value = local[key];
  if (!value || value.includes("user:pass@localhost")) {
    console.error(`  skip ${key} — missing or still a placeholder in .env / .dev.vars`);
    continue;
  }
  putSecret(key, value);
  put += 1;
}

if (!put) {
  console.error("\nNo secrets pushed. Set DATABASE_URL in .env then re-run.\n");
  process.exit(1);
}

console.log(`\nDone — ${put} secret(s) set on docket-api (${envName}).`);
console.log("Non-secret vars (APP_URL, API_URL, OWNER_ID, REMINDER_EMAIL_*) come from wrangler.toml.");
console.log("Optional: set RESEND_API_KEY in .env / .dev.vars for daily reminder digests.\n");
console.log("Next: npm run deploy:production  (or deploy:staging)\n");
