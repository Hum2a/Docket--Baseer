import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from "@docket/shared";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type Props = {
  applications: Application[];
  onDelete?: (id: string) => Promise<void>;
};

type SortKey =
  | "company"
  | "roleTitle"
  | "industry"
  | "status"
  | "salaryRange"
  | "location"
  | "source"
  | "appliedDate"
  | "updatedAt";

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "company", label: "Company" },
  { key: "roleTitle", label: "Position" },
  { key: "industry", label: "Industry" },
  { key: "status", label: "Status" },
  { key: "salaryRange", label: "Salary" },
  { key: "location", label: "Location" },
  { key: "source", label: "Source" },
  { key: "appliedDate", label: "Applied" },
  { key: "updatedAt", label: "Updated" },
];

export function ApplicationTable({ applications, onDelete }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [industry, setIndustry] = useState("all");
  const [position, setPosition] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleting, setDeleting] = useState<string | null>(null);

  const industries = useMemo(
    () =>
      [...new Set(applications.map((a) => a.industry).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [applications],
  );

  const positions = useMemo(
    () =>
      [...new Set(applications.map((a) => a.roleTitle).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [applications],
  );

  const filtered = useMemo(() => {
    let rows = [...applications];
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter((r) =>
        [r.company, r.roleTitle, r.industry, r.location, r.source, r.salaryRange]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (industry !== "all") rows = rows.filter((r) => r.industry === industry);
    if (position !== "all") rows = rows.filter((r) => r.roleTitle === position);
    if (from) {
      const t = new Date(from).getTime();
      rows = rows.filter((r) =>
        r.appliedDate ? new Date(r.appliedDate).getTime() >= t : false,
      );
    }
    if (to) {
      const t = new Date(to).getTime() + 86400000;
      rows = rows.filter((r) =>
        r.appliedDate ? new Date(r.appliedDate).getTime() < t : false,
      );
    }
    rows.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [applications, q, status, industry, position, from, to, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleDelete = async (id: string, company: string) => {
    if (!onDelete) return;
    if (!confirm(`Delete application at ${company}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await onDelete(id);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Input
          placeholder="Search company, position, industry…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2 lg:col-span-2"
        />
        <select
          className="rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus | "all")}
        >
          <option value="all">All statuses</option>
          {applicationStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="all">All industries</option>
          {industries.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          <option value="all">All positions</option>
          {positions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-line)] bg-white/60 px-6 py-12 text-center text-sm text-[var(--color-ink-muted)]">
          No applications match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-line)] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]">
              <tr>
                {SORT_COLUMNS.map(({ key, label }) => (
                  <th key={key} className="px-3 py-2 font-medium whitespace-nowrap">
                    <button
                      type="button"
                      className={cn(
                        "hover:text-[var(--color-ink)]",
                        sortKey === key && "text-[var(--color-ink)]",
                      )}
                      onClick={() => toggleSort(key)}
                    >
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      to="/applications/$id"
                      params={{ id: row.id }}
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      {row.company}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{row.roleTitle}</td>
                  <td className="px-3 py-2.5">{row.industry}</td>
                  <td className="px-3 py-2.5 capitalize">{row.status}</td>
                  <td className="px-3 py-2.5">{row.salaryRange ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.location ?? "—"}</td>
                  <td className="px-3 py-2.5">{row.source ?? "—"}</td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-muted)] whitespace-nowrap">
                    {row.appliedDate
                      ? new Date(row.appliedDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-muted)] whitespace-nowrap">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Link
                        to="/applications/$id"
                        params={{ id: row.id }}
                        className="text-sm text-[var(--color-accent)] hover:underline"
                      >
                        Edit
                      </Link>
                      {onDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deleting === row.id}
                          onClick={() => void handleDelete(row.id, row.company)}
                        >
                          {deleting === row.id ? "…" : "Delete"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
