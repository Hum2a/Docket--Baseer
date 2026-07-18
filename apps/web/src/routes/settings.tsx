import { DocumentUploader } from "@/components/DocumentUploader";
import { useDocuments } from "@/hooks/useDocuments";

export function SettingsPage() {
  const documents = useDocuments(null);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl">Settings</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          General document templates (no login — single-owner instance).
        </p>
      </div>
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
