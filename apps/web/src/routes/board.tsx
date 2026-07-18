import { useState } from "react";
import type { ApplicationStatus } from "@docket/shared";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplications } from "@/hooks/useApplications";
import { useReminders } from "@/hooks/useReminders";

export function BoardPage() {
  const { applications, loading, error, create, update, remove } = useApplications();
  const { reminders } = useReminders();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [salaryRange, setSalaryRange] = useState("");

  const onStatusChange = async (id: string, status: ApplicationStatus) => {
    await update(id, { status });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({
      company,
      roleTitle,
      industry,
      salaryRange: salaryRange || null,
      status: "wishlist",
    });
    setCompany("");
    setRoleTitle("");
    setIndustry("");
    setSalaryRange("");
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
          className="grid gap-2 rounded-xl border border-[var(--color-line)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          <Input
            placeholder="Position / role"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            required
          />
          <Input
            placeholder="Industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            required
          />
          <Input
            placeholder="Salary range (optional)"
            value={salaryRange}
            onChange={(e) => setSalaryRange(e.target.value)}
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
          onDelete={remove}
        />
      )}
    </div>
  );
}
