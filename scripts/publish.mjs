/**
 * One-shot: push secrets → deploy Worker + Pages → migrate/seed DB.
 *
 * Usage:
 *   npm run publish:production
 *   npm run publish:staging
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];

if (!target || !["staging", "production"].includes(target)) {
  console.error("Usage: npm run publish:production | npm run publish:staging");
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nDocket publish → ${target}\n`);

run("node", [join(root, "scripts/cf-secrets.mjs"), target]);
run("npm", ["run", `deploy:${target}`, "--workspace=@docket/api"]);
run("npm", ["run", `deploy:${target}`, "--workspace=@docket/web"]);
run("npm", ["run", "db:migrate"]);
run("npm", ["run", "db:seed"]);

console.log(`\nPublished ${target}.`);
console.log("API secrets are on the Worker; migrate/seed used local DATABASE_URL (same Neon).");
console.log("Attach custom domains in the Cloudflare dashboard when the zone is ready.\n");
