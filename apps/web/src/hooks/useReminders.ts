import { useCallback, useEffect, useState } from "react";
import type { CreateReminderInput, Reminder, UpdateReminderInput } from "@docket/shared";
import { api } from "@/lib/api-client";

export function useReminders(applicationId?: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = applicationId
        ? await api.reminders.list(applicationId)
        : await api.reminders.listAll();
      setReminders(res.data);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (appId: string, input: CreateReminderInput) => {
    const res = await api.reminders.create(appId, input);
    setReminders((prev) => [...prev, res.data].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    return res.data;
  };

  const update = async (id: string, input: UpdateReminderInput) => {
    const res = await api.reminders.update(id, input);
    setReminders((prev) => prev.map((r) => (r.id === id ? res.data : r)));
    return res.data;
  };

  const remove = async (id: string) => {
    await api.reminders.remove(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return { reminders, loading, refresh, create, update, remove };
}
