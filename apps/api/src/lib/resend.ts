import type { Env } from "../env";
import type { Application } from "@docket/shared";
import { DEFAULT_NOTIFICATION_EMAIL } from "./notification-recipients";

export type DigestReminderRow = {
  company: string;
  roleTitle: string;
  message: string;
  dueDate: Date;
};

type SendResult =
  | { ok: true; id?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

async function sendResendEmail(
  env: Env,
  payload: { to: string[]; subject: string; html: string; text: string },
  logTag: string,
): Promise<SendResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[${logTag}] RESEND_API_KEY not set — skipping email send`);
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  const to =
    payload.to.length > 0
      ? payload.to
      : [env.REMINDER_EMAIL_TO?.trim() || DEFAULT_NOTIFICATION_EMAIL];
  const from = env.REMINDER_EMAIL_FROM ?? "Docket <reminders@baseer.co.uk>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[${logTag}] Resend error`, res.status, body);
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }

  const data = (await res.json()) as { id?: string };
  console.log(`[${logTag}] sent`, data.id, "to", to.join(", "));
  return { ok: true, id: data.id };
}

/** Notify when Claude (or anyone) logs a new application. */
export async function sendApplicationCreatedEmail(
  env: Env,
  app: Application,
  recipients: string[],
): Promise<SendResult> {
  const detailUrl = `${env.APP_URL.replace(/\/$/, "")}/applications/${app.id}`;
  const headline = `You've been applied for ${app.roleTitle}`;
  const subject = `Docket: ${headline} at ${app.company}`;

  const fields: { label: string; value: string }[] = [
    { label: "Company", value: app.company },
    { label: "Role", value: app.roleTitle },
    { label: "Industry", value: app.industry },
    { label: "Status", value: app.status },
    { label: "Salary", value: app.salaryRange ?? "—" },
    { label: "Location", value: app.location ?? "—" },
    { label: "Source", value: app.source ?? "—" },
    {
      label: "Applied date",
      value: app.appliedDate ? formatDate(new Date(app.appliedDate)) : "—",
    },
    { label: "Job URL", value: app.jobUrl?.trim() ? app.jobUrl : "—" },
    { label: "Logged", value: formatDateTime(new Date(app.createdAt)) },
  ];

  const text = [
    headline,
    `at ${app.company}`,
    "",
    "Job details",
    ...fields.map((f) => `${f.label}: ${f.value}`),
    "",
    `Open in Docket: ${detailUrl}`,
  ].join("\n");

  const rowsHtml = fields
    .map(
      (f) => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#5a6578;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(f.label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#1a2332;font-size:14px;vertical-align:top;">${
        f.label === "Job URL" && app.jobUrl?.trim()
          ? `<a href="${escapeHtml(app.jobUrl)}" style="color:#0f6e56;">${escapeHtml(app.jobUrl)}</a>`
          : escapeHtml(f.value)
      }</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1a2332;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f6e56;font-weight:600;margin-bottom:12px;">Docket</div>
    <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:700;">${escapeHtml(headline)}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#5a6578;">at <strong style="color:#1a2332;">${escapeHtml(app.company)}</strong></p>
    <div style="background:#ffffff;border:1px solid #d5dde8;border-radius:12px;overflow:hidden;">
      <div style="padding:14px 16px;background:#e8f5ef;border-bottom:1px solid #d5dde8;font-size:13px;font-weight:600;color:#0f6e56;">
        Job details
      </div>
      <table style="border-collapse:collapse;width:100%;">${rowsHtml}</table>
    </div>
    <p style="margin:28px 0 0;">
      <a href="${escapeHtml(detailUrl)}"
         style="display:inline-block;background:#0f6e56;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;">
        Open application in Docket
      </a>
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#5a6578;line-height:1.5;">
      This notification was sent because a new application was logged in Docket
      (including updates made via Claude Code or import).
    </p>
  </div>
</body>
</html>`;

  return sendResendEmail(
    env,
    { to: recipients, subject, html, text },
    "application-email",
  );
}

export async function sendReminderDigest(
  env: Env,
  items: DigestReminderRow[],
  recipients: string[],
): Promise<SendResult> {
  if (items.length === 0) {
    console.log("[digest] no due/overdue reminders — skipping email");
    return { ok: false, skipped: true, reason: "no reminders due" };
  }

  const subject = `Docket: ${items.length} reminder${items.length === 1 ? "" : "s"} due`;
  const text = [
    `You have ${items.length} incomplete reminder(s) due today or overdue:`,
    "",
    ...items.map(
      (r) =>
        `- ${r.company} — ${r.roleTitle}\n  Due: ${formatDate(r.dueDate)}\n  ${r.message}`,
    ),
    "",
    `Open Docket: ${env.APP_URL}`,
  ].join("\n");

  const rowsHtml = items
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.company)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.roleTitle)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatDate(r.dueDate))}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(r.message)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.45;">
  <h1 style="font-size:20px;">Docket reminders</h1>
  <p>${items.length} incomplete reminder(s) due today or overdue.</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px;">
    <thead>
      <tr style="text-align:left;color:#555;">
        <th style="padding:8px;">Company</th>
        <th style="padding:8px;">Role</th>
        <th style="padding:8px;">Due</th>
        <th style="padding:8px;">Message</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="margin-top:24px;"><a href="${escapeHtml(env.APP_URL)}">Open Docket</a></p>
</body></html>`;

  return sendResendEmail(env, { to: recipients, subject, html, text }, "digest");
}

/** Settings “Send test email” — same Recipients list as live alerts. */
export async function sendTestNotificationEmail(
  env: Env,
  recipients: string[],
): Promise<SendResult> {
  const now = new Date();
  const subject = "Docket: test notification";
  const text = [
    "This is a Docket test email.",
    "",
    `Sent at: ${formatDateTime(now)}`,
    `Recipients: ${recipients.join(", ")}`,
    "",
    `Open Docket: ${env.APP_URL}`,
    "",
    "If you received this, Resend + your notification list are working.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f6f9;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1a2332;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#0f6e56;font-weight:600;margin-bottom:12px;">Docket</div>
    <h1 style="margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:700;">Test notification</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#5a6578;">
      If you received this, Resend and your notification list are working.
    </p>
    <div style="background:#ffffff;border:1px solid #d5dde8;border-radius:12px;overflow:hidden;">
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#5a6578;width:140px;">Sent at</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(formatDateTime(now))}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#5a6578;vertical-align:top;">Recipients</td>
          <td style="padding:10px 12px;">${escapeHtml(recipients.join(", "))}</td>
        </tr>
      </table>
    </div>
    <p style="margin:28px 0 0;">
      <a href="${escapeHtml(env.APP_URL)}"
         style="display:inline-block;background:#0f6e56;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-size:14px;font-weight:600;">
        Open Docket
      </a>
    </p>
  </div>
</body>
</html>`;

  return sendResendEmail(env, { to: recipients, subject, html, text }, "test-email");
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
