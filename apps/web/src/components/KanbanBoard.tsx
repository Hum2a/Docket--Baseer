import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import {
  KANBAN_COLUMNS,
  type Application,
  type ApplicationStatus,
  type Reminder,
} from "@docket/shared";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

type Props = {
  applications: Application[];
  reminders: Reminder[];
  onStatusChange: (id: string, status: ApplicationStatus) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

const colBg: Record<ApplicationStatus, string> = {
  wishlist: "bg-[var(--color-col-wishlist)]",
  applied: "bg-[var(--color-col-applied)]",
  interview: "bg-[var(--color-col-interview)]",
  offer: "bg-[var(--color-col-offer)]",
  rejected: "bg-[var(--color-col-rejected)]",
};

function Column({
  status,
  label,
  items,
  reminders,
  onDelete,
}: {
  status: ApplicationStatus;
  label: string;
  items: Application[];
  reminders: Reminder[];
  onDelete?: (id: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[260px] flex-1 flex-col rounded-xl p-3",
        colBg[status],
        isOver && "ring-2 ring-[var(--color-accent)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold tracking-wide">{label}</h3>
        <span className="text-xs text-[var(--color-ink-muted)]">{items.length}</span>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {items.map((app) => (
            <KanbanCard
              key={app.id}
              application={app}
              reminders={reminders}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ applications, reminders, onStatusChange, onDelete }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      KANBAN_COLUMNS.map((c) => [c.status, [] as Application[]]),
    ) as Record<ApplicationStatus, Application[]>;
    for (const app of applications) map[app.status].push(app);
    return map;
  }, [applications]);

  const active = applications.find((a) => a.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    let nextStatus = overId as ApplicationStatus;
    if (!KANBAN_COLUMNS.some((c) => c.status === nextStatus)) {
      const overApp = applications.find((a) => a.id === overId);
      if (!overApp) return;
      nextStatus = overApp.status;
    }

    const current = applications.find((a) => a.id === id);
    if (!current || current.status === nextStatus) return;
    await onStatusChange(id, nextStatus);
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-white/60 px-6 py-16 text-center">
        <p className="font-display text-2xl">No applications yet</p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Add a role to start tracking your pipeline.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={(e) => void onDragEnd(e)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            items={byStatus[col.status]}
            reminders={reminders}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <KanbanCard application={active} reminders={reminders} onDelete={onDelete} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
