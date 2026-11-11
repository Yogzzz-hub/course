import { useId, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import type { PayrollRunRecord } from "../../../backend/services/financier/types";
import { DataTable, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi, type FinancierReportsResponse } from "./api";
import { formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface PayrollViewProps {
  runs: PayrollRunRecord[];
  batchCosts: FinancierReportsResponse["revenueByBatch"];
  onRefresh: () => Promise<void>;
}

export function PayrollView({ runs, batchCosts, onRefresh }: PayrollViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const baseId = useId();
  const createBtnRef = useRef<HTMLButtonElement | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [periodName, setPeriodName] = useState("November 2026 Cycle B");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateRun = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await financierApi.createPayrollRun({
        periodName: periodName.trim(),
        startDate,
        endDate,
      });
      showToast({
        title: `Created payroll run ${res.run.runNumber}`,
        description: `${res.run.payouts.length} faculty payouts computed from locked HELD classes.`,
        tone: "success",
      });
      setCreateOpen(false);
      await onRefresh();
      navigate(`/financier/payroll/${res.run.id}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate payroll run.");
    } finally {
      setBusy(false);
    }
  };

  const runColumns: SharedTableColumn<PayrollRunRecord>[] = [
    {
      id: "run",
      label: "Payroll Run",
      sortValue: (r) => r.runNumber,
      searchValue: (r) => `${r.runNumber} ${r.periodName}`,
      render: (r) => (
        <div>
          <strong className="fin-mono">{r.runNumber}</strong>
          <div className="fin-sub-text">{r.periodName}</div>
        </div>
      ),
    },
    {
      id: "window",
      label: "Period Window",
      sortValue: (r) => r.startDate,
      render: (r) => `${formatShortDate(r.startDate)} – ${formatShortDate(r.endDate)}`,
    },
    {
      id: "payoutsCount",
      label: "Faculty Included",
      numeric: true,
      sortValue: (r) => r.payouts.length,
      render: (r) => `${r.payouts.length} trainers`,
    },
    {
      id: "total",
      label: "Net Payable",
      numeric: true,
      sortValue: (r) => r.totalPayablePaise,
      render: (r) => <strong>{formatMoney(r.totalPayablePaise)}</strong>,
    },
    {
      id: "status",
      label: "Workflow Status",
      sortValue: (r) => r.status,
      render: (r) => <span className={statusBadgeClass(r.status)}>{r.status}</span>,
    },
  ];

  const batchCostColumns: SharedTableColumn<
    FinancierReportsResponse["revenueByBatch"][number]
  >[] = [
    {
      id: "batch",
      label: "Batch",
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
      label: "Tuition Billed",
      numeric: true,
      sortValue: (r) => r.billedPaise,
      render: (r) => formatMoney(r.billedPaise),
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
      label: "Contribution",
      numeric: true,
      sortValue: (r) => r.netContributionPaise,
      render: (r) => (
        <span className={statusBadgeClass(r.netContributionPaise >= 0 ? "CONFIRMED" : "OVERDUE")}>
          {formatMoney(r.netContributionPaise)}
        </span>
      ),
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Trainer Payroll & Batch Costing</h1>
          <p>
            Calculate compensation strictly from locked held classes per batch (cancelled
            sessions excluded), enforce approval workflows, and issue payslip PDFs.
          </p>
        </div>
        <button
          ref={createBtnRef}
          type="button"
          className="fin-btn fin-btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Generate Payroll Run</span>
        </button>
      </div>

      <div className="fin-split-grid">
        <section className="fin-card" aria-labelledby="pr-runs-heading">
          <div className="fin-card-header">
            <div>
              <h2 id="pr-runs-heading">Payroll Runs Register</h2>
              <p>Open any run (click or press Enter) to approve, adjust, and download payslips</p>
            </div>
          </div>
          <DataTable
            rows={runs}
            columns={runColumns}
            getRowId={(r) => r.id}
            label="Payroll runs"
            onRowOpen={(run) => navigate(`/financier/payroll/${run.id}`)}
          />
        </section>

        <section className="fin-card fin-card--gold-accent" aria-labelledby="pr-batch-heading">
          <div className="fin-card-header">
            <div>
              <h2 id="pr-batch-heading">Payroll Cost by Batch</h2>
              <p>Cumulative instructional payout allocation against batch revenue</p>
            </div>
          </div>
          <DataTable
            rows={batchCosts}
            columns={batchCostColumns}
            getRowId={(r) => r.batchId}
            label="Payroll cost by batch"
            pageSize={6}
          />
        </section>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        returnFocusTo={createBtnRef}
        title="Generate New Payroll Run"
        subtitle="Counts only HELD + isLocked class sessions inside the date range"
      >
        <form onSubmit={handleCreateRun} className="fin-stack-md">
          {errorMsg && (
            <div className="fin-alert fin-alert--danger" role="alert">
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-period`} className="fin-label">
              Payroll Cycle Name
            </label>
            <input
              id={`${baseId}-period`}
              type="text"
              className="fin-input"
              value={periodName}
              onChange={(e) => setPeriodName(e.target.value)}
              required
            />
          </div>

          <div className="fin-form-grid">
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-start`} className="fin-label">
                Start Date
              </label>
              <input
                id={`${baseId}-start`}
                type="date"
                className="fin-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-end`} className="fin-label">
                End Date
              </label>
              <input
                id={`${baseId}-end`}
                type="date"
                className="fin-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="fin-row-between">
            <button
              type="button"
              className="fin-btn fin-btn-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="fin-btn fin-btn-primary" disabled={busy}>
              {busy ? "Computing..." : "Create Draft Payroll Run"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
