import { and, eq, lte } from "drizzle-orm";
import type { Env } from "../env";
import { createDb } from "../db/client";
import { applications, reminders } from "../db/schema";
import { sendReminderDigest, type DigestReminderRow } from "./resend";

/** End of the current UTC calendar day. */
export function endOfTodayUtc(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
}

export async function runReminderDigest(env: Env): Promise<{
  count: number;
  result: Awaited<ReturnType<typeof sendReminderDigest>>;
}> {
  const ownerId = env.OWNER_ID;
  if (!ownerId) {
    console.error("[digest] OWNER_ID missing");
    return {
      count: 0,
      result: { ok: false, error: "OWNER_ID is not configured" },
    };
  }

  const { db, pool } = createDb(env);
  try {
    const cutoff = endOfTodayUtc();
    const rows = await db
      .select({
        company: applications.company,
        roleTitle: applications.roleTitle,
        message: reminders.message,
        dueDate: reminders.dueDate,
        completed: reminders.completed,
      })
      .from(reminders)
      .innerJoin(applications, eq(reminders.applicationId, applications.id))
      .where(
        and(
          eq(reminders.ownerId, ownerId),
          eq(reminders.completed, false),
          lte(reminders.dueDate, cutoff),
        ),
      );

    const items: DigestReminderRow[] = rows
      .map((r) => ({
        company: r.company,
        roleTitle: r.roleTitle,
        message: r.message,
        dueDate: r.dueDate,
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const result = await sendReminderDigest(env, items);
    return { count: items.length, result };
  } finally {
    await pool.end();
  }
}
