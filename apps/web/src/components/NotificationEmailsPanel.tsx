import { useEffect, useState } from "react";
import type { NotificationEmail } from "@docket/shared";
import { api } from "@/lib/api-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function NotificationEmailsPanel() {
  const [emails, setEmails] = useState<NotificationEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.notificationEmails.list();
      setEmails(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = value.trim();
    if (!email) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.notificationEmails.create({ email });
      setEmails((prev) => [...prev, res.data]);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add email");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    setError(null);
    setSuccess(null);
    try {
      await api.notificationEmails.remove(id);
      setEmails((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove email");
    } finally {
      setRemovingId(null);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.notificationEmails.sendTest();
      setSuccess(`Test email sent to ${res.recipients.join(", ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="enter-up space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Notification emails</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Application alerts and daily reminder digests are sent to everyone on this
            list. At least one address is required.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={testing || loading || emails.length === 0}
          onClick={() => void sendTest()}
        >
          {testing ? "Sending…" : "Send test email"}
        </Button>
      </div>

      <form
        onSubmit={(e) => void add(e)}
        className="surface flex flex-col gap-2 p-4 sm:flex-row"
      >
        <Input
          type="email"
          placeholder="name@example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={saving || !value.trim()}>
          {saving ? "Adding…" : "Add email"}
        </Button>
      </form>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {success ? <p className="text-sm text-[var(--color-accent)]">{success}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading emails…</p>
      ) : emails.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-white/60 px-6 py-8 text-center text-sm text-[var(--color-ink-muted)]">
          No notification emails yet.
        </div>
      ) : (
        <ul className="stagger-fast space-y-2">
          {emails.map((row) => (
            <li
              key={row.id}
              className="surface flex items-center justify-between gap-3 px-3 py-2.5"
              data-interactive
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.email}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Added {new Date(row.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removingId === row.id || emails.length <= 1}
                onClick={() => void remove(row.id)}
                title={
                  emails.length <= 1
                    ? "Keep at least one notification email"
                    : "Remove"
                }
              >
                {removingId === row.id ? "…" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
