import { useEffect, useState } from "react";
import {
  applicationStatuses,
  type Application,
  type Note,
  type UpdateApplicationInput,
} from "@docket/shared";
import { api } from "@/lib/api-client";
import { useReminders } from "@/hooks/useReminders";
import { useDocuments } from "@/hooks/useDocuments";
import { NotesThread } from "./NotesThread";
import { RemindersList } from "./RemindersList";
import { DocumentUploader } from "./DocumentUploader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  applicationId: string;
};

export function ApplicationDetail({ applicationId }: Props) {
  const [app, setApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const reminders = useReminders(applicationId);
  const documents = useDocuments(applicationId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, n] = await Promise.all([
          api.applications.get(applicationId),
          api.notes.list(applicationId),
        ]);
        if (!cancelled) {
          setApp(a.data);
          setNotes(n.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const save = async (patch: UpdateApplicationInput) => {
    if (!app) return;
    setSaving(true);
    try {
      const res = await api.applications.update(app.id, patch);
      setApp(res.data);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading application…</p>;
  }
  if (!app) {
    return <p className="text-sm text-[var(--color-danger)]">Application not found.</p>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
          Application
        </p>
        <h1 className="font-display text-3xl md:text-4xl">{app.company}</h1>
        <p className="text-lg text-[var(--color-ink-muted)]">{app.roleTitle}</p>
      </header>

      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void save({
            company: String(fd.get("company") ?? ""),
            roleTitle: String(fd.get("roleTitle") ?? ""),
            location: String(fd.get("location") ?? "") || null,
            jobUrl: String(fd.get("jobUrl") ?? "") || null,
            status: String(fd.get("status")) as Application["status"],
            appliedDate: String(fd.get("appliedDate") ?? "") || null,
            salaryRange: String(fd.get("salaryRange") ?? "") || null,
            source: String(fd.get("source") ?? "") || null,
          });
        }}
      >
        <label className="space-y-1 text-sm">
          <span>Company</span>
          <Input name="company" defaultValue={app.company} required />
        </label>
        <label className="space-y-1 text-sm">
          <span>Role</span>
          <Input name="roleTitle" defaultValue={app.roleTitle} required />
        </label>
        <label className="space-y-1 text-sm">
          <span>Location</span>
          <Input name="location" defaultValue={app.location ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Job URL</span>
          <Input name="jobUrl" defaultValue={app.jobUrl ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Status</span>
          <select
            name="status"
            defaultValue={app.status}
            className="w-full rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
          >
            {applicationStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Applied date</span>
          <Input
            name="appliedDate"
            type="date"
            defaultValue={app.appliedDate ? app.appliedDate.slice(0, 10) : ""}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Salary range</span>
          <Input name="salaryRange" defaultValue={app.salaryRange ?? ""} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Source</span>
          <Input name="source" defaultValue={app.source ?? ""} />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <NotesThread
        notes={notes}
        onAdd={async (body) => {
          const res = await api.notes.create(applicationId, { body });
          setNotes((prev) => [res.data, ...prev]);
        }}
        onDelete={async (id) => {
          await api.notes.remove(id);
          setNotes((prev) => prev.filter((n) => n.id !== id));
        }}
      />

      <RemindersList
        reminders={reminders.reminders}
        loading={reminders.loading}
        onAdd={(input) => reminders.create(applicationId, input).then(() => undefined)}
        onToggle={(id, completed) => reminders.update(id, { completed }).then(() => undefined)}
        onDelete={(id) => reminders.remove(id)}
      />

      <DocumentUploader
        documents={documents.documents}
        loading={documents.loading}
        applicationId={applicationId}
        onUpload={(type, file) =>
          documents.upload({ type, filename: file.name, applicationId }, file).then(() => undefined)
        }
        onDownload={(id) => documents.download(id)}
        onDelete={(id) => documents.remove(id)}
      />
    </div>
  );
}
