import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isReminderDueSoon } from "@docket/shared";

const migration = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../drizzle/0000_init.sql"),
  "utf8",
);

describe("RLS schema", () => {
  it("defines auth.user_id() helper", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION auth.user_id()");
    expect(migration).toContain("request.jwt.claim.sub");
  });

  for (const table of ["applications", "notes", "reminders", "documents"]) {
    it(`enables RLS and owner policies on ${table}`, () => {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ON "${table}"`);
      expect(migration).toContain('(select auth.user_id()) = "owner_id"');
    });
  }

  it("cascades notes/reminders and nulls document application_id", () => {
    expect(migration).toMatch(
      /"application_id" uuid NOT NULL REFERENCES "applications"\("id"\) ON DELETE cascade/,
    );
    expect(migration).toContain(
      '"application_id" uuid REFERENCES "applications"("id") ON DELETE set null',
    );
  });
});

describe("auth.user_id mapping contract", () => {
  it("maps fixed OWNER_ID → JWT sub claim for RLS", () => {
    // withOwnerRls sets request.jwt.claim.sub to Env.OWNER_ID.
    // Policies compare owner_id to auth.user_id(), which reads that claim.
    expect(migration).toContain("auth.user_id()");
  });
});

describe("reminder due indicator", () => {
  it("flags overdue and within 3 days", () => {
    const now = new Date("2026-07-18T12:00:00Z");
    expect(isReminderDueSoon("2026-07-17T00:00:00Z", false, now)).toBe(true);
    expect(isReminderDueSoon("2026-07-20T00:00:00Z", false, now)).toBe(true);
    expect(isReminderDueSoon("2026-07-25T00:00:00Z", false, now)).toBe(false);
    expect(isReminderDueSoon("2026-07-17T00:00:00Z", true, now)).toBe(false);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("RLS isolation (live DB)", () => {
  it("owner A cannot read owner B rows", async () => {
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { eq } = await import("drizzle-orm");
    const { sql } = await import("drizzle-orm");
    const schema = await import("./schema");

    const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 });
    const db = drizzle(pool, { schema });

    const userA = "rls-test-a";
    const userB = "rls-test-b";

    try {
      for (const id of [userA, userB]) {
        await db
          .insert(schema.user)
          .values({ id, name: id, email: `${id}@test.local` })
          .onConflictDoNothing();
      }

      await db.delete(schema.applications).where(eq(schema.applications.ownerId, userA));
      await db.delete(schema.applications).where(eq(schema.applications.ownerId, userB));

      const [rowB] = await db
        .insert(schema.applications)
        .values({
          ownerId: userB,
          company: "Secret Co",
          roleTitle: "Hidden",
          industry: "Technology",
          status: "wishlist",
        })
        .returning();

      expect(rowB).toBeDefined();

      const asA = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('request.jwt.claim.sub', ${userA}, true)`,
        );
        await tx.execute(sql`SET LOCAL ROLE authenticated`).catch(() => undefined);
        return tx
          .select()
          .from(schema.applications)
          .where(eq(schema.applications.id, rowB!.id));
      });

      expect(asA).toHaveLength(0);

      const asB = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT set_config('request.jwt.claim.sub', ${userB}, true)`,
        );
        await tx.execute(sql`SET LOCAL ROLE authenticated`).catch(() => undefined);
        return tx
          .select()
          .from(schema.applications)
          .where(eq(schema.applications.id, rowB!.id));
      });

      expect(asB).toHaveLength(1);
    } finally {
      await pool.end();
    }
  });
});
