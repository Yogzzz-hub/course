import { useEffect, useId, useState, type FormEvent } from "react";
import { parseRupeesToPaise } from "../../../backend/services/financier/money";
import type {
  InvoiceRecord,
  PaymentMethod,
} from "../../../backend/services/financier/types";
import { Modal, useToast } from "../shared";
import {
  financierApi,
  FinancierApiError,
  type FinancierSummaryResponse,
} from "./api";
import { formatMoney } from "./formatters";

export interface PaymentDrawerProps {
  open: boolean;
  onClose: () => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  students: FinancierSummaryResponse["students"];
  invoices: InvoiceRecord[];
  initialStudentId?: string;
  initialInvoiceId?: string;
  onPaymentRecorded: () => Promise<void> | void;
}

export function PaymentDrawer({
  open,
  onClose,
  returnFocusTo,
  students,
  invoices,
  initialStudentId,
  initialInvoiceId,
  onPaymentRecorded,
}: PaymentDrawerProps) {
  const { showToast } = useToast();
  const baseId = useId();
  const [studentId, setStudentId] = useState(initialStudentId || students[0]?.id || "");
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [rupeesInput, setRupeesInput] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    const defaultStu = initialStudentId || students[0]?.id || "";
    setStudentId(defaultStu);
    setInvoiceId(initialInvoiceId || "");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setExternalReference("");
    setNotes("");

    if (initialInvoiceId) {
      const targetInv = invoices.find((i) => i.id === initialInvoiceId);
      if (targetInv) {
        const unpaid = Math.max(0, targetInv.netTotalPaise - targetInv.paidAmountPaise);
        setRupeesInput(unpaid > 0 ? (unpaid / 100).toFixed(2) : "");
        return;
      }
    }
    setRupeesInput("");
  }, [open, initialStudentId, initialInvoiceId, students, invoices]);

  const studentInvoices = invoices.filter(
    (inv) =>
      inv.studentProfileId === studentId &&
      inv.status !== "VOID" &&
      inv.status !== "DRAFT" &&
      inv.netTotalPaise > inv.paidAmountPaise
  );

  const selectedStudent = students.find((s) => s.id === studentId);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    const amountPaise = parseRupeesToPaise(rupeesInput, false);
    if (!amountPaise || amountPaise <= 0) {
      setErrorMsg("Enter a valid positive amount in INR (up to 2 decimal places).");
      return;
    }

    if (externalReference.trim().length < 3) {
      setErrorMsg("External reference / UTR / transaction number must be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const isoDate = paymentDate.includes("T")
        ? paymentDate
        : `${paymentDate}T12:00:00.000Z`;
      const res = await financierApi.recordPayment({
        studentProfileId: studentId,
        invoiceId: invoiceId || null,
        amountPaise,
        paymentMethod,
        paymentDate: isoDate,
        externalReference: externalReference.trim(),
        notes: notes.trim() || null,
      });

      showToast({
        title: `Receipt ${res.payment.receiptNumber} issued`,
        description: `${formatMoney(res.payment.amountPaise)} allocated oldest-first (${res.payment.allocations.length} instalment${res.payment.allocations.length === 1 ? "" : "s"}).`,
        tone: "success",
      });
      await onPaymentRecorded();
      onClose();
    } catch (err) {
      if (err instanceof FinancierApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Unable to record payment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      returnFocusTo={returnFocusTo}
      title="Record Fee Payment"
      subtitle="Strict integer paise · Oldest unpaid instalment first · Idempotent reference check"
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} className="fin-stack-md">
        {errorMsg && (
          <div className="fin-alert fin-alert--danger" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="fin-form-field">
          <label htmlFor={`${baseId}-student`} className="fin-label">
            Student Fee Account
          </label>
          <select
            id={`${baseId}-student`}
            className="fin-select"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setInvoiceId("");
            }}
            required
          >
            {students.map((stu) => (
              <option key={stu.id} value={stu.id}>
                {stu.name} ({stu.registrationNumber}) — Due {formatMoney(stu.outstandingPaise)}
              </option>
            ))}
          </select>
          {selectedStudent && (
            <span className="fin-field-hint">
              Batch {selectedStudent.batchCode} · Outstanding billed:{" "}
              {formatMoney(selectedStudent.outstandingPaise)}
            </span>
          )}
        </div>

        <div className="fin-form-field">
          <label htmlFor={`${baseId}-invoice`} className="fin-label">
            Apply Against Invoice (Optional)
          </label>
          <select
            id={`${baseId}-invoice`}
            className="fin-select"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          >
            <option value="">Auto-allocate to student account (oldest invoice/instalment)</option>
            {studentInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — Balance{" "}
                {formatMoney(inv.netTotalPaise - inv.paidAmountPaise)} ({inv.status})
              </option>
            ))}
          </select>
        </div>

        <div className="fin-form-grid">
          <div className="fin-form-field">
            <label htmlFor={`${baseId}-method`} className="fin-label">
              Payment Method
            </label>
            <select
              id={`${baseId}-method`}
              className="fin-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
              <option value="CARD">Card Settlement</option>
              <option value="CASH">Cash Counter</option>
            </select>
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-amount`} className="fin-label">
              Amount (INR)
            </label>
            <input
              id={`${baseId}-amount`}
              type="text"
              inputMode="decimal"
              className="fin-input"
              placeholder="e.g. 15000.00"
              value={rupeesInput}
              onChange={(e) => setRupeesInput(e.target.value)}
              required
            />
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-ref`} className="fin-label">
              Payment Reference / UTR
            </label>
            <input
              id={`${baseId}-ref`}
              type="text"
              className="fin-input"
              placeholder="e.g. UTR-UPI-2026-991"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              required
            />
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-date`} className="fin-label">
              Settlement Date
            </label>
            <input
              id={`${baseId}-date`}
              type="date"
              className="fin-input"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="fin-form-field">
          <label htmlFor={`${baseId}-notes`} className="fin-label">
            Internal Remittance Notes (Optional)
          </label>
          <textarea
            id={`${baseId}-notes`}
            className="fin-textarea"
            placeholder="Counterfoil details, bank branch, or payer name..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="fin-alert fin-alert--warning">
          <span>
            Duplicate external references are automatically blocked (HTTP 409). Every
            posted payment writes a balanced general ledger entry, receipt record, and
            audit log atomically.
          </span>
        </div>

        <div className="fin-row-between">
          <button
            type="button"
            className="fin-btn fin-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="fin-btn fin-btn-primary" disabled={submitting}>
            {submitting ? "Posting Payment..." : "Post Payment & Generate Receipt"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
