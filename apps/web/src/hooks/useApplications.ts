import { useCallback, useEffect, useState } from "react";
import type { Application, CreateApplicationInput, UpdateApplicationInput } from "@docket/shared";
import { api } from "@/lib/api-client";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.applications.list();
      setApplications(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (input: CreateApplicationInput) => {
    const res = await api.applications.create(input);
    setApplications((prev) => [res.data, ...prev]);
    return res.data;
  };

  const update = async (id: string, input: UpdateApplicationInput) => {
    const previous = applications;
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...input, updatedAt: new Date().toISOString() } as Application : a)),
    );
    try {
      const res = await api.applications.update(id, input);
      setApplications((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      return res.data;
    } catch (e) {
      setApplications(previous);
      throw e;
    }
  };

  const remove = async (id: string) => {
    await api.applications.remove(id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
  };

  return { applications, loading, error, refresh, create, update, remove };
}
