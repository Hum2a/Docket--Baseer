import { cpSync, mkdirSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, ".cursor", "rules");
const targets = [join(root, ".claude", "rules"), join(root, ".agents", "rules")];

if (!existsSync(source)) {
  console.error("Missing .cursor/rules");
  process.exit(1);
}

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source)) {
    cpSync(join(source, file), join(target, file));
  }
  console.log(`Synced rules → ${target}`);
}

cpSync(join(root, "AGENTS.md"), join(root, ".agents", "AGENTS.md"));
console.log("Synced AGENTS.md → .agents/AGENTS.md");
