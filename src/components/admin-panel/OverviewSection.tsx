import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useAdminResource } from "./hooks";
import { Button, Card, KpiCard, ScreenTitle, StatusPill } from "./ui";
import { money } from "./utils";

export function OverviewSection({
  onNavigate,
}: {
  onNavigate: (section: string) => void;
}) {
  const leadsQuery = useAdminResource("leads", {});
  const offersQuery = useAdminResource("offers", {});
  const financeQuery = useAdminResource("finance", {});
  const reportsQuery = useAdminResource("reports", {});
  const auditQuery = useAdminResource("audit", {});

  const leads = leadsQuery.data?.leads || [];
  const pendingOffersCount =
    offersQuery.data?.offers.filter((o) => o.status === "pending").length || 0;
  const pendingProofsCount =
    financeQuery.data?.proofs.filter((p) => p.status === "pending_review").length || 0;
  const totalPendingApprovals = pendingOffersCount + pendingProofsCount;

  const capturedRevenue = reportsQuery.data?.revenue.capturedMinor || 48500000;
  const enrolledCount =
    reportsQuery.data?.funnel.find((f) => f.label.toLowerCase().includes("enrolled"))?.count || 32;

  // 7-day enrolment data points
  const chartDays = [
    { day: "Mon", count: 4, height: 45 },
    { day: "Tue", count: 6, height: 68 },
    { day: "Wed", count: 3, height: 35 },
    { day: "Thu", count: 5, height: 55 },
    { day: "Fri", count: 7, height: 78 },
    { day: "Sat", count: 8, height: 90 },
    { day: "Sun", count: 4, height: 45 },
  ];

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Operations Dashboard"
        title="Academy Overview"
      />

      {/* 4-column KPI cards on desktop, 2-column on tablet/mobile, 1-col on very small screens */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="New Leads Today"
          value="12"
          subtext="+3 vs yesterday"
          icon={UserPlus}
          trend={{ value: "+25%", positive: true }}
        />
        <KpiCard
          title="Enrolments MTD"
          value={enrolledCount}
          subtext="Target: 40 enrolments"
          icon={GraduationCap}
          trend={{ value: "80% of target", positive: true }}
        />
        <KpiCard
          title="Revenue MTD"
          value={money(capturedRevenue, "INR")}
          subtext="₹48.5L net collections"
          icon={CreditCard}
          trend={{ value: "+14.2% YoY", positive: true }}
        />
        <KpiCard
          title="Pending Approvals"
          value={totalPendingApprovals}
          subtext={`${pendingOffersCount} offers · ${pendingProofsCount} proofs`}
          icon={Clock}
          trend={{
            value: totalPendingApprovals > 0 ? "Requires review" : "Up to date",
            positive: totalPendingApprovals === 0,
          }}
        />
      </div>

      {/* 2:1 split on desktop (>900px), stacked 1 column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-day enrolment chart - 2 cols on lg */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className="text-lg font-bold text-[var(--text)]">7-Day Enrolment Trend</h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--btn-primary-bg)]" />
                Enrolments
              </span>
              <span className="text-xs font-semibold text-[#10754A] bg-[#E8F6ED] px-2 py-0.5 rounded-full">
                +18% this week
              </span>
            </div>
          </div>

          {/* SVG / CSS Bar Chart */}
          <div className="h-56 w-full pt-4 pb-2 flex items-end justify-between gap-2 sm:gap-6 border-b border-[var(--border)]">
            {chartDays.map((bar) => (
              <div
                key={bar.day}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
              >
                <span className="text-xs font-bold text-[var(--muted)] group-hover:text-[var(--accent)] transition">
                  {bar.count}
                </span>
                <div className="w-full max-w-[42px] bg-[var(--accent-tint)] rounded-t-lg overflow-hidden flex flex-col justify-end h-40">
                  <div
                    style={{ height: `${bar.height}%` }}
                    className="w-full bg-[var(--btn-primary-bg)] group-hover:bg-[var(--btn-primary-hover)] rounded-t-lg transition-all duration-300"
                  />
                </div>
                <span className="text-xs font-medium text-[var(--muted)]">
                  {bar.day}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[var(--muted)]">
            <span>Average: 5.3 enrolments/day</span>
            <span>Peak: Saturday (8 enrolments)</span>
          </div>
        </Card>

        {/* Attention Needed List - 1 col on lg */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
              <AlertTriangle size={18} className="text-[#9E6000]" />
              Attention Needed
            </h2>
            <span className="rounded-full bg-[#FEF6E7] px-2 py-0.5 text-xs font-bold text-[#9E6000]">
              4 items
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-[var(--border)] p-3 hover:border-[var(--border-strong)] transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text)]">Overdue Instalment</span>
                <StatusPill status="Overdue" variant="overdue" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Noah Singh · ₹30,000 overdue by 2 days (Python Full Stack)
              </p>
              <button
                type="button"
                onClick={() => onNavigate("payments")}
                className="mt-2 inline-flex items-center text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Reconcile payment <ArrowUpRight size={13} className="ml-0.5" />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3 hover:border-[var(--border-strong)] transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text)]">Bank Proof Review</span>
                <StatusPill status="Pending" variant="pending" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Asha Rao · ₹90,000 NEFT transfer reference needs validation
              </p>
              <button
                type="button"
                onClick={() => onNavigate("approvals")}
                className="mt-2 inline-flex items-center text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Review proof <ArrowUpRight size={13} className="ml-0.5" />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3 hover:border-[var(--border-strong)] transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text)]">Scholarship Discount</span>
                <StatusPill status="Pending" variant="pending" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Devanand K · 10% fee waiver requested by Rajesh Kumar
              </p>
              <button
                type="button"
                onClick={() => onNavigate("approvals")}
                className="mt-2 inline-flex items-center text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Approve or reject <ArrowUpRight size={13} className="ml-0.5" />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3 hover:border-[var(--border-strong)] transition">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--text)]">Lead SLA Overdue</span>
                <StatusPill status="SLA Alert" variant="overdue" />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Asha Rao · Follow-up scheduled 1 hour ago is overdue
              </p>
              <button
                type="button"
                onClick={() => onNavigate("leads")}
                className="mt-2 inline-flex items-center text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Open lead <ArrowUpRight size={13} className="ml-0.5" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--text)]">Recent Activity</h2>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {(auditQuery.data?.events || [
            {
              id: "ev-1",
              actor: "Alex Admin",
              action: "Discount offer reviewed",
              summary: "Asha Rao 10% scholarship discount verified.",
              at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "ev-2",
              actor: "Maya Sharma",
              action: "Lead stage updated",
              summary: "Asha Rao stage advanced to Scheduled Counselling.",
              at: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: "ev-3",
              actor: "Payment Gateway",
              action: "Payment captured",
              summary: "Rohan Varma instalment payment ₹40,000 received.",
              at: new Date(Date.now() - 86400000).toISOString(),
            },
          ]).map((event) => (
            <div
              key={event.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-tint)] text-[var(--accent)]">
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text)]">
                    {event.action}{" "}
                    <span className="font-normal text-xs text-[var(--muted)]">
                      by {event.actor}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {event.summary}
                  </div>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)] whitespace-nowrap pl-10 sm:pl-0">
                {new Date(event.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

