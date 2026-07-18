import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { createDb, type Database } from "../db/client";

export type AppVariables = {
  userId: string;
  db: Database;
};

/** Attach DB + fixed OWNER_ID — no authentication. */
export const withOwner = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const ownerId = c.env.OWNER_ID;
  if (!ownerId) {
    return c.json({ error: "OWNER_ID is not configured" }, 500);
  }

  const { db, pool } = createDb(c.env);
  c.set("userId", ownerId);
  c.set("db", db);

  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});
