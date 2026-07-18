import { useState } from "react";
import type { ApplicationStatus } from "@docket/shared";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplications } from "@/hooks/useApplications";
import { useReminders } from "@/hooks/useReminders";

export function BoardPage() {
  const { applications, loading, error, create, update } = useApplications();
  const { reminders } = useReminders();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  const onStatusChange = async (id: string, status: ApplicationStatus) => {
    await update(id, { status });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({ company, roleTitle, status: "wishlist" });
    setCompany("");
    setRoleTitle("");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Kanban</h2>
        <Button onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Add application"}
        </Button>
      </div>
      {open ? (
        <form
          onSubmit={(e) => void onCreate(e)}
          className="grid gap-2 rounded-xl border border-[var(--color-line)] bg-white p-4 sm:grid-cols-3"
        >
          <Input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          <Input
            placeholder="Role title"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            required
          />
          <Button type="submit">Create</Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading board…</p>
      ) : (
        <KanbanBoard
          applications={applications}
          reminders={reminders}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
}
