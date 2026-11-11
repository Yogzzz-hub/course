import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Download, Plus, XCircle } from "lucide-react";
import { parseRupeesToPaise } from "../../../backend/services/financier/money";
import type {
  ActorIdentity,
  AdjustmentType,
  PayrollAdjustmentRecord,
  PayrollRunRecord,
  PayrollRunStatus,
  TrainerPayoutRecord,
} from "../../../backend/services/financier/types";
import { DataTable, MetricCard, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi, FinancierApiError } from "./api";
import { formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface PayrollRunDetailViewProps {
  runId: string;
  actor: ActorIdentity;
  onSummaryRefresh: () => Promise<void>;
}

const NEXT_STATUS_LABEL: Partial<Record<PayrollRunStatus, { next: PayrollRunStatus; label: string }>> = {
  DRAFT: { next: "REVIEW", label: "Submit for Review" },
  REVIEW: { next: "APPROVED", label: "Approve Payroll Run" },
  APPROVED: { next: "PAID", label: "Mark Run Paid & Post GL" },
};

export function PayrollRunDetailView({
  runId,
  actor,
  onSummaryRefresh,
}: PayrollRunDetailViewProps) {
  const { showToast } = useToast();
  const baseId = useId();
  const [run, setRun] = useState<PayrollRunRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transitionBusy, setTransitionBusy] = useState(false);

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjPayoutId, setAdjPayoutId] = useState("");
  const [adjType, setAdjType] = useState<AdjustmentType>("BONUS");
  const [adjRupees, setAdjRupees] = useState("2000.00");
  const [adjReason, setAdjReason] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);

  const loadRun = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await financierApi.getPayrollRun(runId);
      setRun(res.run);
      setAdjPayoutId((prev) => prev || res.run.payouts[0]?.id || "");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load payroll run.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  const handleTransition = async (nextStatus: PayrollRunStatus) => {
    if (!run) return;
    setTransitionBusy(true);
    try {
      await financierApi.transitionPayrollRun(run.id, { status: nextStatus });
      showToast({
        title: `Payroll run transitioned to ${nextStatus}`,
        tone: "success",
      });
      await loadRun();
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Transition blocked",
        description: err instanceof Error ? err.message : "Unable to change payroll status.",
        tone: "danger",
      });
    } finally {
      setTransitionBusy(false);
    }
  };

  const handleAddAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!run) return;
    const amountPaise = parseRupeesToPaise(adjRupees, false);
    if (!amountPaise || amountPaise <= 0) {
      showToast({ title: "Enter a valid positive INR adjustment amount.", tone: "danger" });
      return;
    }
    if (adjReason.trim().length < 5) {
      showToast({
        title: "Reason required",
        description: "Adjustment reason must be at least 5 characters.",
        tone: "warning",
      });
      return;
    }

    setAdjBusy(true);
    try {
      await financierApi.addPayrollAdjustment(run.id, {
        trainerPayoutId: adjPayoutId,
        type: adjType,
        amountPaise,
        reason: adjReason.trim(),
      });
      showToast({
        title: "Adjustment added",
        description: "Requires dual-control approval by a second officer.",
        tone: "success",
      });
      setAdjOpen(false);
      setAdjReason("");
      await loadRun();
    } catch (err) {
      showToast({
        title: "Could not add adjustment",
        description: err instanceof Error ? err.message : "Failed to post adjustment.",
        tone: "danger",
      });
    } finally {
      setAdjBusy(false);
    }
  };

  const handleDecideAdj = async (
    adj: PayrollAdjustmentRecord,
    decision: "APPROVED" | "REJECTED"
  ) => {
    if (!run) return;
    try {
      await financierApi.decidePayrollAdjustment(run.id, adj.id, decision);
      showToast({
        title: `Adjustment ${decision.toLowerCase()}`,
        tone: decision === "APPROVED" ? "success" : "warning",
      });
      await loadRun();
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Dual-control blocked",
        description:
          err instanceof FinancierApiError ? err.message : "Approver must differ from requester.",
        tone: "danger",
      });
    }
  };

  const payoutColumns: SharedTableColumn<TrainerPayoutRecord>[] = [
    {
      id: "trainer",
      label: "Trainer & Policy",
      sortValue: (r) => r.trainerName,
      searchValue: (r) => `${r.trainerName} ${r.employeeCode} ${r.payslipNumber}`,
      render: (r) => (
        <div>
          <strong>{r.trainerName}</strong>
          <div className="fin-sub-text">
            {r.employeeCode} · {r.policyType} ({formatMoney(r.applicableRatePaise)})
          </div>
        </div>
      ),
    },
    {
      id: "classes",
      label: "Locked Held Classes",
      numeric: true,
      sortValue: (r) => r.eligibleSessionsCount,
      render: (r) => (
        <div>
          <strong>{r.eligibleSessionsCount} sessions</strong>
          <div className="fin-sub-text">{r.verifiedMinutes} mins</div>
        </div>
      ),
    },
    {
      id: "batches",
      label: "Batch Cost Allocation",
      render: (r) =>
        r.batchBreakdowns.length === 0 ? (
          <span className="fin-sub-text">No sessions in period</span>
        ) : (
          <div className="fin-stack-sm">
            {r.batchBreakdowns.map((b) => (
              <span key={b.batchId} className="fin-sub-text">
                {b.batchCode}: {b.sessionsCount} cls · {formatMoney(b.totalCostPaise)}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: "base",
      label: "Base Pay",
      numeric: true,
      sortValue: (r) => r.baseAmountPaise,
      render: (r) => formatMoney(r.baseAmountPaise),
    },
    {
      id: "net",
      label: "Net Payable",
      numeric: true,
      sortValue: (r) => r.totalPayablePaise,
      render: (r) => (
        <div>
          <strong>{formatMoney(r.totalPayablePaise)}</strong>
          {(r.bonusPaise > 0 || r.deductionPaise > 0) && (
            <div className="fin-sub-text">
              +{formatMoney(r.bonusPaise)} / -{formatMoney(r.deductionPaise)}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "payslip",
      label: "Actions",
      render: (r) => (
        <div className="fin-row-wrap">
          <button
            type="button"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            onClick={() => {
              void financierApi.downloadPayslipPdf(run!.id, r.id, r.payslipNumber).then(() => {
                showToast({ title: `Downloaded ${r.payslipNumber}.pdf`, tone: "success" });
              });
            }}
          >
            <Download size={13} aria-hidden="true" />
            <span>Payslip PDF</span>
          </button>
          {run && run.status !== "PAID" && (
            <button
              type="button"
              className="fin-btn fin-btn-secondary fin-btn-sm"
              onClick={() => {
                setAdjPayoutId(r.id);
                setAdjOpen(true);
              }}
            >
              <Plus size={13} aria-hidden="true" />
              <span>Adjust</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  const allAdjustments = run ? run.payouts.flatMap((p) => p.adjustments) : [];
  const adjColumns: SharedTableColumn<PayrollAdjustmentRecord>[] = [
    {
      id: "type",
      label: "Type & Reason",
      sortValue: (r) => r.type,
      searchValue: (r) => `${r.type} ${r.reason} ${r.requestedByName}`,
      render: (r) => (
        <div>
          <span className="fin-badge fin-badge-neutral">{r.type}</span>
          <div className="fin-sub-text">{r.reason}</div>
        </div>
      ),
    },
    {
      id: "amount",
      label: "Amount",
      numeric: true,
      sortValue: (r) => r.amountPaise,
      render: (r) => formatMoney(r.amountPaise),
    },
    {
      id: "requester",
      label: "Requested By",
      sortValue: (r) => r.requestedByName,
      render: (r) => r.requestedByName,
    },
    {
      id: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <div>
          <span className={statusBadgeClass(r.status)}>{r.status}</span>
          {r.approvedByName && <div className="fin-sub-text">By {r.approvedByName}</div>}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Dual-Control",
      render: (r) => {
        if (r.status !== "PENDING") return <span className="fin-sub-text">Decided</span>;
        const isSelf = r.requestedById === actor.id;
        return (
          <div className="fin-row-wrap">
            <button
              type="button"
              className="fin-btn fin-btn-primary fin-btn-sm"
              disabled={isSelf}
              onClick={() => handleDecideAdj(r, "APPROVED")}
            >
              <CheckCircle size={13} aria-hidden="true" />
              <span>{isSelf ? "Self Blocked" : "Approve"}</span>
            </button>
            <button
              type="button"
              className="fin-btn fin-btn-danger fin-btn-sm"
              disabled={isSelf}
              onClick={() => handleDecideAdj(r, "REJECTED")}
            >
              <XCircle size={13} aria-hidden="true" />
              <span>Reject</span>
            </button>
          </div>
        );
      },
    },
  ];

  const nextAction = run ? NEXT_STATUS_LABEL[run.status] : undefined;

  return (
    <div className="fin-stack-lg">
      <nav className="fin-breadcrumb" aria-label="Breadcrumb">
        <Link to="/financier/payroll" className="fin-link">
          <ArrowLeft size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} />{" "}
          Payroll Runs
        </Link>
        <span aria-hidden="true">/</span>
        <span>{run ? run.runNumber : runId}</span>
      </nav>

      {loading ? (
        <div className="fin-empty-state">Loading payroll run details...</div>
      ) : errorMsg || !run ? (
        <div className="fin-alert fin-alert--danger" role="alert">
          <span>{errorMsg || `Payroll run ${runId} not found.`}</span>
        </div>
      ) : (
        <>
          <div className="fin-page-header">
            <div>
              <div className="fin-row-wrap" style={{ marginBottom: 6 }}>
                <span className={statusBadgeClass(run.status)}>{run.status}</span>
                <span className="fin-sub-text">
                  {formatShortDate(run.startDate)} – {formatShortDate(run.endDate)}
                </span>
              </div>
              <h1>
                {run.runNumber} — {run.periodName}
              </h1>
            </div>
            <div className="fin-page-header-actions">
              {run.status !== "PAID" && (
                <button
                  type="button"
                  className="fin-btn fin-btn-secondary"
                  onClick={() => setAdjOpen(true)}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>Add Adjustment</span>
                </button>
              )}
              {nextAction && (
                <button
                  type="button"
                  className="fin-btn fin-btn-primary"
                  disabled={transitionBusy}
                  onClick={() => handleTransition(nextAction.next)}
                >
                  {transitionBusy ? "Updating..." : nextAction.label}
                </button>
              )}
            </div>
          </div>

          <div className="fin-metrics-grid">
            <MetricCard
              label="Base Compensation"
              value={formatMoney(run.totalBasePaise)}
              hint="From locked held sessions"
            />
            <MetricCard
              label="Net Approved Adjustments"
              value={formatMoney(run.totalAdjustmentNetPaise)}
              hint={`${allAdjustments.length} adjustment items`}
            />
            <MetricCard
              label="Total Run Payable"
              value={formatMoney(run.totalPayablePaise)}
              highlight
              hint={run.paidAt ? `Paid on ${formatShortDate(run.paidAt)}` : "Cycle total"}
            />
            <MetricCard
              label="Workflow Stage"
              value={run.status}
              hint="DRAFT -> REVIEW -> APPROVED -> PAID"
            />
          </div>

          <section className="fin-card" aria-labelledby="prd-payouts-heading">
            <div className="fin-card-header">
              <h2 id="prd-payouts-heading">Trainer Compensation Breakdown</h2>
            </div>
            <DataTable
              rows={run.payouts}
              columns={payoutColumns}
              getRowId={(r) => r.id}
              label="Trainer payouts"
            />
          </section>

          <section className="fin-card" aria-labelledby="prd-adj-heading">
            <div className="fin-card-header">
              <div>
                <h2 id="prd-adj-heading">Payroll Adjustments & Dual-Control Approvals</h2>
                <p>Adjustments require a justification reason and a distinct approver</p>
              </div>
            </div>
            <DataTable
              rows={allAdjustments}
              columns={adjColumns}
              getRowId={(r) => r.id}
              label="Payroll adjustments"
              emptyMessage="No adjustments recorded on this payroll run."
            />
          </section>

          <Modal
            open={adjOpen}
            onClose={() => setAdjOpen(false)}
            title="Request Payroll Adjustment"
            subtitle="Requires justification reason and second-officer approval"
          >
            <form onSubmit={handleAddAdjustment} className="fin-stack-md">
              <div className="fin-form-field">
                <label htmlFor={`${baseId}-adj-po`} className="fin-label">
                  Faculty Payout
                </label>
                <select
                  id={`${baseId}-adj-po`}
                  className="fin-select"
                  value={adjPayoutId}
                  onChange={(e) => setAdjPayoutId(e.target.value)}
                >
                  {run.payouts.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.trainerName} ({po.payslipNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="fin-form-grid">
                <div className="fin-form-field">
                  <label htmlFor={`${baseId}-adj-type`} className="fin-label">
                    Adjustment Type
                  </label>
                  <select
                    id={`${baseId}-adj-type`}
                    className="fin-select"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as AdjustmentType)}
                  >
                    <option value="BONUS">Bonus (+)</option>
                    <option value="SUBSTITUTION_FEE">Substitution Fee (+)</option>
                    <option value="DEDUCTION">Deduction (-)</option>
                    <option value="TAX_WITHHOLDING">TDS / Tax Withholding (-)</option>
                  </select>
                </div>
                <div className="fin-form-field">
                  <label htmlFor={`${baseId}-adj-amt`} className="fin-label">
                    Amount (INR)
                  </label>
                  <input
                    id={`${baseId}-adj-amt`}
                    type="text"
                    inputMode="decimal"
                    className="fin-input"
                    value={adjRupees}
                    onChange={(e) => setAdjRupees(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="fin-form-field">
                <label htmlFor={`${baseId}-adj-reason`} className="fin-label">
                  Reason (Mandatory)
                </label>
                <textarea
                  id={`${baseId}-adj-reason`}
                  className="fin-textarea"
                  placeholder="Extra mock interviews, batch substitution session, TDS deduction..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  required
                />
              </div>

              <div className="fin-row-between">
                <button
                  type="button"
                  className="fin-btn fin-btn-secondary"
                  onClick={() => setAdjOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fin-btn fin-btn-primary" disabled={adjBusy}>
                  {adjBusy ? "Saving..." : "Submit Adjustment"}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
