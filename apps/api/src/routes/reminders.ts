import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { createReminderSchema, updateReminderSchema } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/session";
import { requireSession } from "../middleware/session";
import { withOwnerRls } from "../db/client";
import { applications, reminders } from "../db/schema";
import { serializeReminder } from "../lib/serialize";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", requireSession);

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .select()
      .from(reminders)
      .where(eq(reminders.ownerId, userId))
      .orderBy(asc(reminders.dueDate)),
  );
  return c.json({ data: rows.map(serializeReminder) });
});

app.get("/application/:applicationId", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const applicationId = c.req.param("applicationId");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .select()
      .from(reminders)
      .where(
        and(
          eq(reminders.applicationId, applicationId),
          eq(reminders.ownerId, userId),
        ),
      )
      .orderBy(asc(reminders.dueDate)),
  );
  return c.json({ data: rows.map(serializeReminder) });
});

app.post("/application/:applicationId", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const applicationId = c.req.param("applicationId");
  const body = createReminderSchema.parse(await c.req.json());

  const created = await withOwnerRls(db, userId, async (tx) => {
    const owns = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(eq(applications.id, applicationId), eq(applications.ownerId, userId)),
      )
      .limit(1);
    if (!owns[0]) return null;
    const rows = await tx
      .insert(reminders)
      .values({
        applicationId,
        ownerId: userId,
        dueDate: new Date(body.dueDate),
        message: body.message,
      })
      .returning();
    return rows[0] ?? null;
  });

  if (!created) return c.json({ error: "Not found" }, 404);
  return c.json({ data: serializeReminder(created) }, 201);
});

app.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const body = updateReminderSchema.parse(await c.req.json());

  const patch: Partial<typeof reminders.$inferInsert> = {};
  if (body.dueDate !== undefined) patch.dueDate = new Date(body.dueDate);
  if (body.message !== undefined) patch.message = body.message;
  if (body.completed !== undefined) patch.completed = body.completed;

  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .update(reminders)
      .set(patch)
      .where(and(eq(reminders.id, id), eq(reminders.ownerId, userId)))
      .returning(),
  );
  const row = rows[0];
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ data: serializeReminder(row) });
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .delete(reminders)
      .where(and(eq(reminders.id, id), eq(reminders.ownerId, userId)))
      .returning(),
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default app;
