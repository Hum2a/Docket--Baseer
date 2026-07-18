import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import type { Env } from "../env";
import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

function connectionString(env: Env): string {
  const raw = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
  if (!raw) throw new Error("No DATABASE_URL or HYPERDRIVE binding configured");
  // Some Workers/edge paths choke on channel_binding=require.
  return raw.replace(/([?&])channel_binding=require&?/g, "$1").replace(/[?&]$/, "");
}

/**
 * Create a Drizzle client over Neon HTTP (Workers-friendly).
 * One client per request context — do not open ad-hoc clients in handlers.
 *
 * Note: Neon HTTP has no interactive sessions, so RLS JWT claims cannot be
 * set via set_config. Routes always filter by OWNER_ID; Hyperdrive + Pool
 * can restore claim mapping later if needed.
 */
export function createDb(env: Env): { db: Database; pool: { end: () => Promise<void> } } {
  const sql = neon(connectionString(env));
  const db = drizzle(sql, { schema });
  return {
    db,
    pool: { end: async () => undefined },
  };
}

/** Run work scoped to the fixed owner (OWNER_ID). */
export async function withOwnerRls<T>(
  db: Database,
  _ownerId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return fn(db);
}
