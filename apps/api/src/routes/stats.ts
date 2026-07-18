import { Hono } from "hono";
import { applicationStatuses, type ApplicationStatus } from "@docket/shared";
import type { Env } from "../env";
import type { AppVariables } from "../middleware/owner";
import { withOwner } from "../middleware/owner";
import { withOwnerRls } from "../db/client";
import { applications, reminders } from "../db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.use("*", withOwner);

app.get("/", async (c) => {
  const userId = c.get("userId");
  const db = c.get("db");
  const [rows, reminderRows] = await withOwnerRls(db, userId, async (tx) => {
    const apps = await tx
      .select()
      .from(applications)
      .where(eq(applications.ownerId, userId));
    const rems = await tx
      .select()
      .from(reminders)
      .where(eq(reminders.ownerId, userId));
    return [apps, rems] as const;
  });

  const byStatus = Object.fromEntries(
    applicationStatuses.map((s) => [s, 0]),
  ) as Record<ApplicationStatus, number>;

  for (const row of rows) {
    byStatus[row.status] += 1;
  }

  const industryMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();
  for (const row of rows) {
    const industry = row.industry?.trim() || "Unspecified";
    industryMap.set(industry, (industryMap.get(industry) ?? 0) + 1);
    const source = row.source?.trim() || "Unspecified";
    sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
  }

  const byIndustry = [...industryMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const bySource = [...sourceMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

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

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dueSoonEnd = new Date(startOfToday);
  dueSoonEnd.setUTCDate(dueSoonEnd.getUTCDate() + 3);
  dueSoonEnd.setUTCHours(23, 59, 59, 999);

  let overdue = 0;
  let dueSoon = 0;
  let completed = 0;
  let open = 0;
  for (const r of reminderRows) {
    if (r.completed) {
      completed += 1;
      continue;
    }
    open += 1;
    const due = r.dueDate.getTime();
    if (due < startOfToday.getTime()) overdue += 1;
    else if (due <= dueSoonEnd.getTime()) dueSoon += 1;
  }

  const openPipeline = byStatus.wishlist + byStatus.applied + byStatus.interview;
  const avgPerWeek =
    perWeek.length === 0
      ? 0
      : Math.round(
          (perWeek.reduce((sum, w) => sum + w.count, 0) / perWeek.length) * 10,
        ) / 10;

  return c.json({
    data: {
      total: rows.length,
      byStatus,
      byIndustry,
      bySource,
      funnel: {
        applied,
        interview,
        offer,
        appliedToInterviewPct: pct(interview, applied),
        interviewToOfferPct: pct(offer, interview),
        appliedToOfferPct: pct(offer, applied),
      },
      reminders: {
        overdue,
        dueSoon,
        completed,
        open,
      },
      openPipeline,
      avgPerWeek,
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
