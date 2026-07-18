import type { Env } from "../env";

export type DigestReminderRow = {
  company: string;
  roleTitle: string;
  message: string;
  dueDate: Date;
};

export async function sendReminderDigest(
  env: Env,
  items: DigestReminderRow[],
): Promise<{ ok: true; id?: string } | { ok: false; skipped: true; reason: string } | { ok: false; error: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[digest] RESEND_API_KEY not set — skipping email send");
    return { ok: false, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  const to = env.REMINDER_EMAIL_TO ?? "baseer@baseer.co.uk";
  const from = env.REMINDER_EMAIL_FROM ?? "Docket <reminders@baseer.co.uk>";

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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[digest] Resend error", res.status, body);
    return { ok: false, error: `Resend ${res.status}: ${body}` };
  }

  const data = (await res.json()) as { id?: string };
  console.log("[digest] sent", data.id, "to", to);
  return { ok: true, id: data.id };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
