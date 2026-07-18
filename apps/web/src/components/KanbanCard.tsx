import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import type { Application, Reminder } from "@docket/shared";
import { isReminderDueSoon } from "@docket/shared";
import { cn } from "@/lib/utils";

type Props = {
  application: Application;
  reminders: Reminder[];
  onDelete?: (id: string) => Promise<void>;
};

export function KanbanCard({ application, reminders, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id });

  const dueSoon = reminders.some(
    (r) =>
      r.applicationId === application.id &&
      isReminderDueSoon(r.dueDate, r.completed),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-sm",
        isDragging && "opacity-70 ring-2 ring-[var(--color-accent)]",
      )}
      {...attributes}
      {...listeners}
    >
      <Link
        to="/applications/$id"
        params={{ id: application.id }}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold leading-tight">{application.company}</p>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              {application.roleTitle}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              {application.industry}
              {application.salaryRange ? ` · ${application.salaryRange}` : ""}
            </p>
          </div>
          {dueSoon ? (
            <span className="shrink-0 rounded bg-[var(--color-warn-soft)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-warn)]">
              Due
            </span>
          ) : null}
        </div>
        {application.appliedDate ? (
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Applied{" "}
            {new Date(application.appliedDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        ) : null}
      </Link>
      {onDelete ? (
        <button
          type="button"
          className="mt-2 text-xs text-[var(--color-danger)] hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!confirm(`Delete ${application.company}?`)) return;
            void onDelete(application.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
