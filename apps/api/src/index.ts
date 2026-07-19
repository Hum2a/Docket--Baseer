import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import applications from "./routes/applications";
import notes from "./routes/notes";
import reminders from "./routes/reminders";
import documents from "./routes/documents";
import stats from "./routes/stats";
import notificationEmails from "./routes/notification-emails";
import { runReminderDigest } from "./lib/reminder-digest";

const app = new Hono<{ Bindings: Env }>();

function corsOrigin(origin: string | undefined, appUrl: string): string {
  const allowed = new Set([
    appUrl,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://docket.baseer.co.uk",
    "https://docket-staging.baseer.co.uk",
    // legacy names from earlier deploy config
    "https://jobtracker.baseer.co.uk",
    "https://jobtracker-staging.baseer.co.uk",
  ]);
  if (!origin) return appUrl;
  if (allowed.has(origin)) return origin;
  if (origin.endsWith(".pages.dev") || origin.endsWith(".workers.dev")) return origin;
  return appUrl;
}

app.use(
  "*",
  cors({
    origin: (origin, c) => corsOrigin(origin, c.env.APP_URL),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "docket-api" }));

app.route("/api/applications", applications);
app.route("/api/notes", notes);
app.route("/api/reminders", reminders);
app.route("/api/documents", documents);
app.route("/api/stats", stats);
app.route("/api/notification-emails", notificationEmails);

app.onError((err, c) => {
  console.error(err);
  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    return c.json({ error: "Validation failed", details: err }, 400);
  }
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runReminderDigest(env).then((r) => {
        console.log("[cron] reminder digest", r.count, r.result);
      }),
    );
  },
};
