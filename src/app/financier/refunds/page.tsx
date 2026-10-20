"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";

interface RefundRequestItem {
  id: string;
  requestedAmount: number;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  requester?: { name: string };
  reviewer?: { name: string };
  studentProfile?: {
    id: string;
    registrationNumber?: string;
    user: { name: string; email: string };
  };
  studentPayment?: {
    transactionNumber: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  };
  refund?: {
    id: string;
    refundNumber: string;
    status: string;
    executedAt: string;
  };
}

export default function FinancierRefundsPage() {
  const [refundRequests, setRefundRequests] = useState<RefundRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [targetPaymentId, setTargetPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financier/refunds");
      const data = await res.json();
      if (data.refundRequests) {
        setRefundRequests(data.refundRequests);
      }
    } catch (e) {
      console.error("Failed to load refunds:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRefundRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPaymentId || !refundAmount || Number(refundAmount) <= 0 || !refundReason) {
      setActionMessage({ type: "error", text: "Please enter all required refund request fields." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/financier/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentPaymentId: targetPaymentId,
          requestedAmount: parseFloat(refundAmount),
          reason: refundReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit refund request");
      }
      setActionMessage({
        type: "success",
        text: "Refund request submitted for Admin review. Admin approval is required before execution.",
      });
      setIsModalOpen(false);
      setTargetPaymentId("");
      setRefundAmount("");
      setRefundReason("");
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteRefund = async (requestId: string) => {
    if (!confirm("Confirm execution of this Admin-approved refund? The student installment debt will be restored and a debit ledger entry will be posted.")) {
      return;
    }

    setExecutingId(requestId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/financier/refunds/${requestId}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute refund");
      }
      setActionMessage({
        type: "success",
        text: `Refund executed successfully. Refund #${data.refundNumber} confirmed.`,
      });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apex.edu",
        role: "FINANCIER",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Refunds & Adjustments Center</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Strict separation of duty: submit refund requests for Admin approval, and execute approved disbursements.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Request Refund</span>
        </button>
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

      {/* Governance Notice */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#F6EBCF]/60 border border-[#C9A24B]/40 text-xs text-[#2A0F16] flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#6D1A2B] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#6D1A2B] block">
            Financial Dual-Control Authorization Rule
          </span>
          <p className="text-stone-700 mt-0.5 leading-relaxed">
            Financiers cannot independently disburse refunds or alter collected student revenue without documented Admin approval. Once an Admin reviews and approves a request in the Admin Financial Approval Center, the Financier executes the payout settlement here.
          </p>
        </div>
      </div>

      {/* Requests Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2A0F16]">Refund Requests & Executions</h2>
          <button
            onClick={loadData}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading refund queue...</div>
        ) : refundRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No refund requests found. Use &quot;Request Refund&quot; to initiate a request.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {refundRequests.map((r) => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#2A0F16]">
                        {r.studentProfile?.user?.name || "Student"}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {r.studentProfile?.registrationNumber || r.studentProfile?.user?.email}
                      </p>
                    </div>
                    <PaymentStatusBadge status={r.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Txn Ref</span>
                      <span className="font-mono text-stone-700 truncate block">
                        {r.studentPayment?.transactionNumber || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Amount</span>
                      <span className="font-bold text-[#6D1A2B] text-sm">
                        <MoneyDisplay amount={r.requestedAmount} />
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
                    <span className="font-semibold text-stone-700 block text-[11px] mb-0.5">Reason:</span>
                    {r.reason}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                    <span>Requested by {r.requester?.name || "Financier"}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Execution Action Button */}
                  {r.status === "APPROVED" && (
                    <div className="pt-1">
                      <button
                        onClick={() => handleExecuteRefund(r.id)}
                        disabled={executingId === r.id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>{executingId === r.id ? "Executing Disbursement..." : "Execute Approved Refund"}</span>
                      </button>
                    </div>
                  )}
                  {r.status === "REQUESTED" && (
                    <div className="text-[11px] text-amber-700 italic flex items-center justify-center gap-1.5 py-1 bg-amber-50 rounded-lg">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Awaiting Admin Financial Approval</span>
                    </div>
                  )}
                  {r.status === "CONFIRMED" && (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1.5 py-1 bg-emerald-50 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Disbursement Executed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Original Txn</th>
                    <th className="py-3 px-4">Requested Amt</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Review Status</th>
                    <th className="py-3 px-4 text-right">Execution Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {refundRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2A0F16]">
                          {r.studentProfile?.user?.name || "Student"}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          {r.studentProfile?.registrationNumber || r.studentProfile?.user?.email}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-stone-600">
                        {r.studentPayment?.transactionNumber || "—"}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={r.requestedAmount} />
                      </td>
                      <td className="py-3 px-4 text-stone-600 max-w-[200px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {r.requester?.name || "Financier"}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === "APPROVED" && (
                          <button
                            onClick={() => handleExecuteRefund(r.id)}
                            disabled={executingId === r.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-[11px] shadow-xs transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{executingId === r.id ? "Executing..." : "Execute Refund"}</span>
                          </button>
                        )}
                        {r.status === "REQUESTED" && (
                          <span className="text-[11px] text-amber-700 italic flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Awaiting Admin</span>
                          </span>
                        )}
                        {r.status === "CONFIRMED" && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Disbursed</span>
                          </span>
                        )}
                        {r.status === "REJECTED" && (
                          <span className="text-[11px] text-rose-600 font-medium">Rejected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Request Refund */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#6D1A2B]" />
                <span>Submit Refund Request</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRefundRequest} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Payment Transaction ID / Number *
                </label>
                <input
                  type="text"
                  placeholder="Paste StudentPayment ID or Transaction #"
                  value={targetPaymentId}
                  onChange={(e) => setTargetPaymentId(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Refund Amount (INR) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Detailed Reason & Justification *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this refund is being issued (e.g. course cancellation, concession adjustment)..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
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
                  {submitting ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
