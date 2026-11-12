import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Plus,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { LEDGER_ACCOUNT_META } from "../../../backend/services/financier/ledger";
import { DataTable, MetricCard, type SharedTableColumn } from "../shared";
import type { FinancierSummaryResponse } from "./api";
import { formatMoney, statusBadgeClass } from "./formatters";

export interface DashboardViewProps {
  summary: FinancierSummaryResponse;
  onOpenPaymentDrawer: (triggerEl: HTMLElement | null) => void;
}

export function DashboardView({ summary, onOpenPaymentDrawer }: DashboardViewProps) {
  const navigate = useNavigate();
  const quickPayBtnRef = useRef<HTMLButtonElement | null>(null);
  const { dashboard, accountBalances, students } = summary;

  const prioritizedStudents = [...students]
    .filter((s) => s.outstandingPaise > 0)
    .sort((a, b) => b.outstandingPaise - a.outstandingPaise);

  const batchColumns: SharedTableColumn<
    FinancierSummaryResponse["dashboard"]["revenueVsPayrollByBatch"][number]
  >[] = [
    {
      id: "batch",
      label: "Batch & Track",
      sortValue: (r) => r.batchCode,
      searchValue: (r) => `${r.batchCode} ${r.trackTitle}`,
      render: (r) => (
        <div>
          <strong>{r.batchCode}</strong>
          <div className="fin-sub-text">{r.trackTitle}</div>
        </div>
      ),
    },
    {
      id: "billed",
      label: "Billed Fees",
      numeric: true,
      sortValue: (r) => r.billedPaise,
      render: (r) => formatMoney(r.billedPaise),
    },
    {
      id: "collected",
      label: "Collected",
      numeric: true,
      sortValue: (r) => r.collectedPaise,
      render: (r) => formatMoney(r.collectedPaise),
    },
    {
      id: "payroll",
      label: "Payroll Cost",
      numeric: true,
      sortValue: (r) => r.payrollCostPaise,
      render: (r) => formatMoney(r.payrollCostPaise),
    },
    {
      id: "margin",
      label: "Net Contribution",
      numeric: true,
      sortValue: (r) => r.marginPaise,
      render: (r) => (
        <span className={statusBadgeClass(r.marginPaise >= 0 ? "CONFIRMED" : "OVERDUE")}>
          {formatMoney(r.marginPaise)}
        </span>
      ),
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Finance Operations Overview</h1>
          <p>
            Real-time receivables, daily collections, payroll cycle commitments, and balanced
            general ledger position.
          </p>
        </div>
        <div className="fin-page-header-actions">
          <Link to="/financier/collections" className="fin-btn fin-btn-secondary">
            Ageing & Reminders
          </Link>
          <button
            ref={quickPayBtnRef}
            type="button"
            className="fin-btn fin-btn-primary"
            onClick={() => onOpenPaymentDrawer(quickPayBtnRef.current)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 8 KPI Metrics (4 columns desktop, 2 columns <=1024px & <768px) */}
      <section aria-label="Key financial metrics" className="fin-metrics-grid">
        <MetricCard
          label="Collected Today"
          value={formatMoney(dashboard.collectedTodayPaise)}
          hint="Verified daily inflow"
          hintTone="positive"
          highlight
          icon={<Banknote size={16} />}
        />
        <MetricCard
          label="Collected This Week"
          value={formatMoney(dashboard.collectedWeekPaise)}
          hint="Rolling 7-day settlements"
          hintTone="positive"
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          label="Collected This Month"
          value={formatMoney(dashboard.collectedMonthPaise)}
          hint="Month-to-date cash & bank"
          icon={<Wallet size={16} />}
        />
        <MetricCard
          label="Outstanding Dues"
          value={formatMoney(dashboard.outstandingDuesPaise)}
          hint="Reconciles to Student Receivables GL"
          hintTone={dashboard.outstandingDuesPaise > 0 ? "warning" : "positive"}
          highlight
          icon={<CalendarClock size={16} />}
        />
        <MetricCard
          label="Overdue Invoices"
          value={String(dashboard.overdueInvoiceCount)}
          hint={
            dashboard.overdueInvoiceCount > 0
              ? "Action required in Collections"
              : "All invoices current"
          }
          hintTone={dashboard.overdueInvoiceCount > 0 ? "danger" : "positive"}
          icon={<AlertTriangle size={16} />}
        />
        <MetricCard
          label="Payroll Due This Cycle"
          value={formatMoney(dashboard.payrollDueThisCyclePaise)}
          hint="Unsettled open payroll runs"
          hintTone="warning"
          icon={<CalendarClock size={16} />}
        />
        <MetricCard
          label="Total Billed Tuition"
          value={formatMoney(dashboard.totalRevenueBilledPaise)}
          hint={`Payroll cumulative ${formatMoney(dashboard.totalPayrollCostPaise)}`}
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          label="Trial Balance Integrity"
          value={dashboard.trialBalanceOk ? "Balanced (100%)" : "Mismatch Detected"}
          hint={`Dr ${formatMoney(dashboard.trialBalanceDebitsPaise)} = Cr ${formatMoney(
            dashboard.trialBalanceCreditsPaise
          )}`}
          hintTone={dashboard.trialBalanceOk ? "positive" : "danger"}
          icon={<Scale size={16} />}
        />
      </section>

      {/* Split Grid: Left = Revenue vs Payroll Cost, Right = Accounts & Priority Student Dues */}
      <div className="fin-split-grid">
        <section className="fin-card" aria-labelledby="dash-rev-payroll-heading">
          <div className="fin-card-header">
            <div>
              <h2 id="dash-rev-payroll-heading">Revenue vs Payroll Cost by Batch</h2>
              <p>Collected tuition compared against locked trainer instructional costs</p>
            </div>
            <Link to="/financier/reports" className="fin-link">
              Full Reports
            </Link>
          </div>

          <div className="fin-bar-list">
            {dashboard.revenueVsPayrollByBatch.map((batch) => {
              const base = Math.max(batch.billedPaise, batch.payrollCostPaise, 1);
              const collectedPct = Math.round((batch.collectedPaise / base) * 100);
              const payrollPct = Math.round((batch.payrollCostPaise / base) * 100);
              return (
                <div key={batch.batchId} className="fin-bar-item">
                  <div className="fin-row-between">
                    <span>
                      <strong>{batch.batchCode}</strong>{" "}
                      <span className="fin-sub-text">({batch.trackCode})</span>
                    </span>
                    <span className="fin-sub-text">
                      Collected {formatMoney(batch.collectedPaise)} · Payroll{" "}
                      {formatMoney(batch.payrollCostPaise)}
                    </span>
                  </div>
                  <div
                    className="fin-bar-track"
                    role="img"
                    aria-label={`${batch.batchCode}: collected ${collectedPct}% of scale, payroll ${payrollPct}%`}
                  >
                    <div
                      className="fin-bar-fill-success"
                      style={{ width: `${Math.min(100, collectedPct)}%` }}
                    />
                    <div
                      className="fin-bar-fill-primary"
                      style={{ width: `${Math.min(100 - Math.min(100, collectedPct), payrollPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DataTable
            rows={dashboard.revenueVsPayrollByBatch}
            columns={batchColumns}
            getRowId={(r) => r.batchId}
            label="Batch revenue and payroll summary"
            pageSize={5}
            toolbarExtra={
              <Link to="/financier/payroll" className="fin-btn fin-btn-secondary fin-btn-sm">
                Manage Payroll Runs
              </Link>
            }
          />
        </section>

        <div className="fin-stack-md">
          <section className="fin-card fin-card--gold-accent" aria-labelledby="dash-gl-heading">
            <div className="fin-card-header">
              <div>
                <h2 id="dash-gl-heading">General Ledger Accounts</h2>
                <p>Click any account for full journal statement</p>
              </div>
              <span className="fin-badge fin-badge-success">
                <CheckCircle2 size={13} aria-hidden="true" />
                Zero Unbalanced
              </span>
            </div>

            <div className="fin-kv-grid">
              {accountBalances.map((acct) => (
                <Link
                  key={acct.accountCode}
                  to={`/financier/ledger/${acct.accountCode}`}
                  className="fin-kv-box"
                >
                  <span className="fin-kv-label">{LEDGER_ACCOUNT_META[acct.accountCode].name}</span>
                  <span className="fin-kv-value">{formatMoney(acct.netBalancePaise)}</span>
                  <span className="fin-sub-text">
                    {acct.accountCode} · {acct.accountType}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="fin-card" aria-labelledby="dash-priority-dues">
            <div className="fin-card-header">
              <div>
                <h2 id="dash-priority-dues">Students With Pending Balances</h2>
                <p>Open any account for full instalment & ledger statement</p>
              </div>
              <Link to="/financier/fees" className="fin-link">
                All Students
              </Link>
            </div>

            {prioritizedStudents.length === 0 ? (
              <div className="fin-empty-state">All student fee balances are settled.</div>
            ) : (
              <div className="fin-stack-sm">
                {prioritizedStudents.map((stu) => (
                  <button
                    key={stu.id}
                    type="button"
                    className="fin-kv-box fin-table-row-clickable"
                    style={{ textAlign: "left", width: "100%" }}
                    onClick={() => navigate(`/financier/students/${stu.id}`)}
                  >
                    <div className="fin-row-between">
                      <strong>{stu.name}</strong>
                      <span className="fin-badge fin-badge-danger">
                        {formatMoney(stu.outstandingPaise)} due
                      </span>
                    </div>
                    <span className="fin-sub-text">
                      {stu.registrationNumber} · {stu.batchCode} ·{" "}
                      {stu.overdueInstallmentsCount} overdue instalment(s)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
