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

function runNode(scriptPath, args) {
  console.log(`\n> node ${scriptPath} ${args.join(" ")}\n`);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpm(args) {
  console.log(`\n> npm ${args.join(" ")}\n`);
  // On Windows, npm is a .cmd shim and needs shell:true.
  // Do not put spaced filesystem paths in the command string — only in cwd.
  const result = spawnSync("npm", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`\nDocket publish → ${target}\n`);

runNode(join(root, "scripts", "cf-secrets.mjs"), [target]);
runNpm(["run", `deploy:${target}`, "--workspace=@docket/api"]);
runNpm(["run", `deploy:${target}`, "--workspace=@docket/web"]);
runNpm(["run", "db:migrate"]);
runNpm(["run", "db:seed"]);

console.log(`\nPublished ${target}.`);
console.log("API secrets are on the Worker; migrate/seed used local DATABASE_URL (same Neon).");
console.log("Attach custom domains in the Cloudflare dashboard when the zone is ready.\n");
