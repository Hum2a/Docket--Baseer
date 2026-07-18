import { ApplicationTable } from "@/components/ApplicationTable";
import { useApplications } from "@/hooks/useApplications";

export function ListPage() {
  const { applications, loading, error, remove } = useApplications();

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">List</h2>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : (
        <ApplicationTable applications={applications} onDelete={remove} />
      )}
    </div>
  );
}
