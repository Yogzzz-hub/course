import { Download } from "lucide-react";
import { DataTable, MetricCard, useToast, type SharedTableColumn } from "../shared";
import { financierApi, type FinancierReportsResponse } from "./api";
import { formatMoney, statusBadgeClass } from "./formatters";

export interface ReportsViewProps {
  reports: FinancierReportsResponse;
}

export function ReportsView({ reports }: ReportsViewProps) {
  const { showToast } = useToast();

  const exportCsv = async (kind: "ageing" | "payroll-vs-revenue") => {
    try {
      await financierApi.downloadReportCsv(kind);
      showToast({
        title:
          kind === "ageing"
            ? "Ageing report CSV downloaded"
            : "Payroll-vs-Revenue report CSV downloaded",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Report download failed",
        description: err instanceof Error ? err.message : "Could not export report CSV.",
        tone: "danger",
      });
    }
  };

  const trackCols: SharedTableColumn<FinancierReportsResponse["revenueByTrack"][number]>[] = [
    {
      id: "track",
      label: "Programme Track",
      sortValue: (r) => r.trackTitle,
      searchValue: (r) => `${r.trackCode} ${r.trackTitle}`,
      render: (r) => (
        <div>
          <strong>{r.trackTitle}</strong>
          <div className="fin-sub-text">
            {r.trackCode} · {r.studentCount} students
          </div>
        </div>
      ),
    },
    {
      id: "billed",
      label: "Billed Revenue",
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
      id: "outstanding",
      label: "Outstanding",
      numeric: true,
      sortValue: (r) => r.outstandingPaise,
      render: (r) => formatMoney(r.outstandingPaise),
    },
    {
      id: "payroll",
      label: "Payroll Cost",
      numeric: true,
      sortValue: (r) => r.payrollCostPaise,
      render: (r) => formatMoney(r.payrollCostPaise),
    },
    {
      id: "contribution",
      label: "Net Contribution",
      numeric: true,
      sortValue: (r) => r.netContributionPaise,
      render: (r) => (
        <span className={statusBadgeClass(r.netContributionPaise >= 0 ? "CONFIRMED" : "OVERDUE")}>
          {formatMoney(r.netContributionPaise)}
        </span>
      ),
    },
  ];

  const batchCols: SharedTableColumn<FinancierReportsResponse["revenueByBatch"][number]>[] = [
    {
      id: "batch",
      label: "Cohort / Batch",
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
      id: "students",
      label: "Students",
      numeric: true,
      sortValue: (r) => r.studentCount,
      render: (r) => String(r.studentCount),
    },
    {
      id: "billed",
      label: "Billed",
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
      id: "surplus",
      label: "Net Surplus",
      numeric: true,
      sortValue: (r) => r.netContributionPaise,
      render: (r) => <strong>{formatMoney(r.netContributionPaise)}</strong>,
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Financial Analytics & Exports</h1>
          <p>
            Track-wise and cohort-wise revenue, payroll margin attribution, and CSV exports
            hardened against formula injection.
          </p>
        </div>
        <div className="fin-page-header-actions">
          <button
            type="button"
            className="fin-btn fin-btn-secondary"
            onClick={() => void exportCsv("ageing")}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export Ageing CSV</span>
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-primary"
            onClick={() => void exportCsv("payroll-vs-revenue")}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export Payroll-vs-Revenue CSV</span>
          </button>
        </div>
      </div>

      <section className="fin-metrics-grid" aria-label="Institutional report summary">
        <MetricCard
          label="Cumulative Tuition Billed"
          value={formatMoney(reports.totalBilledPaise)}
          highlight
        />
        <MetricCard
          label="Net Tuition Collected"
          value={formatMoney(reports.totalCollectedPaise)}
          hintTone="positive"
        />
        <MetricCard
          label="Total Payroll Committed"
          value={formatMoney(reports.totalPayrollPaise)}
        />
        <MetricCard
          label="Net Academic Surplus"
          value={formatMoney(reports.netSurplusPaise)}
          hintTone={reports.netSurplusPaise >= 0 ? "positive" : "danger"}
          highlight
        />
      </section>

      <section className="fin-card" aria-labelledby="rep-track-heading">
        <div className="fin-card-header">
          <h2 id="rep-track-heading">Revenue & Margin by Programme Track</h2>
        </div>
        <DataTable
          rows={reports.revenueByTrack}
          columns={trackCols}
          getRowId={(r) => r.trackCode}
          label="Revenue by track"
        />
      </section>

      <section className="fin-card" aria-labelledby="rep-batch-heading">
        <div className="fin-card-header">
          <h2 id="rep-batch-heading">Revenue vs Payroll Cost by Cohort Batch</h2>
        </div>
        <DataTable
          rows={reports.revenueByBatch}
          columns={batchCols}
          getRowId={(r) => r.batchId}
          label="Revenue by batch"
        />
      </section>
    </div>
  );
}
