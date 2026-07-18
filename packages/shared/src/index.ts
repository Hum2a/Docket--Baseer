import { z } from "zod";

export const applicationStatuses = [
  "wishlist",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const documentTypes = ["resume", "cover_letter"] as const;
export type DocumentType = (typeof documentTypes)[number];

export const applicationStatusSchema = z.enum(applicationStatuses);
export const documentTypeSchema = z.enum(documentTypes);

export const applicationSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  company: z.string().min(1),
  roleTitle: z.string().min(1),
  location: z.string().nullable(),
  jobUrl: z.string().url().nullable().or(z.literal("")).nullable(),
  status: applicationStatusSchema,
  appliedDate: z.string().nullable(),
  salaryRange: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Application = z.infer<typeof applicationSchema>;

export const createApplicationSchema = z.object({
  company: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  location: z.string().max(200).optional().nullable(),
  jobUrl: z.string().url().optional().nullable().or(z.literal("")),
  status: applicationStatusSchema.default("wishlist"),
  appliedDate: z.string().optional().nullable(),
  salaryRange: z.string().max(100).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = createApplicationSchema.partial();
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const noteSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  ownerId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;

export const createNoteSchema = z.object({
  body: z.string().min(1).max(10_000),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const reminderSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  ownerId: z.string(),
  dueDate: z.string(),
  message: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
});

export type Reminder = z.infer<typeof reminderSchema>;

export const createReminderSchema = z.object({
  dueDate: z.string().min(1),
  message: z.string().min(1).max(500),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const updateReminderSchema = z.object({
  dueDate: z.string().optional(),
  message: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
});

export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  applicationId: z.string().uuid().nullable(),
  type: documentTypeSchema,
  filename: z.string(),
  r2Key: z.string(),
  uploadedAt: z.string(),
});

export type Document = z.infer<typeof documentSchema>;

export const createDocumentSchema = z.object({
  type: documentTypeSchema,
  filename: z.string().min(1).max(255),
  applicationId: z.string().uuid().optional().nullable(),
  contentType: z.string().min(1).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const statsSchema = z.object({
  total: z.number(),
  byStatus: z.record(applicationStatusSchema, z.number()),
  funnel: z.object({
    applied: z.number(),
    interview: z.number(),
    offer: z.number(),
    appliedToInterviewPct: z.number(),
    interviewToOfferPct: z.number(),
    appliedToOfferPct: z.number(),
  }),
  perWeek: z.array(z.object({ week: z.string(), count: z.number() })),
  perMonth: z.array(z.object({ month: z.string(), count: z.number() })),
});

export type Stats = z.infer<typeof statsSchema>;

export const KANBAN_COLUMNS: { status: ApplicationStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "applied", label: "Applied" },
  { status: "interview", label: "Interview" },
  { status: "offer", label: "Offer" },
  { status: "rejected", label: "Rejected" },
];

/** Incomplete reminder is overdue or due within the next 3 days. */
export function isReminderDueSoon(
  dueDate: string,
  completed: boolean,
  now = new Date(),
): boolean {
  if (completed) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 3);
  horizon.setHours(23, 59, 59, 999);
  return due.getTime() <= horizon.getTime();
}
