import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Download, Plus, RotateCcw, XCircle } from "lucide-react";
import { parseRupeesToPaise } from "../../../backend/services/financier/money";
import type {
  ActorIdentity,
  PaymentMethod,
  PaymentRecord,
  RefundRecord,
} from "../../../backend/services/financier/types";
import { DataTable, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi, FinancierApiError } from "./api";
import { formatMoney, formatShortDate, statusBadgeClass } from "./formatters";

export interface PaymentsViewProps {
  actor: ActorIdentity;
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  onOpenPaymentDrawer: (triggerEl: HTMLElement | null) => void;
  onRefresh: () => Promise<void>;
}

export function PaymentsView({
  actor,
  payments,
  refunds,
  onOpenPaymentDrawer,
  onRefresh,
}: PaymentsViewProps) {
  const { showToast } = useToast();
  const baseId = useId();
  const drawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const refundTriggerRef = useRef<HTMLButtonElement | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState(payments[0]?.id || "");
  const [refundRupees, setRefundRupees] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundErr, setRefundErr] = useState<string | null>(null);

  const [execTarget, setExecTarget] = useState<RefundRecord | null>(null);
  const [execRef, setExecRef] = useState("");
  const [execBusy, setExecBusy] = useState(false);

  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    try {
      await financierApi.downloadReceiptPdf(payment);
      showToast({
        title: `Receipt ${payment.receiptNumber}.pdf ready`,
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "Receipt export failed",
        description: err instanceof Error ? err.message : "Could not generate PDF.",
        tone: "danger",
      });
    }
  };

  const handleRequestRefund = async (e: FormEvent) => {
    e.preventDefault();
    setRefundErr(null);
    const amountPaise = parseRupeesToPaise(refundRupees, false);
    if (!amountPaise || amountPaise <= 0) {
      setRefundErr("Enter a valid positive INR refund amount.");
      return;
    }
    if (refundReason.trim().length < 5) {
      setRefundErr("Refund reason must be at least 5 characters.");
      return;
    }

    setRefundBusy(true);
    try {
      await financierApi.requestRefund({
        paymentId: refundPaymentId,
        amountPaise,
        refundMethod,
        reason: refundReason.trim(),
      });
      showToast({
        title: "Refund request submitted",
        description: "Requires dual-control approval by a second officer.",
        tone: "success",
      });
      setRefundOpen(false);
      setRefundReason("");
      await onRefresh();
    } catch (err) {
      setRefundErr(err instanceof Error ? err.message : "Failed to submit refund request.");
    } finally {
      setRefundBusy(false);
    }
  };

  const handleDecideRefund = async (refund: RefundRecord, decision: "APPROVED" | "REJECTED") => {
    try {
      await financierApi.decideRefund(refund.id, {
        decision,
        reason: `${decision} after dual-control check by ${actor.name}`,
      });
      showToast({
        title: `Refund ${decision.toLowerCase()}`,
        tone: decision === "APPROVED" ? "success" : "warning",
      });
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Approval blocked",
        description:
          err instanceof FinancierApiError ? err.message : "Dual-control check failed.",
        tone: "danger",
      });
    }
  };

  const handleExecuteRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!execTarget) return;
    setExecBusy(true);
    try {
      await financierApi.executeRefund(execTarget.id, {
        externalReference: execRef.trim(),
      });
      showToast({
        title: "Refund payout posted to General Ledger",
        tone: "success",
      });
      setExecTarget(null);
      setExecRef("");
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Execution rejected",
        description: err instanceof Error ? err.message : "Unable to execute refund.",
        tone: "danger",
      });
    } finally {
      setExecBusy(false);
    }
  };

  const paymentColumns: SharedTableColumn<PaymentRecord>[] = [
    {
      id: "receipt",
      label: "Receipt & Ref",
      sortValue: (r) => r.receiptNumber,
      searchValue: (r) =>
        `${r.receiptNumber} ${r.externalReference} ${r.transactionNumber} ${r.studentName}`,
      render: (r) => (
        <div>
          <strong className="fin-mono">{r.receiptNumber}</strong>
          <div className="fin-sub-text fin-mono">Ref: {r.externalReference}</div>
        </div>
      ),
    },
    {
      id: "student",
      label: "Student & Track",
      sortValue: (r) => r.studentName,
      searchValue: (r) => `${r.studentName} ${r.registrationNumber} ${r.batchCode}`,
      render: (r) => (
        <div>
          <Link to={`/financier/students/${r.studentProfileId}`} className="fin-link">
            {r.studentName}
          </Link>
          <div className="fin-sub-text">
            {r.registrationNumber} · {r.batchCode}
          </div>
        </div>
      ),
    },
    {
      id: "method",
      label: "Method & Date",
      sortValue: (r) => r.paymentDate,
      render: (r) => (
        <div>
          <span className="fin-badge fin-badge-neutral">{r.paymentMethod}</span>
          <div className="fin-sub-text">{formatShortDate(r.paymentDate)}</div>
        </div>
      ),
    },
    {
      id: "allocations",
      label: "Oldest-First Allocation",
      render: (r) =>
        r.allocations.length === 0 ? (
          <span className="fin-sub-text">General account credit</span>
        ) : (
          <div className="fin-stack-sm">
            {r.allocations.map((a) => (
              <span key={a.id} className="fin-sub-text">
                Inst #{a.installmentNumber}: {formatMoney(a.allocatedPaise)}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: "amount",
      label: "Paid / Net",
      numeric: true,
      sortValue: (r) => r.amountPaise,
      render: (r) => (
        <div>
          <strong>{formatMoney(r.amountPaise)}</strong>
          {r.refundedPaise > 0 && (
            <div className="fin-sub-text">Refunded {formatMoney(r.refundedPaise)}</div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      label: "Status",
      sortValue: (r) => r.verificationStatus,
      render: (r) => (
        <span className={statusBadgeClass(r.verificationStatus)}>{r.verificationStatus}</span>
      ),
    },
    {
      id: "pdf",
      label: "Receipt PDF",
      render: (r) => (
        <button
          type="button"
          className="fin-btn fin-btn-secondary fin-btn-sm"
          onClick={() => handleDownloadReceipt(r)}
        >
          <Download size={13} aria-hidden="true" />
          <span>Receipt</span>
        </button>
      ),
    },
  ];

  const refundColumns: SharedTableColumn<RefundRecord>[] = [
    {
      id: "student",
      label: "Student & Original Ref",
      sortValue: (r) => r.studentName,
      searchValue: (r) => `${r.studentName} ${r.paymentReference} ${r.reason}`,
      render: (r) => (
        <div>
          <strong>{r.studentName}</strong>
          <div className="fin-sub-text">Original ref: {r.paymentReference}</div>
          <div className="fin-sub-text">{r.reason}</div>
        </div>
      ),
    },
    {
      id: "amount",
      label: "Refund Amount",
      numeric: true,
      sortValue: (r) => r.amountPaise,
      render: (r) => formatMoney(r.amountPaise),
    },
    {
      id: "requester",
      label: "Requester",
      sortValue: (r) => r.requestedByName,
      render: (r) => (
        <div>
          <div>{r.requestedByName}</div>
          <div className="fin-sub-text">{formatShortDate(r.requestedAt)}</div>
        </div>
      ),
    },
    {
      id: "status",
      label: "Workflow Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <div>
          <span className={statusBadgeClass(r.status)}>{r.status}</span>
          {r.externalReference && (
            <div className="fin-sub-text fin-mono">Payout Ref: {r.externalReference}</div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (r) => {
        if (r.status === "REQUESTED") {
          const isSelf = r.requestedById === actor.id;
          return (
            <div className="fin-row-wrap">
              <button
                type="button"
                className="fin-btn fin-btn-primary fin-btn-sm"
                disabled={isSelf}
                onClick={() => handleDecideRefund(r, "APPROVED")}
              >
                <CheckCircle size={13} aria-hidden="true" />
                <span>{isSelf ? "Self-Approval Blocked" : "Approve"}</span>
              </button>
              <button
                type="button"
                className="fin-btn fin-btn-danger fin-btn-sm"
                disabled={isSelf}
                onClick={() => handleDecideRefund(r, "REJECTED")}
              >
                <XCircle size={13} aria-hidden="true" />
                <span>Reject</span>
              </button>
            </div>
          );
        }
        if (r.status === "APPROVED") {
          return (
            <button
              type="button"
              className="fin-btn fin-btn-primary fin-btn-sm"
              onClick={() => {
                setExecRef("");
                setExecTarget(r);
              }}
            >
              Execute Payout
            </button>
          );
        }
        return <span className="fin-sub-text">{r.approvedByName || "Completed"}</span>;
      },
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Payments, Receipts & Refunds</h1>
          <p>
            Record verified fee collections across UPI, Bank Transfer, Card, or Cash with
            duplicate-reference protection and binary receipt PDFs.
          </p>
        </div>
        <div className="fin-page-header-actions">
          <button
            ref={refundTriggerRef}
            type="button"
            className="fin-btn fin-btn-secondary"
            onClick={() => {
              setRefundPaymentId(payments[0]?.id || "");
              setRefundOpen(true);
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Request Refund</span>
          </button>
          <button
            ref={drawerTriggerRef}
            type="button"
            className="fin-btn fin-btn-primary"
            onClick={() => onOpenPaymentDrawer(drawerTriggerRef.current)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      <section className="fin-card" aria-labelledby="pay-ledger-heading">
        <div className="fin-card-header">
          <div>
            <h2 id="pay-ledger-heading">Confirmed Tuition Payments</h2>
            <p>Every recorded payment allocates to oldest unpaid instalments first</p>
          </div>
        </div>
        <DataTable
          rows={payments}
          columns={paymentColumns}
          getRowId={(r) => r.id}
          label="Confirmed payments"
        />
      </section>

      <section className="fin-card" aria-labelledby="pay-refunds-heading">
        <div className="fin-card-header">
          <div>
            <h2 id="pay-refunds-heading">Refund Requests & Dual-Control Execution</h2>
            <p>Refunds require a reason, separate approver, and unique settlement reference</p>
          </div>
        </div>
        <DataTable
          rows={refunds}
          columns={refundColumns}
          getRowId={(r) => r.id}
          label="Refund requests"
          emptyMessage="No refund requests recorded."
        />
      </section>

      {/* Request Refund Modal */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        returnFocusTo={refundTriggerRef}
        title="Request Fee Refund"
        subtitle="Approver must differ from requester"
      >
        <form onSubmit={handleRequestRefund} className="fin-stack-md">
          {refundErr && (
            <div className="fin-alert fin-alert--danger" role="alert">
              <span>{refundErr}</span>
            </div>
          )}

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-r-pay`} className="fin-label">
              Original Confirmed Payment
            </label>
            <select
              id={`${baseId}-r-pay`}
              className="fin-select"
              value={refundPaymentId}
              onChange={(e) => setRefundPaymentId(e.target.value)}
            >
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.receiptNumber} — {p.studentName} ({formatMoney(p.amountPaise - p.refundedPaise)}{" "}
                  refundable)
                </option>
              ))}
            </select>
          </div>

          <div className="fin-form-grid">
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-r-amt`} className="fin-label">
                Refund Amount (INR)
              </label>
              <input
                id={`${baseId}-r-amt`}
                type="text"
                inputMode="decimal"
                className="fin-input"
                placeholder="e.g. 5000.00"
                value={refundRupees}
                onChange={(e) => setRefundRupees(e.target.value)}
                required
              />
            </div>
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-r-method`} className="fin-label">
                Refund Channel
              </label>
              <select
                id={`${baseId}-r-method`}
                className="fin-select"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card Reversal</option>
                <option value="CASH">Cash Counter</option>
              </select>
            </div>
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-r-reason`} className="fin-label">
              Reason (Mandatory)
            </label>
            <textarea
              id={`${baseId}-r-reason`}
              className="fin-textarea"
              placeholder="Programme withdrawal, duplicate settlement, or approved fee waiver..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />
          </div>

          <div className="fin-row-between">
            <button
              type="button"
              className="fin-btn fin-btn-secondary"
              onClick={() => setRefundOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="fin-btn fin-btn-primary" disabled={refundBusy}>
              {refundBusy ? "Submitting..." : "Submit Refund Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Execute Approved Refund Modal */}
      <Modal
        open={Boolean(execTarget)}
        onClose={() => setExecTarget(null)}
        title="Execute Approved Refund"
        subtitle="Posts balanced counter-journal entry (DEBIT REVENUE / CREDIT BANK/CASH)"
      >
        {execTarget && (
          <form onSubmit={handleExecuteRefund} className="fin-stack-md">
            <p>
              Executing <strong>{formatMoney(execTarget.amountPaise)}</strong> refund for{" "}
              <strong>{execTarget.studentName}</strong>. Enter unique payout reference:
            </p>
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-exec-ref`} className="fin-label">
                Bank / UPI Payout Reference
              </label>
              <input
                id={`${baseId}-exec-ref`}
                type="text"
                className="fin-input"
                placeholder="e.g. REF-NEFT-2026-412"
                value={execRef}
                onChange={(e) => setExecRef(e.target.value)}
                required
              />
            </div>
            <div className="fin-row-between">
              <button
                type="button"
                className="fin-btn fin-btn-secondary"
                onClick={() => setExecTarget(null)}
              >
                Cancel
              </button>
              <button type="submit" className="fin-btn fin-btn-primary" disabled={execBusy}>
                {execBusy ? "Posting..." : "Post Refund Payout"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
