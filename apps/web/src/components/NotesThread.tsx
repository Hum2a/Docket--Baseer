import { useState } from "react";
import type { Note } from "@docket/shared";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type Props = {
  notes: Note[];
  loading?: boolean;
  onAdd: (body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function NotesThread({ notes, loading, onAdd, onDelete }: Props) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await onAdd(body.trim());
      setBody("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl">Notes</h2>
      <form onSubmit={(e) => void submit(e)} className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" disabled={saving || !body.trim()}>
          {saving ? "Saving…" : "Add note"}
        </Button>
      </form>
      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-[var(--color-line)] bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <time className="text-xs text-[var(--color-ink-muted)]">
                  {new Date(note.createdAt).toLocaleString()}
                </time>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onDelete(note.id)}
                >
                  Delete
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
