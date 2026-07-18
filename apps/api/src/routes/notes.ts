import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { createNoteSchema } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/owner";
import { withOwner } from "../middleware/owner";
import { withOwnerRls } from "../db/client";
import { applications, notes } from "../db/schema";
import { serializeNote } from "../lib/serialize";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", withOwner);

app.get("/application/:applicationId", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const applicationId = c.req.param("applicationId");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .select()
      .from(notes)
      .where(
        and(eq(notes.applicationId, applicationId), eq(notes.ownerId, userId)),
      )
      .orderBy(desc(notes.createdAt)),
  );
  return c.json({ data: rows.map(serializeNote) });
});

app.post("/application/:applicationId", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const applicationId = c.req.param("applicationId");
  const body = createNoteSchema.parse(await c.req.json());

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
      .insert(notes)
      .values({ applicationId, ownerId: userId, body: body.body })
      .returning();
    return rows[0] ?? null;
  });

  if (!created) return c.json({ error: "Not found" }, 404);
  return c.json({ data: serializeNote(created) }, 201);
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.ownerId, userId)))
      .returning(),
  );
  if (!rows[0]) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default app;
