"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";

interface PaymentItem {
  id: string;
  transactionNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  externalReference?: string;
  verificationStatus: string;
  notes?: string;
  studentProfile: {
    id: string;
    registrationNumber?: string;
    user: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  feeAgreement?: {
    agreementNumber: string;
    admission?: {
      course?: { code: string; title: string };
      targetBatch?: { code: string };
    };
  };
  collector?: { name: string };
  verifier?: { name: string };
  receipt?: { id: string; receiptNumber: string };
}

interface StudentOption {
  id: string;
  name: string;
  email: string;
  registrationNumber?: string;
  courseTitle?: string;
  feeAgreementId?: string;
}

export default function FinancierPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financier/payments?status=${statusFilter}`);
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/financier/installments");
      const data = await res.json();
      if (data.installments) {
        const uniqueStudentsMap = new Map<string, StudentOption>();
        for (const inst of data.installments) {
          if (!uniqueStudentsMap.has(inst.studentName)) {
            uniqueStudentsMap.set(inst.studentName, {
              id: inst.id, // placeholder mapping
              name: inst.studentName,
              email: inst.studentEmail,
              registrationNumber: inst.registrationNumber,
              courseTitle: inst.courseTitle,
            });
          }
        }
      }
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !paymentAmount || Number(paymentAmount) <= 0) {
      setActionMessage({ type: "error", text: "Please select a student and enter a valid positive payment amount." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/financier/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId: selectedStudentId,
          amount: parseFloat(paymentAmount),
          currency: "INR",
          paymentMethod,
          externalReference: externalReference || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment");
      }
      setActionMessage({
        type: "success",
        text: `Payment ${data.payment.transactionNumber} recorded in PENDING_VERIFICATION status.`,
      });
      setIsModalOpen(false);
      setSelectedStudentId("");
      setPaymentAmount("");
      setExternalReference("");
      setNotes("");
      fetchPayments();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async (id: string) => {
    if (!confirm("Are you sure you want to verify this payment? This will allocate installments, generate the official receipt, and record a financial credit in the ledger.")) {
      return;
    }

    setVerifyingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/financier/payments/${id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify payment");
      }
      setActionMessage({
        type: "success",
        text: `Payment verified successfully! Receipt #${data.receiptNumber} generated.`,
      });
      fetchPayments();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const student = p.studentProfile?.user?.name?.toLowerCase() || "";
    const regNo = p.studentProfile?.registrationNumber?.toLowerCase() || "";
    const txn = p.transactionNumber.toLowerCase();
    const query = searchTerm.toLowerCase();
    return student.includes(query) || regNo.includes(query) || txn.includes(query);
  });

  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apex.edu",
        role: "FINANCIER",
      }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Payment Transactions Ledger</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Record manual collections, verify settlement evidence, and issue official receipts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsModalOpen(true);
              loadStudents();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl border flex items-center justify-between shadow-sm text-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-2 -mr-1 rounded hover:bg-stone-100 text-stone-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#2A0F16]/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student, txn #, reg no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white text-stone-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>

          <button
            onClick={fetchPayments}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ledger Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">
            Loading payments ledger...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No payment transactions found matching the selected filter.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredPayments.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#2A0F16]">
                        {p.transactionNumber}
                      </p>
                      <h4 className="font-bold text-sm text-[#2A0F16] mt-0.5">
                        {p.studentProfile?.user?.name || "Student"}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {p.studentProfile?.registrationNumber || p.studentProfile?.user?.email}
                      </p>
                    </div>
                    <PaymentStatusBadge status={p.verificationStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Course</span>
                      <span className="font-medium text-stone-700 truncate block">
                        {p.feeAgreement?.admission?.course?.code || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Amount</span>
                      <span className="font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.amount} currency={p.currency} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Method</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-white border border-stone-200 font-mono text-[10px] font-semibold text-stone-700">
                          {p.paymentMethod}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Date</span>
                      <span className="text-stone-600">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {p.externalReference && (
                    <div className="text-[11px] text-stone-500 font-mono">
                      Ref: <span className="text-stone-700 font-semibold">{p.externalReference}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-1">
                    {p.verificationStatus === "PENDING_VERIFICATION" && (
                      <button
                        onClick={() => handleVerifyPayment(p.id)}
                        disabled={verifyingId === p.id}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition shadow-sm active:scale-[0.98]"
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{verifyingId === p.id ? "Verifying..." : "Verify & Confirm Payment"}</span>
                      </button>
                    )}
                    {p.verificationStatus === "CONFIRMED" && (
                      <a
                        href={`/api/receipts/${p.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl border border-[#6D1A2B]/20 text-[#6D1A2B] bg-[#FFFBF5] font-semibold text-xs hover:bg-[#F6EBCF]/40 transition"
                      >
                        <Receipt className="w-4 h-4 shrink-0" />
                        <span>View Official Receipt PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Txn #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method & Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#2A0F16]">
                        {p.transactionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2A0F16]">
                          {p.studentProfile?.user?.name || "Student"}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {p.studentProfile?.registrationNumber || p.studentProfile?.user?.email}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {p.feeAgreement?.admission?.course?.code || "—"}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.amount} currency={p.currency} />
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[10px] font-semibold">
                            {p.paymentMethod}
                          </span>
                          {p.externalReference && (
                            <span className="text-[10px] text-stone-400 font-mono truncate max-w-[100px]">
                              {p.externalReference}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={p.verificationStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.verificationStatus === "PENDING_VERIFICATION" && (
                            <button
                              onClick={() => handleVerifyPayment(p.id)}
                              disabled={verifyingId === p.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-[11px] transition shadow-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{verifyingId === p.id ? "Verifying..." : "Verify & Confirm"}</span>
                            </button>
                          )}
                          {p.verificationStatus === "CONFIRMED" && (
                            <a
                              href={`/api/receipts/${p.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D1A2B] hover:underline"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Receipt PDF</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#6D1A2B]" />
                <span>Record Manual Payment</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Student Account *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                  required
                >
                  <option value="">Choose enrolled student...</option>
                  {Array.from(new Set(payments.map((p) => p.studentProfile?.id))).map((profileId) => {
                    const match = payments.find((p) => p.studentProfile?.id === profileId);
                    return (
                      <option key={profileId} value={profileId}>
                        {match?.studentProfile?.user?.name} (
                        {match?.studentProfile?.registrationNumber || match?.studentProfile?.user?.email})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  Or paste Student Profile ID if first payment.
                </p>
                <input
                  type="text"
                  placeholder="Or enter Student Profile ID directly"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Amount (INR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 10000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Debit/Credit Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  External Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Bank UTR Number"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Verification details, collection counter, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Payments will be created with <strong>Pending Verification</strong> status. You can verify and confirm it in the next step to release official receipts and update student installment balances.
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
