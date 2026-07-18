import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { loadEnv } from "./load-env";

loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is required for db:seed.\nRun `npm run setup`, then set DATABASE_URL in `.env`.",
  );
  process.exit(1);
}

const ownerId = process.env.OWNER_ID ?? "seed-user-baseer";
const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

async function main() {
  const existing = await db.select().from(schema.user).where(eq(schema.user.id, ownerId));
  if (existing.length === 0) {
    await db.insert(schema.user).values({
      id: ownerId,
      name: "Baseer",
      email: "baseer@baseer.co.uk",
    });
  }

  const apps = await db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.ownerId, ownerId));

  if (apps.length === 0) {
    const [app] = await db
      .insert(schema.applications)
      .values({
        ownerId,
        company: "Acme Corp",
        roleTitle: "Software Engineer",
        location: "Remote",
        status: "applied",
        appliedDate: new Date(),
        source: "LinkedIn",
      })
      .returning();

    if (app) {
      await db.insert(schema.notes).values({
        applicationId: app.id,
        ownerId,
        body: "Submitted via careers page.",
      });
      await db.insert(schema.reminders).values({
        applicationId: app.id,
        ownerId,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        message: "Follow up if no reply",
      });
    }
  }

  console.log(`Seed complete (OWNER_ID=${ownerId}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
