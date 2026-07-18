import { useState } from "react";
import type { Reminder } from "@docket/shared";
import { isReminderDueSoon } from "@docket/shared";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

type Props = {
  reminders: Reminder[];
  loading?: boolean;
  onAdd: (input: { dueDate: string; message: string }) => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function RemindersList({
  reminders,
  loading,
  onAdd,
  onToggle,
  onDelete,
}: Props) {
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || !message.trim()) return;
    setSaving(true);
    try {
      await onAdd({ dueDate: new Date(dueDate).toISOString(), message: message.trim() });
      setDueDate("");
      setMessage("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl">Reminders</h2>
      <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        <Input
          placeholder="Reminder message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <Button type="submit" disabled={saving}>
          Add
        </Button>
      </form>
      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading reminders…</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No reminders.</p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => {
            const due = isReminderDueSoon(r.dueDate, r.completed);
            return (
              <li
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2",
                  due && "border-[var(--color-warn)] bg-[var(--color-warn-soft)]/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={r.completed}
                  onChange={(e) => void onToggle(r.id, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", r.completed && "line-through opacity-60")}>
                    {r.message}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    Due {new Date(r.dueDate).toLocaleDateString()}
                    {due ? " · due soon" : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void onDelete(r.id)}>
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
