import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ban, CreditCard, Download, Mail, Send } from "lucide-react";
import { DataTable, MetricCard, Modal, useToast, type SharedTableColumn } from "../shared";
import { financierApi, type FinancierInvoiceDetailResponse } from "./api";
import {
  formatMoney,
  formatShortDate,
  invoiceBadgeClass,
  statusBadgeClass,
} from "./formatters";
import type { PaymentRecord } from "../../../backend/services/financier/types";

export interface InvoiceDetailViewProps {
  invoiceId: string;
  refreshKey?: number;
  onOpenPaymentDrawer: (opts: {
    triggerEl: HTMLElement | null;
    studentId: string;
    invoiceId: string;
  }) => void;
  onSummaryRefresh: () => Promise<void>;
}

export function InvoiceDetailView({
  invoiceId,
  refreshKey = 0,
  onOpenPaymentDrawer,
  onSummaryRefresh,
}: InvoiceDetailViewProps) {
  const { showToast } = useToast();
  const baseId = useId();
  const payBtnRef = useRef<HTMLButtonElement | null>(null);
  const voidBtnRef = useRef<HTMLButtonElement | null>(null);

  const [detail, setDetail] = useState<FinancierInvoiceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [busy, setBusy] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await financierApi.getInvoiceById(invoiceId);
      setDetail(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Invoice not found.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail, refreshKey]);

  const handleMarkSent = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await financierApi.updateInvoiceStatus(detail.invoice.id, { status: "SENT" });
      showToast({
        title: `${detail.invoice.invoiceNumber} marked SENT & posted to GL`,
        tone: "success",
      });
      await loadDetail();
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not send invoice.",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSendEmail = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const res = await financierApi.sendInvoiceEmail(detail.invoice.id);
      showToast({
        title: `Email dispatched (${res.notification.status})`,
        description: `Sent ${detail.invoice.invoiceNumber} to ${detail.invoice.studentEmail}`,
        tone: "success",
      });
      await loadDetail();
    } catch (err) {
      showToast({
        title: "Email failed",
        description: err instanceof Error ? err.message : "Unable to send email.",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (voidReason.trim().length < 5) {
      showToast({ title: "Provide at least 5 characters explaining why invoice is voided.", tone: "warning" });
      return;
    }
    setBusy(true);
    try {
      await financierApi.updateInvoiceStatus(detail.invoice.id, {
        status: "VOID",
        reason: voidReason.trim(),
      });
      showToast({
        title: `${detail.invoice.invoiceNumber} voided with counter-entry reversal`,
        tone: "warning",
      });
      setVoidOpen(false);
      setVoidReason("");
      await loadDetail();
      await onSummaryRefresh();
    } catch (err) {
      showToast({
        title: "Cannot void invoice",
        description: err instanceof Error ? err.message : "Failed to void invoice.",
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  };

  const paymentCols: SharedTableColumn<PaymentRecord>[] = [
    {
      id: "receipt",
      label: "Receipt #",
      sortValue: (r) => r.receiptNumber,
      render: (r) => <strong className="fin-mono">{r.receiptNumber}</strong>,
    },
    {
      id: "method",
      label: "Method & Reference",
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
      label: "Amount",
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
          onClick={() => {
            void financierApi.downloadReceiptPdf(r).then(() => {
              showToast({ title: `Downloaded ${r.receiptNumber}.pdf`, tone: "success" });
            });
          }}
        >
          <Download size={13} aria-hidden="true" />
          <span>PDF</span>
        </button>
      ),
    },
  ];

  const inv = detail?.invoice;
  const unpaidPaise = inv ? Math.max(0, inv.netTotalPaise - inv.paidAmountPaise) : 0;

  return (
    <div className="fin-stack-lg">
      <nav className="fin-breadcrumb" aria-label="Breadcrumb">
        <Link to="/financier/fees" className="fin-link">
          <ArrowLeft size={14} style={{ display: "inline", verticalAlign: "text-bottom" }} />{" "}
          Fees & Invoices
        </Link>
        <span aria-hidden="true">/</span>
        <span>{inv ? inv.invoiceNumber : invoiceId}</span>
      </nav>

      {loading ? (
        <div className="fin-empty-state">Loading invoice statement...</div>
      ) : errorMsg || !detail || !inv ? (
        <div className="fin-alert fin-alert--danger" role="alert">
          <span>{errorMsg || `Invoice ${invoiceId} not found.`}</span>
        </div>
      ) : (
        <>
          <div className="fin-page-header">
            <div>
              <div className="fin-row-wrap" style={{ marginBottom: 6 }}>
                <span className={invoiceBadgeClass(inv.status)}>{inv.status}</span>
                <span className="fin-sub-text">
                  Issued {formatShortDate(inv.issueDate)} · Due {formatShortDate(inv.dueDate)}
                </span>
              </div>
              <h1>{inv.invoiceNumber}</h1>
              <p>
                Student:{" "}
                <Link to={`/financier/students/${inv.studentProfileId}`} className="fin-link">
                  {inv.studentName}
                </Link>{" "}
                ({inv.registrationNumber}) · Cohort {inv.batchCode}
              </p>
            </div>

            <div className="fin-page-header-actions">
              <button
                type="button"
                className="fin-btn fin-btn-secondary"
                onClick={() => {
                  void financierApi.downloadInvoicePdf(inv).then(() => {
                    showToast({ title: `Downloaded ${inv.invoiceNumber}.pdf`, tone: "success" });
                  });
                }}
              >
                <Download size={15} aria-hidden="true" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                className="fin-btn fin-btn-secondary"
                disabled={busy || inv.status === "VOID"}
                onClick={handleSendEmail}
              >
                <Mail size={15} aria-hidden="true" />
                <span>Send Email</span>
              </button>

              {inv.status === "DRAFT" && (
                <button
                  type="button"
                  className="fin-btn fin-btn-primary"
                  disabled={busy}
                  onClick={handleMarkSent}
                >
                  <Send size={15} aria-hidden="true" />
                  <span>Mark SENT & Post Charge</span>
                </button>
              )}

              {inv.status !== "VOID" && inv.status !== "DRAFT" && unpaidPaise > 0 && (
                <button
                  ref={payBtnRef}
                  type="button"
                  className="fin-btn fin-btn-primary"
                  onClick={() =>
                    onOpenPaymentDrawer({
                      triggerEl: payBtnRef.current,
                      studentId: inv.studentProfileId,
                      invoiceId: inv.id,
                    })
                  }
                >
                  <CreditCard size={15} aria-hidden="true" />
                  <span>Record Payment</span>
                </button>
              )}

              {inv.status !== "VOID" && inv.paidAmountPaise === 0 && (
                <button
                  ref={voidBtnRef}
                  type="button"
                  className="fin-btn fin-btn-danger"
                  disabled={busy}
                  onClick={() => setVoidOpen(true)}
                >
                  <Ban size={15} aria-hidden="true" />
                  <span>Void Invoice</span>
                </button>
              )}
            </div>
          </div>

          <div className="fin-metrics-grid">
            <MetricCard label="Gross Amount" value={formatMoney(inv.grossAmountPaise)} />
            <MetricCard label="Discount / Scholarship" value={formatMoney(inv.discountAmountPaise)} />
            <MetricCard label="Paid Settled" value={formatMoney(inv.paidAmountPaise)} hintTone="positive" />
            <MetricCard
              label="Outstanding Balance"
              value={formatMoney(unpaidPaise)}
              highlight={unpaidPaise > 0}
              hintTone={unpaidPaise > 0 ? "danger" : "positive"}
            />
          </div>

          {inv.voidReason && (
            <div className="fin-alert fin-alert--danger">
              <span>
                <strong>Voided on {formatShortDate(inv.voidedAt)}:</strong> {inv.voidReason}
              </span>
            </div>
          )}

          <div className="fin-split-grid">
            <section className="fin-card" aria-labelledby="inv-lines-heading">
              <div className="fin-card-header">
                <h2 id="inv-lines-heading">Invoice Line Items</h2>
              </div>
              <div className="fin-table-scroll">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th scope="col">Description</th>
                      <th scope="col" className="fin-cell-numeric">
                        Qty
                      </th>
                      <th scope="col" className="fin-cell-numeric">
                        Unit Price
                      </th>
                      <th scope="col" className="fin-cell-numeric">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.description}</td>
                        <td className="fin-cell-numeric">{line.quantity}</td>
                        <td className="fin-cell-numeric">{formatMoney(line.unitPricePaise)}</td>
                        <td className="fin-cell-numeric">
                          <strong>{formatMoney(line.totalPaise)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="fin-card fin-card--gold-accent" aria-labelledby="inv-disc-heading">
              <div className="fin-card-header">
                <h2 id="inv-disc-heading">Scholarships & Fee Context</h2>
              </div>
              {detail.discounts.length === 0 ? (
                <div className="fin-empty-state">No scholarships linked to this student/invoice.</div>
              ) : (
                <div className="fin-stack-sm">
                  {detail.discounts.map((d) => (
                    <div key={d.id} className="fin-kv-box">
                      <div className="fin-row-between">
                        <strong>{formatMoney(d.amountPaise)}</strong>
                        <span className={statusBadgeClass(d.status)}>{d.status}</span>
                      </div>
                      <span className="fin-sub-text">{d.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="fin-card" aria-labelledby="inv-pay-heading">
            <div className="fin-card-header">
              <h2 id="inv-pay-heading">Linked Payments & Receipts</h2>
            </div>
            <DataTable
              rows={detail.payments}
              columns={paymentCols}
              getRowId={(r) => r.id}
              label="Invoice payments"
              emptyMessage="No payments applied specifically to this invoice yet."
            />
          </section>

          <Modal
            open={voidOpen}
            onClose={() => setVoidOpen(false)}
            returnFocusTo={voidBtnRef}
            title={`Void Invoice ${inv.invoiceNumber}`}
            subtitle="Reverses CHARGE posting via counter-entry; does not delete journal history"
          >
            <form onSubmit={handleVoid} className="fin-stack-md">
              <div className="fin-form-field">
                <label htmlFor={`${baseId}-void-reason`} className="fin-label">
                  Mandatory Void Reason
                </label>
                <textarea
                  id={`${baseId}-void-reason`}
                  className="fin-textarea"
                  placeholder="Superseded by revised scholarship invoice..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                />
              </div>
              <div className="fin-row-between">
                <button
                  type="button"
                  className="fin-btn fin-btn-secondary"
                  onClick={() => setVoidOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fin-btn fin-btn-danger" disabled={busy}>
                  {busy ? "Voiding..." : "Confirm Void & Post Reversal"}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
