import { asc, eq, sql } from "drizzle-orm";
import type { Env } from "../env";
import type { Database } from "../db/client";
import { notificationEmails } from "../db/schema";

export const DEFAULT_NOTIFICATION_EMAIL = "Djbas8@gmail.com";

export async function listNotificationEmails(db: Database, ownerId: string) {
  return db
    .select()
    .from(notificationEmails)
    .where(eq(notificationEmails.ownerId, ownerId))
    .orderBy(asc(notificationEmails.createdAt));
}

/** Ensure at least one recipient exists (default Gmail). */
export async function ensureDefaultNotificationEmail(
  db: Database,
  ownerId: string,
  fallbackEmail = DEFAULT_NOTIFICATION_EMAIL,
): Promise<void> {
  const existing = await listNotificationEmails(db, ownerId);
  if (existing.length > 0) return;

  const email = (fallbackEmail || DEFAULT_NOTIFICATION_EMAIL).trim().toLowerCase();
  await db.insert(notificationEmails).values({ ownerId, email });
}

/** Addresses used for application + digest emails. */
export async function resolveNotificationRecipients(
  db: Database,
  env: Env,
): Promise<string[]> {
  const ownerId = env.OWNER_ID;
  const fallback =
    env.REMINDER_EMAIL_TO?.trim() || DEFAULT_NOTIFICATION_EMAIL;

  await ensureDefaultNotificationEmail(db, ownerId, fallback);

  const rows = await listNotificationEmails(db, ownerId);
  const emails = [
    ...new Set(
      rows
        .map((r) => r.email.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    ),
  ];

  return emails.length > 0 ? emails : [fallback.toLowerCase()];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function emailAlreadyExists(
  db: Database,
  ownerId: string,
  email: string,
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const rows = await db
    .select({ id: notificationEmails.id })
    .from(notificationEmails)
    .where(
      sql`${notificationEmails.ownerId} = ${ownerId} AND lower(${notificationEmails.email}) = ${normalized}`,
    )
    .limit(1);
  return Boolean(rows[0]);
}
