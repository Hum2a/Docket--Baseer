import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createNotificationEmailSchema } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/owner";
import { withOwner } from "../middleware/owner";
import { withOwnerRls } from "../db/client";
import { notificationEmails } from "../db/schema";
import {
  DEFAULT_NOTIFICATION_EMAIL,
  emailAlreadyExists,
  ensureDefaultNotificationEmail,
  listNotificationEmails,
  normalizeEmail,
  resolveNotificationRecipients,
} from "../lib/notification-recipients";
import { sendTestNotificationEmail } from "../lib/resend";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", withOwner);

function serialize(row: typeof notificationEmails.$inferSelect) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const rows = await withOwnerRls(db, userId, async (tx) => {
    await ensureDefaultNotificationEmail(
      tx,
      userId,
      c.env.REMINDER_EMAIL_TO ?? DEFAULT_NOTIFICATION_EMAIL,
    );
    return listNotificationEmails(tx, userId);
  });
  return c.json({ data: rows.map(serialize) });
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = createNotificationEmailSchema.parse(await c.req.json());
  const email = normalizeEmail(body.email);

  const created = await withOwnerRls(db, userId, async (tx) => {
    if (await emailAlreadyExists(tx, userId, email)) {
      return { conflict: true as const };
    }
    const rows = await tx
      .insert(notificationEmails)
      .values({ ownerId: userId, email })
      .returning();
    return { conflict: false as const, row: rows[0]! };
  });

  if (created.conflict) {
    return c.json({ error: "Email already in the list" }, 409);
  }
  return c.json({ data: serialize(created.row) }, 201);
});

app.post("/test", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const recipients = await withOwnerRls(db, userId, (tx) =>
    resolveNotificationRecipients(tx, c.env),
  );
  const result = await sendTestNotificationEmail(c.env, recipients);
  if (!result.ok && "error" in result) {
    return c.json({ error: result.error, recipients }, 502);
  }
  if (!result.ok && "skipped" in result) {
    return c.json({ ok: false, skipped: true, reason: result.reason, recipients }, 400);
  }
  return c.json({ ok: true, recipients, result });
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");

  const result = await withOwnerRls(db, userId, async (tx) => {
    const current = await listNotificationEmails(tx, userId);
    if (current.length <= 1 && current[0]?.id === id) {
      return { blocked: true as const };
    }
    const rows = await tx
      .delete(notificationEmails)
      .where(
        and(eq(notificationEmails.id, id), eq(notificationEmails.ownerId, userId)),
      )
      .returning();
    return { blocked: false as const, deleted: Boolean(rows[0]) };
  });

  if (result.blocked) {
    return c.json({ error: "Keep at least one notification email" }, 400);
  }
  if (!result.deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export default app;
