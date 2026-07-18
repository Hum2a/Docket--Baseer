import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for db:migrate");
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../drizzle");

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const appliedRes = await client.query<{ hash: string }>(
      `SELECT hash FROM "__drizzle_migrations"`,
    );
    const appliedSet = new Set(appliedRes.rows.map((r) => r.hash));

    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`skip ${file}`);
        continue;
      }
      const body = readFileSync(join(dir, file), "utf8");
      await client.query(body);
      await client.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [file, Date.now()],
      );
      console.log(`applied ${file}`);
    }
    console.log("Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
