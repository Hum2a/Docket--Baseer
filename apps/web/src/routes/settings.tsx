import { AllRemindersPanel } from "@/components/AllRemindersPanel";
import { DocumentUploader } from "@/components/DocumentUploader";
import { NotificationEmailsPanel } from "@/components/NotificationEmailsPanel";
import { useApplications } from "@/hooks/useApplications";
import { useDocuments } from "@/hooks/useDocuments";
import { useReminders } from "@/hooks/useReminders";

export function SettingsPage() {
  const documents = useDocuments(null);
  const { applications } = useApplications();
  const reminders = useReminders();

  return (
    <div className="space-y-10">
      <div className="enter-up">
        <h2 className="font-display text-2xl">Settings</h2>
        <p className="enter-fade delay-1 mt-1 text-sm text-[var(--color-ink-muted)]">
          Manage notification emails, reminders, and document templates.
        </p>
      </div>

      <NotificationEmailsPanel />

      <AllRemindersPanel
        reminders={reminders.reminders}
        applications={applications}
        loading={reminders.loading}
        onToggle={(id, completed) =>
          reminders.update(id, { completed }).then(() => undefined)
        }
        onDelete={(id) => reminders.remove(id)}
      />

      <DocumentUploader
        documents={documents.documents.filter((d) => !d.applicationId)}
        loading={documents.loading}
        onUpload={(type, file) =>
          documents
            .upload({ type, filename: file.name, applicationId: null }, file)
            .then(() => undefined)
        }
        onDownload={(id) => documents.download(id)}
        onDelete={(id) => documents.remove(id)}
      />
    </div>
  );
}
