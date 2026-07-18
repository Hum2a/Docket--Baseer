import { Hono } from "hono";
import { applicationStatuses, type ApplicationStatus } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/session";
import { requireSession } from "../middleware/session";
import { withOwnerRls } from "../db/client";
import { applications } from "../db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", requireSession);

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const rows = await withOwnerRls(db, userId, (tx) =>
    tx.select().from(applications).where(eq(applications.ownerId, userId)),
  );

  const byStatus = Object.fromEntries(
    applicationStatuses.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;

  for (const row of rows) {
    byStatus[row.status] += 1;
  }

  const applied = byStatus.applied + byStatus.interview + byStatus.offer + byStatus.rejected;
  const interview = byStatus.interview + byStatus.offer;
  const offer = byStatus.offer;

  const pct = (num: number, den: number) =>
    den === 0 ? 0 : Math.round((num / den) * 1000) / 10;

  const perWeekMap = new Map<string, number>();
  const perMonthMap = new Map<string, number>();

  for (const row of rows) {
    const d = row.createdAt;
    const week = weekKey(d);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    perWeekMap.set(week, (perWeekMap.get(week) ?? 0) + 1);
    perMonthMap.set(month, (perMonthMap.get(month) ?? 0) + 1);
  }

  const perWeek = [...perWeekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
  const perMonth = [...perMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return c.json({
    data: {
      total: rows.length,
      byStatus,
      funnel: {
        applied,
        interview,
        offer,
        appliedToInterviewPct: pct(interview, applied),
        interviewToOfferPct: pct(offer, interview),
        appliedToOfferPct: pct(offer, applied),
      },
      perWeek,
      perMonth,
    },
  });
});

function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default app;
