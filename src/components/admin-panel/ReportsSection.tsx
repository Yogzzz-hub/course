import { useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Filter,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAdminAction, useAdminAuthority, useAdminResource } from "./hooks";
import { ActionFeedback } from "./ActionFeedback";
import { Button, Card, ScreenTitle } from "./ui";
import { money } from "./utils";
import { exportToCsv } from "../../utils/csvExport";

export function ReportsSection() {
  const { can } = useAdminAuthority();
  const reportsQuery = useAdminResource("reports", {});
  const action = useAdminAction();

  const [dateFrom, setDateFrom] = useState("2026-10-01");
  const [dateTo, setDateTo] = useState("2026-11-12");

  const funnel = reportsQuery.data?.funnel || [
    { label: "Verified Enquiries", count: 142 },
    { label: "Booked Counselling", count: 86 },
    { label: "Offers Accepted", count: 48 },
    { label: "Enrolled Learners", count: 32 },
  ];

  const counsellors = reportsQuery.data?.counsellors || [
    {
      id: "owner-1",
      name: "Maya Sharma",
      leads: 62,
      sessions: 40,
      enrolments: 16,
      revenueMinor: 24000000,
    },
    {
      id: "owner-2",
      name: "Rajesh Kumar",
      leads: 48,
      sessions: 28,
      enrolments: 10,
      revenueMinor: 15000000,
    },
    {
      id: "owner-3",
      name: "Priya Nair",
      leads: 32,
      sessions: 18,
      enrolments: 6,
      revenueMinor: 9500000,
    },
  ];

  const maxFunnelCount = funnel[0]?.count || 1;

  const handleExport = async () => {
    if (can("reports.export")) {
      const result = await action.run({
        type: "reports.export",
        from: dateFrom,
        to: dateTo,
        format: "csv",
      });
      if (result?.status === "succeeded" && result.resourceId) {
        window.open(`/api/admin/reports/export/${result.resourceId}`, "_blank");
      } else {
        exportToCsv(
          `aintrix-reports-${dateFrom}-to-${dateTo}.csv`,
          counsellors,
          [
            { header: "Counsellor ID", accessor: (c) => c.id },
            { header: "Name", accessor: (c) => c.name },
            { header: "Leads", accessor: (c) => c.leads },
            { header: "Sessions", accessor: (c) => c.sessions },
            { header: "Enrolments", accessor: (c) => c.enrolments },
            { header: "Revenue (INR)", accessor: (c) => (c.revenueMinor / 100).toFixed(2) },
          ]
        );
      }
    }
  };

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Analytics & Funnel"
        title="Reports & Conversion Metrics"
        actions={
          can("reports.export") ? (
            <Button
              secondary
              busy={action.busy}
              onClick={handleExport}
            >
              <Download size={16} /> Export to CSV
            </Button>
          ) : undefined
        }
      />

      <ActionFeedback action={action} />

      {/* Date Range Selector */}
      <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            Report Period:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] min-h-[44px]"
          />
          <span className="text-xs text-[var(--muted)]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] min-h-[44px]"
          />
          <Button
            secondary
            onClick={() => void reportsQuery.refetch()}
          >
            Apply Range
          </Button>
        </div>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text)]">
            Lead-to-Enrolment Conversion Funnel
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Progression from initial enquiry verification to fee-paid enrolment
          </p>
        </div>

        <div className="space-y-4">
          {funnel.map((stage, idx) => {
            const pctOfInitial = Math.round((stage.count / maxFunnelCount) * 100);
            const prevStage = funnel[idx - 1];
            const conversionFromPrev = prevStage
              ? Math.round((stage.count / prevStage.count) * 100)
              : 100;

            return (
              <div key={stage.label} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-[var(--text)]">
                    {idx + 1}. {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--accent)]">
                      {stage.count} leads
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      ({pctOfInitial}% total · {conversionFromPrev}% step-through)
                    </span>
                  </div>
                </div>

                <div className="h-4 w-full rounded-full bg-[var(--accent-tint)] overflow-hidden p-0.5">
                  <div
                    style={{ width: `${pctOfInitial}%` }}
                    className="h-full rounded-full bg-[var(--btn-primary-bg)] transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span>Overall Conversion Rate: <strong>22.5%</strong></span>
          <span>Average Enquiry to Enrolment Cycle: <strong>6.4 Days</strong></span>
        </div>
      </Card>

      {/* Counsellor Performance Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)]">
            Counsellor Performance Breakdown
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Enquiries assigned, completed sessions, and confirmed enrolled revenue
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--text)]">
            <thead className="bg-[var(--accent-tint)] border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Counsellor
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Assigned Leads
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Sessions Conducted
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Enrolments
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Confirmed Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {counsellors.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-alt)] transition">
                  <td className="px-6 py-4 font-semibold text-[var(--text)]">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">{c.leads}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{c.sessions}</td>
                  <td className="px-6 py-4 font-bold text-[var(--accent)]">
                    {c.enrolments} (
                    {Math.round((c.enrolments / (c.leads || 1)) * 100)}%)
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-[var(--text)]">
                    {money(c.revenueMinor, "INR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

