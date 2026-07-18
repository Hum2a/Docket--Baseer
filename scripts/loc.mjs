import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const roots = ["apps", "packages", "scripts"];
const exts = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".json", ".md"]);
const skip = new Set(["node_modules", "dist", ".turbo", ".wrangler", "coverage"]);

let files = 0;
let lines = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path);
    else if (exts.has(extname(name))) {
      files += 1;
      lines += readFileSync(path, "utf8").split(/\r?\n/).length;
    }
  }
}

for (const r of roots) {
  try {
    walk(r);
  } catch {
    /* missing */
  }
}

console.log(`LOC: ${lines} lines across ${files} files`);
