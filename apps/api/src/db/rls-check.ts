import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for db:rls:check");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const tables = ["applications", "notes", "reminders", "documents"] as const;
  for (const table of tables) {
    const rows = await sql`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = ${table}
    `;
    const enabled = rows[0]?.relrowsecurity === true;
    if (!enabled) {
      throw new Error(`RLS not enabled on ${table}`);
    }
    const policies = await sql`
      SELECT policyname FROM pg_policies WHERE tablename = ${table}
    `;
    if (policies.length < 4) {
      throw new Error(`Expected CRUD policies on ${table}, found ${policies.length}`);
    }
    console.log(`OK ${table}: RLS on, ${policies.length} policies`);
  }
  console.log("db:rls:check passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
