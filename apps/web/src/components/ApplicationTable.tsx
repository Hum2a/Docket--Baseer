import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from "@docket/shared";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

type Props = {
  applications: Application[];
};

type SortKey = "company" | "roleTitle" | "status" | "appliedDate" | "updatedAt";

export function ApplicationTable({ applications }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [company, setCompany] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let rows = [...applications];
    if (q.trim()) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.company.toLowerCase().includes(needle) ||
          r.roleTitle.toLowerCase().includes(needle),
      );
    }
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (company.trim()) {
      const c = company.toLowerCase();
      rows = rows.filter((r) => r.company.toLowerCase().includes(c));
    }
    if (from) {
      const t = new Date(from).getTime();
      rows = rows.filter((r) => (r.appliedDate ? new Date(r.appliedDate).getTime() >= t : false));
    }
    if (to) {
      const t = new Date(to).getTime() + 86400000;
      rows = rows.filter((r) => (r.appliedDate ? new Date(r.appliedDate).getTime() < t : false));
    }
    rows.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [applications, q, status, company, from, to, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-5">
        <Input
          placeholder="Search company or role"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="md:col-span-2"
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
        <Input
          placeholder="Company filter"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
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
                {(
                  [
                    ["company", "Company"],
                    ["roleTitle", "Role"],
                    ["status", "Status"],
                    ["appliedDate", "Applied"],
                    ["updatedAt", "Updated"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="px-3 py-2 font-medium">
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
                  <td className="px-3 py-2.5 capitalize">{row.status}</td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-muted)]">
                    {row.appliedDate
                      ? new Date(row.appliedDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-ink-muted)]">
                    {new Date(row.updatedAt).toLocaleDateString()}
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
