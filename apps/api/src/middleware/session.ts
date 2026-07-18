import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { createAuth } from "../lib/auth";
import { createDb, type Database } from "../db/client";

export type AppVariables = {
  userId: string;
  db: Database;
};

export const requireSession = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const { db, pool } = createDb(c.env);
  try {
    const auth = createAuth(c.env, db);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("userId", session.user.id);
    c.set("db", db);
    await next();
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
});
