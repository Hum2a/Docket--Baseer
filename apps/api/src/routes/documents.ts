import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { createDocumentSchema } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/owner";
import { withOwner } from "../middleware/owner";
import { withOwnerRls } from "../db/client";
import { documents } from "../db/schema";
import { buildObjectKey, createPresignedUrl } from "../lib/r2";
import { serializeDocument } from "../lib/serialize";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", withOwner);

/** Private binding proxy when S3 credentials are not configured. */
app.put("/proxy/upload", async (c) => {
  const userId = c.get("userId");
  const key = c.req.query("key");
  if (!key || !key.startsWith(`${userId}/`)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const body = await c.req.arrayBuffer();
  await c.env.DOCUMENTS.put(key, body, {
    httpMetadata: {
      contentType: c.req.header("content-type") ?? "application/octet-stream",
    },
  });
  return c.json({ ok: true });
});

app.get("/proxy/download", async (c) => {
  const userId = c.get("userId");
  const key = c.req.query("key");
  if (!key || !key.startsWith(`${userId}/`)) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const obj = await c.env.DOCUMENTS.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  return new Response(obj.body, { headers });
});

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const applicationId = c.req.query("applicationId");
  const rows = await withOwnerRls(db, userId, (tx) => {
    if (applicationId) {
      return tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.ownerId, userId),
            eq(documents.applicationId, applicationId),
          ),
        )
        .orderBy(desc(documents.uploadedAt));
    }
    return tx
      .select()
      .from(documents)
      .where(eq(documents.ownerId, userId))
      .orderBy(desc(documents.uploadedAt));
  });
  return c.json({ data: rows.map(serializeDocument) });
});

app.post("/presign-upload", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const body = createDocumentSchema.parse(await c.req.json());
  const r2Key = buildObjectKey(userId, body.filename);

  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .insert(documents)
      .values({
        ownerId: userId,
        applicationId: body.applicationId ?? null,
        type: body.type,
        filename: body.filename,
        r2Key,
      })
      .returning(),
  );

  const { url, expiresIn } = await createPresignedUrl(c.env, {
    key: r2Key,
    method: "PUT",
    contentType: body.contentType ?? "application/octet-stream",
  });

  return c.json(
    {
      data: {
        document: serializeDocument(rows[0]!),
        uploadUrl: url,
        expiresIn,
      },
    },
    201,
  );
});

app.get("/:id/download", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, userId)))
      .limit(1),
  );
  const row = rows[0];
  if (!row) return c.json({ error: "Not found" }, 404);

  const { url, expiresIn } = await createPresignedUrl(c.env, {
    key: row.r2Key,
    method: "GET",
  });
  return c.json({ data: { downloadUrl: url, expiresIn, document: serializeDocument(row) } });
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const id = c.req.param("id");

  const deleted = await withOwnerRls(db, userId, async (tx) => {
    const rows = await tx
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.ownerId, userId)))
      .returning();
    return rows[0] ?? null;
  });

  if (!deleted) return c.json({ error: "Not found" }, 404);

  try {
    await c.env.DOCUMENTS.delete(deleted.r2Key);
  } catch {
    /* best-effort object cleanup */
  }

  return c.json({ ok: true });
});

export default app;
