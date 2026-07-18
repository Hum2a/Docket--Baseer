import { useCallback, useEffect, useState } from "react";
import type { CreateDocumentInput, Document } from "@docket/shared";
import { api } from "@/lib/api-client";

export function useDocuments(applicationId?: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.documents.list(applicationId ?? undefined);
      setDocuments(res.data);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = async (input: CreateDocumentInput, file: File) => {
    const res = await api.documents.presignUpload({
      ...input,
      contentType: file.type || "application/octet-stream",
    });
    const put = await fetch(res.data.uploadUrl, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!put.ok) throw new Error("Upload failed");
    setDocuments((prev) => [res.data.document, ...prev]);
    return res.data.document;
  };

  const download = async (id: string) => {
    const res = await api.documents.download(id);
    window.open(res.data.downloadUrl, "_blank", "noopener,noreferrer");
  };

  const remove = async (id: string) => {
    await api.documents.remove(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return { documents, loading, refresh, upload, download, remove };
}
