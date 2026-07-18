import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const checks = [];

function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}

ok("package.json", existsSync("package.json"));
ok("turbo.json", existsSync("turbo.json"));
ok("AGENTS.md", existsSync("AGENTS.md"));
ok(".cursor/rules", existsSync(".cursor/rules/00-project.mdc"));
ok("apps/web", existsSync("apps/web/package.json"));
ok("apps/api", existsSync("apps/api/package.json"));
ok("packages/shared", existsSync("packages/shared/package.json"));
ok(".env.example", existsSync(".env.example"));
ok("wrangler", existsSync("apps/api/wrangler.toml") || existsSync("apps/api/wrangler.jsonc"));

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
ok("npm workspaces", Array.isArray(pkg.workspaces));
ok("no pnpm lock", !existsSync("pnpm-lock.yaml"));
ok("no yarn lock", !existsSync("yarn.lock"));

let failed = 0;
for (const c of checks) {
  const mark = c.pass ? "OK" : "FAIL";
  if (!c.pass) failed += 1;
  console.log(`[${mark}] ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

if (failed) {
  console.error(`\nDoctor found ${failed} issue(s).`);
  process.exit(1);
}
console.log("\nDoctor: all checks passed.");
