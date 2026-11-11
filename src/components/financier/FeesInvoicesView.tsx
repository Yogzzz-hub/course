import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Download,
  Mail,
  Percent,
  Plus,
  XCircle,
} from "lucide-react";
import { parseRupeesToPaise } from "../../../backend/services/financier/money";
import type {
  ActorIdentity,
  DiscountRequestRecord,
  InvoiceRecord,
  InvoiceStatus,
} from "../../../backend/services/financier/types";
import { DataTable, Modal, useToast, type SharedTableColumn } from "../shared";
import {
  financierApi,
  FinancierApiError,
  type FinancierSummaryResponse,
} from "./api";
import { formatMoney, formatShortDate, invoiceBadgeClass, statusBadgeClass } from "./formatters";

export interface FeesInvoicesViewProps {
  actor: ActorIdentity;
  students: FinancierSummaryResponse["students"];
  batches: FinancierSummaryResponse["batches"];
  invoices: InvoiceRecord[];
  discounts: DiscountRequestRecord[];
  onRefresh: () => Promise<void>;
}

export function FeesInvoicesView({
  actor,
  students,
  batches,
  invoices,
  discounts,
  onRefresh,
}: FeesInvoicesViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const baseId = useId();
  const createBtnRef = useRef<HTMLButtonElement | null>(null);
  const discBtnRef = useRef<HTMLButtonElement | null>(null);

  const [activeTab, setActiveTab] = useState<"invoices" | "students" | "discounts">("invoices");
  const [statusFilter, setStatusFilter] = useState<"ALL" | InvoiceStatus>("ALL");

  // Create Invoice Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [invMode, setInvMode] = useState<"STUDENT" | "BATCH">("STUDENT");
  const [invStudentId, setInvStudentId] = useState(students[0]?.id || "");
  const [invBatchId, setInvBatchId] = useState(batches[0]?.id || "");
  const [invAmountRupees, setInvAmountRupees] = useState("30000.00");
  const [invDiscountRupees, setInvDiscountRupees] = useState("0");
  const [invDueDate, setInvDueDate] = useState("2026-12-15");
  const [invStatus, setInvStatus] = useState<"DRAFT" | "SENT">("SENT");
  const [invDescription, setInvDescription] = useState("");
  const [invBusy, setInvBusy] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Discount Request Modal
  const [discOpen, setDiscOpen] = useState(false);
  const [discStudentId, setDiscStudentId] = useState(students[0]?.id || "");
  const [discKind, setDiscKind] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discValueInput, setDiscValueInput] = useState("5000.00");
  const [discReason, setDiscReason] = useState("");
  const [discBusy, setDiscBusy] = useState(false);
  const [discError, setDiscError] = useState<string | null>(null);

  // Decision Modal for Discounts
  const [decideTarget, setDecideTarget] = useState<{
    discount: DiscountRequestRecord;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decideBusy, setDecideBusy] = useState(false);

  const filteredInvoices = useMemo(
    () =>
      statusFilter === "ALL"
        ? invoices
        : invoices.filter((inv) => inv.status === statusFilter),
    [invoices, statusFilter]
  );

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    setInvError(null);
    const amountPaise = parseRupeesToPaise(invAmountRupees, false);
    if (!amountPaise || amountPaise <= 0) {
      setInvError("Gross tuition amount must be a positive INR amount.");
      return;
    }
    const discountPaise =
      invDiscountRupees.trim() === "" || invDiscountRupees.trim() === "0"
        ? 0
        : (parseRupeesToPaise(invDiscountRupees, false) ?? -1);
    if (discountPaise < 0) {
      setInvError("Discount must be zero or a positive INR amount.");
      return;
    }

    setInvBusy(true);
    try {
      const res = await financierApi.createInvoices({
        mode: invMode,
        studentProfileId: invMode === "STUDENT" ? invStudentId : undefined,
        batchId: invMode === "BATCH" ? invBatchId : undefined,
        dueDate: `${invDueDate}T12:00:00.000Z`,
        status: invStatus,
        description: invDescription.trim() || undefined,
        amountPaise,
        discountPaise,
      });
      showToast({
        title: `Created ${res.count} invoice${res.count === 1 ? "" : "s"}`,
        description: res.invoices.map((i) => i.invoiceNumber).join(", "),
        tone: "success",
      });
      setCreateOpen(false);
      await onRefresh();
    } catch (err) {
      setInvError(err instanceof Error ? err.message : "Failed to create invoice.");
    } finally {
      setInvBusy(false);
    }
  };

  const handleRequestDiscount = async (e: FormEvent) => {
    e.preventDefault();
    setDiscError(null);
    if (discReason.trim().length < 5) {
      setDiscError("Reason must be at least 5 characters.");
      return;
    }

    let amountPaise: number | null = null;
    let basisPoints: number | null = null;
    if (discKind === "FIXED") {
      amountPaise = parseRupeesToPaise(discValueInput, false);
      if (!amountPaise || amountPaise <= 0) {
        setDiscError("Enter a valid fixed waiver amount in INR.");
        return;
      }
    } else {
      const pct = Number(discValueInput);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 50) {
        setDiscError("Percentage scholarship must be between 1% and 50%.");
        return;
      }
      basisPoints = Math.round(pct * 100);
    }

    setDiscBusy(true);
    try {
      await financierApi.requestDiscount({
        studentProfileId: discStudentId,
        kind: discKind,
        amountPaise,
        basisPoints,
        reason: discReason.trim(),
      });
      showToast({
        title: "Scholarship request logged",
        description: "Awaiting approval from a second Finance / Admin officer.",
        tone: "success",
      });
      setDiscOpen(false);
      setDiscReason("");
      await onRefresh();
    } catch (err) {
      setDiscError(err instanceof Error ? err.message : "Failed to submit discount request.");
    } finally {
      setDiscBusy(false);
    }
  };

  const handleDecideDiscount = async (e: FormEvent) => {
    e.preventDefault();
    if (!decideTarget) return;
    setDecideBusy(true);
    try {
      await financierApi.decideDiscount(decideTarget.discount.id, {
        decision: decideTarget.decision,
        decisionNotes: decisionNotes.trim() || `${decideTarget.decision} after review.`,
      });
      showToast({
        title: `Discount ${decideTarget.decision.toLowerCase()}`,
        tone: decideTarget.decision === "APPROVED" ? "success" : "warning",
      });
      setDecideTarget(null);
      setDecisionNotes("");
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Decision blocked",
        description:
          err instanceof FinancierApiError ? err.message : "Could not process discount decision.",
        tone: "danger",
      });
    } finally {
      setDecideBusy(false);
    }
  };

  const handleSendEmail = async (inv: InvoiceRecord) => {
    try {
      const res = await financierApi.sendInvoiceEmail(inv.id);
      showToast({
        title: `Email dispatched (${res.notification.status})`,
        description: `Sent ${inv.invoiceNumber} to ${inv.studentEmail}`,
        tone: "success",
      });
      await onRefresh();
    } catch (err) {
      showToast({
        title: "Email failed",
        description: err instanceof Error ? err.message : "Failed to send invoice email.",
        tone: "danger",
      });
    }
  };

  const handleDownloadPdf = async (inv: InvoiceRecord) => {
    try {
      await financierApi.downloadInvoicePdf(inv);
      showToast({ title: `Downloaded ${inv.invoiceNumber}.pdf`, tone: "success" });
    } catch (err) {
      showToast({
        title: "PDF export failed",
        description: err instanceof Error ? err.message : "Unable to download PDF.",
        tone: "danger",
      });
    }
  };

  const invoiceColumns: SharedTableColumn<InvoiceRecord>[] = [
    {
      id: "number",
      label: "Invoice #",
      sortValue: (r) => r.invoiceNumber,
      searchValue: (r) => `${r.invoiceNumber} ${r.studentName} ${r.batchCode}`,
      render: (r) => (
        <div>
          <strong className="fin-mono">{r.invoiceNumber}</strong>
          <div className="fin-sub-text">Issued {formatShortDate(r.issueDate)}</div>
        </div>
      ),
    },
    {
      id: "student",
      label: "Student & Batch",
      sortValue: (r) => r.studentName,
      searchValue: (r) => `${r.studentName} ${r.registrationNumber} ${r.batchCode}`,
      render: (r) => (
        <div>
          <div>{r.studentName}</div>
          <div className="fin-sub-text">
            {r.registrationNumber} · {r.batchCode}
          </div>
        </div>
      ),
    },
    {
      id: "dueDate",
      label: "Due Date",
      sortValue: (r) => r.dueDate,
      render: (r) => formatShortDate(r.dueDate),
    },
    {
      id: "netTotal",
      label: "Net Total",
      numeric: true,
      sortValue: (r) => r.netTotalPaise,
      render: (r) => formatMoney(r.netTotalPaise),
    },
    {
      id: "balance",
      label: "Unpaid Balance",
      numeric: true,
      sortValue: (r) => Math.max(0, r.netTotalPaise - r.paidAmountPaise),
      render: (r) => formatMoney(Math.max(0, r.netTotalPaise - r.paidAmountPaise)),
    },
    {
      id: "status",
      label: "Status",
      sortValue: (r) => r.status,
      render: (r) => <span className={invoiceBadgeClass(r.status)}>{r.status}</span>,
    },
    {
      id: "actions",
      label: "Actions",
      render: (r) => (
        <div className="fin-row-wrap">
          <button
            type="button"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            onClick={() => handleDownloadPdf(r)}
            aria-label={`Download PDF for ${r.invoiceNumber}`}
          >
            <Download size={13} aria-hidden="true" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-secondary fin-btn-sm"
            disabled={r.status === "VOID"}
            onClick={() => handleSendEmail(r)}
            aria-label={`Send email for ${r.invoiceNumber}`}
          >
            <Mail size={13} aria-hidden="true" />
            <span>Email</span>
          </button>
        </div>
      ),
    },
  ];

  const studentColumns: SharedTableColumn<FinancierSummaryResponse["students"][number]>[] = [
    {
      id: "name",
      label: "Student",
      sortValue: (r) => r.name,
      searchValue: (r) => `${r.name} ${r.registrationNumber} ${r.email}`,
      render: (r) => (
        <div>
          <strong>{r.name}</strong>
          <div className="fin-sub-text">
            {r.registrationNumber} · {r.batchCode}
          </div>
        </div>
      ),
    },
    {
      id: "courseFee",
      label: "Tuition",
      numeric: true,
      sortValue: (r) => r.courseFeePaise,
      render: (r) => formatMoney(r.courseFeePaise),
    },
    {
      id: "discount",
      label: "Discount",
      numeric: true,
      sortValue: (r) => r.approvedDiscountPaise,
      render: (r) => formatMoney(r.approvedDiscountPaise),
    },
    {
      id: "paid",
      label: "Paid",
      numeric: true,
      sortValue: (r) => r.totalPaidPaise,
      render: (r) => formatMoney(r.totalPaidPaise),
    },
    {
      id: "outstanding",
      label: "Balance Due",
      numeric: true,
      sortValue: (r) => r.outstandingPaise,
      render: (r) => (
        <span className={statusBadgeClass(r.outstandingPaise > 0 ? "OVERDUE" : "PAID")}>
          {formatMoney(r.outstandingPaise)}
        </span>
      ),
    },
    {
      id: "instalments",
      label: "Instalments",
      sortValue: (r) => r.overdueInstallmentsCount,
      render: (r) => (
        <span>
          {r.installmentCount} total ({r.overdueInstallmentsCount} overdue)
        </span>
      ),
    },
  ];

  const discountColumns: SharedTableColumn<DiscountRequestRecord>[] = [
    {
      id: "student",
      label: "Student & Reason",
      sortValue: (r) => r.studentName,
      searchValue: (r) => `${r.studentName} ${r.reason} ${r.requestedByName}`,
      render: (r) => (
        <div>
          <strong>{r.studentName}</strong>
          <div className="fin-sub-text">{r.reason}</div>
        </div>
      ),
    },
    {
      id: "amount",
      label: "Concession",
      numeric: true,
      sortValue: (r) => r.amountPaise,
      render: (r) => (
        <div>
          <strong>{formatMoney(r.amountPaise)}</strong>
          <div className="fin-sub-text">
            {r.kind === "PERCENTAGE" && r.basisPoints
              ? `${(r.basisPoints / 100).toFixed(2)}% scholarship`
              : "Fixed fee waiver"}
          </div>
        </div>
      ),
    },
    {
      id: "requester",
      label: "Requested By",
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
      label: "Dual-Control Status",
      sortValue: (r) => r.status,
      render: (r) => (
        <div>
          <span className={statusBadgeClass(r.status)}>{r.status}</span>
          {r.approvedByName && (
            <div className="fin-sub-text">By {r.approvedByName}</div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      label: "Decision",
      render: (r) => {
        if (r.status !== "PENDING") {
          return <span className="fin-sub-text">{r.decisionNotes || "Finalized"}</span>;
        }
        const isSelf = r.requestedById === actor.id;
        return (
          <div className="fin-row-wrap">
            <button
              type="button"
              className="fin-btn fin-btn-primary fin-btn-sm"
              disabled={isSelf}
              title={isSelf ? "Dual-control requires a different approver" : undefined}
              onClick={() => {
                setDecisionNotes("");
                setDecideTarget({ discount: r, decision: "APPROVED" });
              }}
            >
              <CheckCircle size={13} aria-hidden="true" />
              <span>{isSelf ? "Self-Approval Blocked" : "Approve"}</span>
            </button>
            <button
              type="button"
              className="fin-btn fin-btn-danger fin-btn-sm"
              disabled={isSelf}
              onClick={() => {
                setDecisionNotes("");
                setDecideTarget({ discount: r, decision: "REJECTED" });
              }}
            >
              <XCircle size={13} aria-hidden="true" />
              <span>Reject</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="fin-stack-lg">
      <div className="fin-page-header">
        <div>
          <h1>Fees, Invoices & Scholarships</h1>
          <p>
            Manage single-student or batch tuition invoicing, Brevo email dispatch, binary
            invoice PDFs, and dual-control concessions.
          </p>
        </div>
        <div className="fin-page-header-actions">
          <button
            ref={discBtnRef}
            type="button"
            className="fin-btn fin-btn-secondary"
            onClick={() => setDiscOpen(true)}
          >
            <Percent size={15} aria-hidden="true" />
            <span>Request Discount / Scholarship</span>
          </button>
          <button
            ref={createBtnRef}
            type="button"
            className="fin-btn fin-btn-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      <div className="fin-tabs" role="tablist" aria-label="Fees and invoicing sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "invoices"}
          className="fin-tab-btn"
          onClick={() => setActiveTab("invoices")}
        >
          Invoices ({invoices.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "students"}
          className="fin-tab-btn"
          onClick={() => setActiveTab("students")}
        >
          Student Fee Accounts ({students.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "discounts"}
          className="fin-tab-btn"
          onClick={() => setActiveTab("discounts")}
        >
          Discounts & Scholarships ({discounts.filter((d) => d.status === "PENDING").length} pending)
        </button>
      </div>

      {activeTab === "invoices" && (
        <section className="fin-card" aria-label="Tuition invoices table">
          <DataTable
            rows={filteredInvoices}
            columns={invoiceColumns}
            getRowId={(r) => r.id}
            label="Invoices"
            onRowOpen={(inv) => navigate(`/financier/invoices/${inv.id}`)}
            toolbarExtra={
              <div className="fin-row-wrap" role="group" aria-label="Filter invoices by status">
                {(["ALL", "DRAFT", "SENT", "OVERDUE", "PAID", "VOID"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={
                      statusFilter === st
                        ? "fin-btn fin-btn-primary fin-btn-sm"
                        : "fin-btn fin-btn-secondary fin-btn-sm"
                    }
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            }
          />
        </section>
      )}

      {activeTab === "students" && (
        <section className="fin-card" aria-label="Student fee accounts table">
          <DataTable
            rows={students}
            columns={studentColumns}
            getRowId={(r) => r.id}
            label="Student fee accounts"
            onRowOpen={(stu) => navigate(`/financier/students/${stu.id}`)}
          />
        </section>
      )}

      {activeTab === "discounts" && (
        <section className="fin-card" aria-label="Discounts and scholarships approvals">
          <DataTable
            rows={discounts}
            columns={discountColumns}
            getRowId={(r) => r.id}
            label="Discounts and scholarships"
          />
        </section>
      )}

      {/* Create Invoice Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        returnFocusTo={createBtnRef}
        title="Create Tuition Invoice"
        subtitle="Issue to an individual student or generate across every student in a batch"
      >
        <form onSubmit={handleCreateInvoice} className="fin-stack-md">
          {invError && (
            <div className="fin-alert fin-alert--danger" role="alert">
              <span>{invError}</span>
            </div>
          )}

          <div className="fin-form-grid">
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-mode`} className="fin-label">
                Billing Scope
              </label>
              <select
                id={`${baseId}-mode`}
                className="fin-select"
                value={invMode}
                onChange={(e) => setInvMode(e.target.value as "STUDENT" | "BATCH")}
              >
                <option value="STUDENT">Single Student</option>
                <option value="BATCH">Entire Batch Cohort</option>
              </select>
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-status`} className="fin-label">
                Initial Status
              </label>
              <select
                id={`${baseId}-status`}
                className="fin-select"
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value as "DRAFT" | "SENT")}
              >
                <option value="SENT">SENT (Posts GL Receivable Charge)</option>
                <option value="DRAFT">DRAFT (No GL posting until sent)</option>
              </select>
            </div>

            {invMode === "STUDENT" ? (
              <div className="fin-form-field fin-form-field--full">
                <label htmlFor={`${baseId}-stu`} className="fin-label">
                  Student
                </label>
                <select
                  id={`${baseId}-stu`}
                  className="fin-select"
                  value={invStudentId}
                  onChange={(e) => setInvStudentId(e.target.value)}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.registrationNumber} · {s.batchCode})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="fin-form-field fin-form-field--full">
                <label htmlFor={`${baseId}-batch`} className="fin-label">
                  Target Batch
                </label>
                <select
                  id={`${baseId}-batch`}
                  className="fin-select"
                  value={invBatchId}
                  onChange={(e) => setInvBatchId(e.target.value)}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.trackTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-amt`} className="fin-label">
                Gross Tuition Amount (INR)
              </label>
              <input
                id={`${baseId}-amt`}
                type="text"
                inputMode="decimal"
                className="fin-input"
                value={invAmountRupees}
                onChange={(e) => setInvAmountRupees(e.target.value)}
                required
              />
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-disc`} className="fin-label">
                Applied Scholarship (INR)
              </label>
              <input
                id={`${baseId}-disc`}
                type="text"
                inputMode="decimal"
                className="fin-input"
                value={invDiscountRupees}
                onChange={(e) => setInvDiscountRupees(e.target.value)}
              />
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-due`} className="fin-label">
                Due Date
              </label>
              <input
                id={`${baseId}-due`}
                type="date"
                className="fin-input"
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
                required
              />
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-desc`} className="fin-label">
                Line Item Description (Optional)
              </label>
              <input
                id={`${baseId}-desc`}
                type="text"
                className="fin-input"
                placeholder="e.g. Term 2 Tuition Instalment"
                value={invDescription}
                onChange={(e) => setInvDescription(e.target.value)}
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
            <button type="submit" className="fin-btn fin-btn-primary" disabled={invBusy}>
              {invBusy ? "Generating..." : "Create Invoice(s)"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Request Discount Modal */}
      <Modal
        open={discOpen}
        onClose={() => setDiscOpen(false)}
        returnFocusTo={discBtnRef}
        title="Request Fee Discount / Scholarship"
        subtitle="Requires justification reason and approval by a different officer"
      >
        <form onSubmit={handleRequestDiscount} className="fin-stack-md">
          {discError && (
            <div className="fin-alert fin-alert--danger" role="alert">
              <span>{discError}</span>
            </div>
          )}

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-d-stu`} className="fin-label">
              Student
            </label>
            <select
              id={`${baseId}-d-stu`}
              className="fin-select"
              value={discStudentId}
              onChange={(e) => setDiscStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registrationNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="fin-form-grid">
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-d-kind`} className="fin-label">
                Discount Type
              </label>
              <select
                id={`${baseId}-d-kind`}
                className="fin-select"
                value={discKind}
                onChange={(e) => setDiscKind(e.target.value as "FIXED" | "PERCENTAGE")}
              >
                <option value="FIXED">Fixed INR Waiver</option>
                <option value="PERCENTAGE">Percentage Scholarship (%)</option>
              </select>
            </div>

            <div className="fin-form-field">
              <label htmlFor={`${baseId}-d-val`} className="fin-label">
                {discKind === "FIXED" ? "Amount (INR)" : "Percentage (1-50%)"}
              </label>
              <input
                id={`${baseId}-d-val`}
                type="text"
                inputMode="decimal"
                className="fin-input"
                value={discValueInput}
                onChange={(e) => setDiscValueInput(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="fin-form-field">
            <label htmlFor={`${baseId}-d-reason`} className="fin-label">
              Mandatory Reason
            </label>
            <textarea
              id={`${baseId}-d-reason`}
              className="fin-textarea"
              placeholder="Academic merit award, financial hardship committee memo..."
              value={discReason}
              onChange={(e) => setDiscReason(e.target.value)}
              required
            />
          </div>

          <div className="fin-row-between">
            <button
              type="button"
              className="fin-btn fin-btn-secondary"
              onClick={() => setDiscOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="fin-btn fin-btn-primary" disabled={discBusy}>
              {discBusy ? "Submitting..." : "Submit Discount Request"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Decide Discount Modal */}
      <Modal
        open={Boolean(decideTarget)}
        onClose={() => setDecideTarget(null)}
        title={
          decideTarget?.decision === "APPROVED"
            ? "Approve Discount Request"
            : "Reject Discount Request"
        }
        subtitle="Posts FEE_DISCOUNT / STUDENT_RECEIVABLES GL journal upon approval"
      >
        {decideTarget && (
          <form onSubmit={handleDecideDiscount} className="fin-stack-md">
            <p>
              {decideTarget.decision === "APPROVED" ? "Approving" : "Rejecting"}{" "}
              <strong>{formatMoney(decideTarget.discount.amountPaise)}</strong> for{" "}
              <strong>{decideTarget.discount.studentName}</strong> (requested by{" "}
              {decideTarget.discount.requestedByName}).
            </p>
            <div className="fin-form-field">
              <label htmlFor={`${baseId}-dec-notes`} className="fin-label">
                Decision Notes
              </label>
              <textarea
                id={`${baseId}-dec-notes`}
                className="fin-textarea"
                placeholder="Audit note confirming verification..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                required
              />
            </div>
            <div className="fin-row-between">
              <button
                type="button"
                className="fin-btn fin-btn-secondary"
                onClick={() => setDecideTarget(null)}
              >
                Cancel
              </button>
              <button type="submit" className="fin-btn fin-btn-primary" disabled={decideBusy}>
                {decideBusy ? "Posting..." : `Confirm ${decideTarget.decision}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
