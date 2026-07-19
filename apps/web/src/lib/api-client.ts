import type {
  Application,
  CreateApplicationInput,
  CreateDocumentInput,
  CreateNoteInput,
  CreateNotificationEmailInput,
  CreateReminderInput,
  Document,
  Note,
  NotificationEmail,
  Reminder,
  Stats,
  UpdateApplicationInput,
  UpdateReminderInput,
} from "@docket/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  applications: {
    list: () => request<{ data: Application[] }>("/api/applications"),
    get: (id: string) => request<{ data: Application }>(`/api/applications/${id}`),
    create: (body: CreateApplicationInput) =>
      request<{ data: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateApplicationInput) =>
      request<{ data: Application }>(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/api/applications/${id}`, { method: "DELETE" }),
  },
  notes: {
    list: (applicationId: string) =>
      request<{ data: Note[] }>(`/api/notes/application/${applicationId}`),
    create: (applicationId: string, body: CreateNoteInput) =>
      request<{ data: Note }>(`/api/notes/application/${applicationId}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/api/notes/${id}`, { method: "DELETE" }),
  },
  reminders: {
    listAll: () => request<{ data: Reminder[] }>("/api/reminders"),
    list: (applicationId: string) =>
      request<{ data: Reminder[] }>(`/api/reminders/application/${applicationId}`),
    create: (applicationId: string, body: CreateReminderInput) =>
      request<{ data: Reminder }>(`/api/reminders/application/${applicationId}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateReminderInput) =>
      request<{ data: Reminder }>(`/api/reminders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/api/reminders/${id}`, { method: "DELETE" }),
  },
  documents: {
    list: (applicationId?: string) =>
      request<{ data: Document[] }>(
        applicationId
          ? `/api/documents?applicationId=${encodeURIComponent(applicationId)}`
          : "/api/documents",
      ),
    presignUpload: (body: CreateDocumentInput) =>
      request<{
        data: { document: Document; uploadUrl: string; expiresIn: number };
      }>("/api/documents/presign-upload", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    download: (id: string) =>
      request<{
        data: { downloadUrl: string; expiresIn: number; document: Document };
      }>(`/api/documents/${id}/download`),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/api/documents/${id}`, { method: "DELETE" }),
  },
  stats: {
    get: () => request<{ data: Stats }>("/api/stats"),
  },
  notificationEmails: {
    list: () => request<{ data: NotificationEmail[] }>("/api/notification-emails"),
    create: (body: CreateNotificationEmailInput) =>
      request<{ data: NotificationEmail }>("/api/notification-emails", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      request<{ ok: boolean }>(`/api/notification-emails/${id}`, {
        method: "DELETE",
      }),
  },
};
