import type { applications, documents, notes, reminders } from "../db/schema";

type AppRow = typeof applications.$inferSelect;
type NoteRow = typeof notes.$inferSelect;
type ReminderRow = typeof reminders.$inferSelect;
type DocRow = typeof documents.$inferSelect;

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

export function serializeApplication(row: AppRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    company: row.company,
    roleTitle: row.roleTitle,
    location: row.location,
    jobUrl: row.jobUrl,
    status: row.status,
    appliedDate: iso(row.appliedDate),
    salaryRange: row.salaryRange,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeNote(row: NoteRow) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    ownerId: row.ownerId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeReminder(row: ReminderRow) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    ownerId: row.ownerId,
    dueDate: row.dueDate.toISOString(),
    message: row.message,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeDocument(row: DocRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    applicationId: row.applicationId,
    type: row.type,
    filename: row.filename,
    r2Key: row.r2Key,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}
