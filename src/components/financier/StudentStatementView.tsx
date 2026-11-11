import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Download, Mail, ShieldAlert } from "lucide-react";
import type { StudentStatementView as StatementType } from "../../../backend/services/financier/store";
import type {
  InstallmentRecord,
  InvoiceRecord,
  PaymentRecord,
} from "../../../backend/services/financier/types";
import { DataTable, MetricCard, useToast, type SharedTableColumn } from "../shared";
import { financierApi } from "./api";
import {
  formatDateTime,
  formatMoney,
  formatShortDate,
  invoiceBadgeClass,
  statusBadgeClass,
} from "./formatters";

export interface StudentStatementViewProps {
  studentId: string;
  refreshKey?: number;
  onOpenPaymentDrawer: (opts: {
    triggerEl: HTMLElement | null;
    studentId: string;
    invoiceId?: string;
  }) => void;
  onSummaryRefresh: () => Promise<void>;
}

export function StudentStatementView({
  studentId,
  refreshKey = 0,
  onOpenPaymentDrawer,
  onSummaryRefresh,
}: StudentStatementViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const payBtnRef = useRef<HTMLButtonElement | null>(null);

  const [stmt, setStmt] = useState<StatementType | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sendingRem, setSendingRem] = useState(false);

  const loadStatement = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await financierApi.getStudentStatement(studentId);
      setStmt(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Student statement not found.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadStatement();
  }, [loadStatement, refreshKey]);

  const handleSendReminder = async () => {
    if (!stmt) return;
    setSendingRem(true);
    try {
      const res = await financierApi.sendFeeReminder(stmt.student.id);
      showToast({
        title: `Reminder sent (${res.notification.status})`,
        description: `Dispatched to ${stmt.student.email}`,
        tone: "success",
      });
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Reminder failed",
        description: err instanceof Error ? err.message : "Could not send reminder.",
        tone: "danger",
      });
    } finally {
      setSendingRem(false);
    }
  };

  const instCols: SharedTableColumn<InstallmentRecord>[] = [
    {
      id: "num",
      label: "Instalment #",
      sortValue: (r) => r.installmentNumber,
      render: (r) => <strong>Instalment #{r.installmentNumber}</strong>,
    },
    {
      id: "dueDate",
      label: "Due Date",
      sortValue: (r) => r.dueDate,
      render: (r) => formatShortDate(r.dueDate),
    },
    {
      id: "due",
      label: "Due Amount",
      numeric: true,
      sortValue: (r) => r.amountDuePaise,
      render: (r) => formatMoney(r.amountDuePaise),
    },
    {
      id: "paid",
      label: "Paid",
      numeric: true,
      sortValue: (r) => r.amountPaidPaise,
      render: (r) => formatMoney(r.amountPaidPaise),
    },
    {
      id: "remaining",
      label: "Remaining Balance",
      numeric: true,
      sortValue: (r) => r.remainingBalancePaise,
      render: (r) => <strong>{formatMoney(r.remainingBalancePaise)}</strong>,
    },
    {
      id: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => <span className={statusBadgeClass(r.status)}>{r.status}</span>,
    },
  ];

  const invCols: SharedTableColumn<InvoiceRecord>[] = [
    {
      id: "num",
      label: "Invoice #",
      sortValue: (r) => r.invoiceNumber,
      render: (r) => <strong className="fin-mono">{r.invoiceNumber}</strong>,
    },
    {
      id: "dueDate",
      label: "Due Date",
      sortValue: (r) => r.dueDate,
      render: (r) => formatShortDate(r.dueDate),
    },
    {
      id: "net",
      label: "Net Total",
      numeric: true,
      sortValue: (r) => r.netTotalPaise,
      render: (r) => formatMoney(r.netTotalPaise),
    },
    {
      id: "paid",
      label: "Paid",
      numeric: true,
      sortValue: (r) => r.paidAmountPaise,
      render: (r) => formatMoney(r.paidAmountPaise),
    },
    {
      id: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => <span className={invoiceBadgeClass(r.status)}>{r.status}</span>,
    },
    {
      id: "pdf",
      label: "PDF",
      render: (r) => (
        <button
          type="button"
          className="fin-btn fin-btn-secondary fin-btn-sm"
          onClick={() => void financierApi.downloadInvoicePdf(r)}
        >
          <Download size={13} aria-hidden="true" />
          <span>PDF</span>
        </button>
      ),
    },
  ];

  const payCols: SharedTableColumn<PaymentRecord>[] = [
    {
      id: "receipt",
      label: "Receipt #",
      sortValue: (r) => r.receiptNumber,
      render: (r) => <strong className="fin-mono">{r.receiptNumber}</strong>,
    },
    {
      id: "ref",
      label: "Reference & Method",
      render: (r) => (
        <div>
          <span className="fin-badge fin-badge-neutral">{r.paymentMethod}</span>
          <div className="fin-sub-text fin-mono">{r.externalReference}</div>
        </div>
      ),
    },
    {
      id: "date",
      label: "Date",
      sortValue: (r) => r.paymentDate,
      render: (r) => formatShortDate(r.paymentDate),
    },
    {
      id: "amount",
      label: "Paid",
      numeric: true,
      sortValue: (r) => r.amountPaise,
      render: (r) => <strong>{formatMoney(r.amountPaise)}</strong>,
    },
    {
      id: "pdf",
      label: "Receipt PDF",
      render: (r) => (
        <button
          type="button"
          className="fin-btn fin-btn-secondary fin-btn-sm"
          onClick={() => void financierApi.downloadReceiptPdf(r)}
        >
          <Download size={13} aria-hidden="true" />
          <span>Receipt</span>
        </button>
      ),
    },
  ];

  return (
    <div className="fin-stack-lg">
      <nav className="fin-breadcrumb" aria-label="Breadcrumb">
        <Link to="/financier/fees" className="fin-link">
          <ArrowLeft size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} />{" "}
          Student Fee Accounts
        </Link>
        <span aria-hidden="true">/</span>
        <span>{stmt ? stmt.student.registrationNumber : studentId}</span>
      </nav>

      {loading ? (
        <div className="fin-empty-state">Loading student financial statement...</div>
      ) : errorMsg || !stmt ? (
        <div className="fin-alert fin-alert--danger" role="alert">
          <span>{errorMsg || `Student ${studentId} not found.`}</span>
        </div>
      ) : (
        <>
          <div className="fin-page-header">
            <div>
              <div className="fin-row-wrap" style={{ marginBottom: 6 }}>
                <span className="fin-badge fin-badge-neutral">
                  {stmt.student.registrationNumber}
                </span>
                <span className="fin-badge fin-badge-primary">{stmt.student.batchCode}</span>
                {stmt.student.financialHold && (
                  <span className="fin-badge fin-badge-danger">
                    <ShieldAlert size={12} aria-hidden="true" />
                    Financial Hold Active
                  </span>
                )}
              </div>
              <h1>{stmt.student.name} — Student Fee Statement</h1>
              <p>
                {stmt.student.trackTitle} · {stmt.student.email}
              </p>
            </div>
            <div className="fin-page-header-actions">
              {stmt.outstandingPaise > 0 && (
                <button
                  type="button"
                  className="fin-btn fin-btn-secondary"
                  disabled={sendingRem}
                  onClick={handleSendReminder}
                >
                  <Mail size={15} aria-hidden="true" />
                  <span>{sendingRem ? "Sending..." : "Send Fee Reminder"}</span>
                </button>
              )}
              <button
                ref={payBtnRef}
                type="button"
                className="fin-btn fin-btn-primary"
                onClick={() =>
                  onOpenPaymentDrawer({
                    triggerEl: payBtnRef.current,
                    studentId: stmt.student.id,
                  })
                }
              >
                <CreditCard size={15} aria-hidden="true" />
                <span>Record Payment</span>
              </button>
            </div>
          </div>

          <section className="fin-metrics-grid" aria-label="Student balance overview">
            <MetricCard
              label="Total Agreement Fee"
              value={formatMoney(stmt.student.courseFeePaise)}
              hint={`Approved discount ${formatMoney(stmt.student.approvedDiscountPaise)}`}
            />
            <MetricCard
              label="Total Invoiced (Issued)"
              value={formatMoney(stmt.billedPaise)}
            />
            <MetricCard
              label="Net Settled Paid"
              value={formatMoney(stmt.netPaidPaise)}
              hint={`Refunded: ${formatMoney(stmt.refundedPaise)}`}
              hintTone="positive"
            />
            <MetricCard
              label="Outstanding Balance Due"
              value={formatMoney(stmt.outstandingPaise)}
              highlight={stmt.outstandingPaise > 0}
              hintTone={stmt.outstandingPaise > 0 ? "danger" : "positive"}
            />
          </section>

          <section className="fin-card" aria-labelledby="ss-inst-heading">
            <div className="fin-card-header">
              <h2 id="ss-inst-heading">Instalment Schedule (Oldest-First Allocation Order)</h2>
            </div>
            <DataTable
              rows={stmt.installments}
              columns={instCols}
              getRowId={(r) => r.id}
              label="Student instalments"
            />
          </section>

          <div className="fin-split-grid">
            <section className="fin-card" aria-labelledby="ss-inv-heading">
              <div className="fin-card-header">
                <h2 id="ss-inv-heading">Invoices ({stmt.invoices.length})</h2>
              </div>
              <DataTable
                rows={stmt.invoices}
                columns={invCols}
                getRowId={(r) => r.id}
                label="Student invoices"
                onRowOpen={(inv) => navigate(`/financier/invoices/${inv.id}`)}
              />
            </section>

            <section className="fin-card fin-card--gold-accent" aria-labelledby="ss-notes-heading">
              <div className="fin-card-header">
                <h2 id="ss-notes-heading">Follow-Up & Journal Postings</h2>
              </div>
              <div className="fin-stack-sm">
                {stmt.followUpNotes.length === 0 ? (
                  <div className="fin-empty-state">No collection follow-up notes recorded.</div>
                ) : (
                  stmt.followUpNotes.map((n) => (
                    <div key={n.id} className="fin-kv-box">
                      <div className="fin-row-between">
                        <span className="fin-badge fin-badge-neutral">{n.channel}</span>
                        <span className="fin-sub-text">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <span>{n.note}</span>
                    </div>
                  ))
                )}

                <h3 style={{ marginTop: 8 }}>Student Ledger Postings ({stmt.ledgerLines.length})</h3>
                {stmt.ledgerLines.slice(0, 8).map((l) => (
                  <div key={l.id} className="fin-kv-box">
                    <div className="fin-row-between">
                      <Link to={`/financier/ledger/${l.accountCode}`} className="fin-link">
                        {l.direction === "DEBIT" ? "Dr" : "Cr"} {l.accountCode}
                      </Link>
                      <strong className="fin-mono">{formatMoney(l.amountPaise)}</strong>
                    </div>
                    <span className="fin-sub-text">
                      {l.entryNumber} · {formatShortDate(l.entryDate)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="fin-card" aria-labelledby="ss-pay-heading">
            <div className="fin-card-header">
              <h2 id="ss-pay-heading">Payment History & Receipts</h2>
            </div>
            <DataTable
              rows={stmt.payments}
              columns={payCols}
              getRowId={(r) => r.id}
              label="Student payments"
              emptyMessage="No payments recorded for this student yet."
            />
          </section>
        </>
      )}
    </div>
  );
}
