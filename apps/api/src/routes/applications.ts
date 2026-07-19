import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/owner";
import { withOwner } from "../middleware/owner";
import { withOwnerRls } from "../db/client";
import { applications } from "../db/schema";
import { serializeApplication } from "../lib/serialize";
import { sendApplicationCreatedEmail } from "../lib/resend";
import { resolveNotificationRecipients } from "../lib/notification-recipients";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", withOwner);

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx.select().from(applications).orderBy(desc(applications.updatedAt)),
  );
  return c.json({ data: rows.map(serializeApplication) });
});

app.get("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.ownerId, userId)))
      .limit(1),
  );
  const row = rows[0];
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: serializeApplication(row) });
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = createApplicationSchema.parse(await c.req.json());
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .insert(applications)
      .values({
        ownerId: userId,
        company: body.company,
        roleTitle: body.roleTitle,
        industry: body.industry,
        location: body.location ?? null,
        jobUrl: body.jobUrl || null,
        status: body.status ?? "wishlist",
        appliedDate: body.appliedDate ? new Date(body.appliedDate) : null,
        salaryRange: body.salaryRange ?? null,
        source: body.source ?? null,
      })
      .returning(),
  );
  const created = serializeApplication(rows[0]!);
  const recipients = await withOwnerRls(db, userId, (tx) =>
    resolveNotificationRecipients(tx, c.env),
  );
  c.executionCtx.waitUntil(
    sendApplicationCreatedEmail(c.env, created, recipients).then((result) => {
      console.log("[application-email]", created.id, recipients, result);
    }),
  );
  return c.json({ data: created }, 201);
});

app.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const body = updateApplicationSchema.parse(await c.req.json());

  const patch: Partial<typeof applications.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.company !== undefined) patch.company = body.company;
  if (body.roleTitle !== undefined) patch.roleTitle = body.roleTitle;
  if (body.industry !== undefined) patch.industry = body.industry;
  if (body.location !== undefined) patch.location = body.location ?? null;
  if (body.jobUrl !== undefined) patch.jobUrl = body.jobUrl || null;
  if (body.status !== undefined) patch.status = body.status;
  if (body.appliedDate !== undefined) {
    patch.appliedDate = body.appliedDate ? new Date(body.appliedDate) : null;
  }
  if (body.salaryRange !== undefined) patch.salaryRange = body.salaryRange ?? null;
  if (body.source !== undefined) patch.source = body.source ?? null;

  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .update(applications)
      .set(patch)
      .where(and(eq(applications.id, id), eq(applications.ownerId, userId)))
      .returning(),
  );
  const row = rows[0];
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: serializeApplication(row) });
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.ownerId, userId)))
      .returning(),
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default app;
