import { useEffect, useState } from "react";
import type { Stats } from "@docket/shared";
import { applicationStatuses } from "@docket/shared";
import { StatsCharts } from "@/components/StatsCharts";
import { api } from "@/lib/api-client";

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats
      .get()
      .then((res) => setStats(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) return <p className="text-sm text-[var(--color-danger)]">{error}</p>;
  if (!stats) return <p className="text-sm text-[var(--color-ink-muted)]">Loading stats…</p>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Stats</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat tile="Total" value={String(stats.total)} />
        {applicationStatuses.map((s) => (
          <Stat key={s} tile={s} value={String(stats.byStatus[s] ?? 0)} />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold">Conversion funnel</h3>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Applied → Interview: {stats.funnel.appliedToInterviewPct}% · Interview →
          Offer: {stats.funnel.interviewToOfferPct}% · Applied → Offer:{" "}
          {stats.funnel.appliedToOfferPct}%
        </p>
      </div>
      <StatsCharts stats={stats} />
    </div>
  );
}

function Stat({ tile, value }: { tile: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">{tile}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}
