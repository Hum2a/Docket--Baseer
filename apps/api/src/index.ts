import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import applications from "./routes/applications";
import notes from "./routes/notes";
import reminders from "./routes/reminders";
import documents from "./routes/documents";
import stats from "./routes/stats";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = [c.env.APP_URL, "http://localhost:5173"];
      return allowed.includes(origin) ? origin : c.env.APP_URL;
    },
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

app.onError((err, c) => {
  console.error(err);
  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    return c.json({ error: "Validation failed", details: err }, 400);
  }
  return c.json({ error: err.message ?? "Internal error" }, 500);
});

export default app;
