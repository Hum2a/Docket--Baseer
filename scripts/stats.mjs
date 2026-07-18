import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const skip = new Set(["node_modules", "dist", ".turbo", ".wrangler", "coverage", ".git"]);
const counts = {};

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else {
      const ext = extname(name) || "(none)";
      counts[ext] = (counts[ext] ?? 0) + 1;
    }
  }
}

walk(".");
console.log("File counts by extension:");
for (const [ext, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ext.padEnd(8)} ${n}`);
}
