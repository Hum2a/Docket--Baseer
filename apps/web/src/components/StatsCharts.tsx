import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "@docket/shared";
import { applicationStatuses } from "@docket/shared";

const COLORS = ["#64748b", "#2563eb", "#0f6e56", "#b45309", "#b42318"];

type Props = {
  stats: Stats;
};

export function StatsCharts({ stats }: Props) {
  const statusData = applicationStatuses.map((s) => ({
    name: s,
    value: stats.byStatus[s] ?? 0,
  }));

  const reminderData = [
    { name: "Overdue", count: stats.reminders.overdue },
    { name: "Due soon", count: stats.reminders.dueSoon },
    { name: "Completed", count: stats.reminders.completed },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">Status breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">Reminder health</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reminderData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">By industry</h3>
        <div className="h-64">
          {stats.byIndustry.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byIndustry} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#0f6e56" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">By source</h3>
        <div className="h-64">
          {stats.bySource.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bySource} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">Applications per week</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.perWeek}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#0f6e56" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold">Applications per month</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.perMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
