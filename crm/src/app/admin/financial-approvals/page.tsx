"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
} from "lucide-react";

interface ApprovalRequestItem {
  id: string;
  requestType: string;
  targetRecordId: string;
  targetRecordType: string;
  requestedAmount?: number;
  currency: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  requester: { name: string; role: string };
  reviewer?: { name: string };
}

export default function AdminFinancialApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestItem | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filterType, setFilterType] = useState("ALL");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/financial-approvals");
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.error("Failed to load financial approvals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleOpenDecision = (req: ApprovalRequestItem, decision: "APPROVED" | "REJECTED") => {
    setSelectedRequest(req);
    setDecisionType(decision);
    setReviewNotes("");
    setDecisionModalOpen(true);
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/financial-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequest.id,
          decision: decisionType,
          reviewNotes: reviewNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision");
      }
      setActionMessage({
        type: "success",
        text: `Request #${selectedRequest.id.slice(-6)} marked as ${decisionType}.`,
      });
      setDecisionModalOpen(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (filterType === "PENDING") return r.status === "PENDING";
    if (filterType === "DECIDED") return r.status !== "PENDING";
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <AppShell
      user={{
        name: "Admin",
        email: "admin@apex.edu",
        role: "ADMIN",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2A0F16]">Financial Approval Center</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Sole administrative authority for student fee concessions, refunds, trainer payroll releases, and adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
              {pendingCount} Pending Review
            </span>
          )}
          <button
            onClick={loadRequests}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 active:scale-95 transition-transform"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm text-xs ${
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
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-500"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2A0F16]/10 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterType("ALL")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap flex items-center ${
            filterType === "ALL"
              ? "bg-[#6D1A2B] text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          All Requests ({requests.length})
        </button>
        <button
          onClick={() => setFilterType("PENDING")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap flex items-center ${
            filterType === "PENDING"
              ? "bg-[#6D1A2B] text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Pending Only ({pendingCount})
        </button>
        <button
          onClick={() => setFilterType("DECIDED")}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap flex items-center ${
            filterType === "DECIDED"
              ? "bg-[#6D1A2B] text-white shadow-sm"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Decided History
        </button>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading approval queue...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No financial approval requests in this view.
          </div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filtered.map((req) => (
                <div key={req.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                      {req.requestType}
                    </span>
                    <PaymentStatusBadge status={req.status} />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">Entity</span>
                      <span className="font-mono text-xs text-stone-700">
                        {req.targetRecordType} ({req.targetRecordId.slice(0, 8)}...)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-semibold uppercase">Amount</span>
                      <span className="font-bold text-base text-[#6D1A2B]">
                        {req.requestedAmount !== undefined && req.requestedAmount !== null ? (
                          <MoneyDisplay amount={req.requestedAmount} currency={req.currency} />
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#FFFBF5] p-2.5 rounded-xl border border-stone-200/60 text-xs">
                    <span className="text-[10px] text-stone-400 font-semibold block uppercase mb-0.5">
                      Reason / Justification
                    </span>
                    <p className="text-stone-700 leading-relaxed">{req.reason}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                    <span>
                      Requested by <strong className="text-stone-800">{req.requester.name}</strong> ({req.requester.role})
                    </span>
                  </div>

                  {req.status === "PENDING" ? (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => handleOpenDecision(req, "REJECTED")}
                        className="min-h-[44px] rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenDecision(req, "APPROVED")}
                        className="min-h-[44px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs flex items-center justify-center shadow-xs transition"
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/50 text-[11px] text-stone-500">
                      <p>Reviewed by <strong>{req.reviewer?.name || "Admin"}</strong></p>
                      {req.reviewNotes && (
                        <p className="italic text-stone-600 mt-0.5">
                          &quot;{req.reviewNotes}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request Type</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reason & Justification</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((req) => (
                    <tr key={req.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-[#2A0F16]">
                        <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                          {req.requestType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {req.targetRecordType} ({req.targetRecordId.slice(0, 10)}...)
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        {req.requestedAmount !== undefined && req.requestedAmount !== null ? (
                          <MoneyDisplay amount={req.requestedAmount} currency={req.currency} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-700 max-w-[220px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        <p className="font-medium text-[#2A0F16]">{req.requester.name}</p>
                        <p className="text-[10px] text-stone-400">{req.requester.role}</p>
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDecision(req, "APPROVED")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs shadow-xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOpenDecision(req, "REJECTED")}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-semibold text-xs shadow-xs transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-stone-400 text-right">
                            <p>Reviewed by {req.reviewer?.name || "Admin"}</p>
                            {req.reviewNotes && (
                              <p className="text-[10px] italic text-stone-500 truncate max-w-[150px]">
                                &quot;{req.reviewNotes}&quot;
                              </p>
                            )}
                          </div>
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

      {/* Decision Modal */}
      {decisionModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6D1A2B]" />
                <span>
                  {decisionType === "APPROVED" ? "Approve" : "Reject"} Financial Request
                </span>
              </h2>
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDecision} className="space-y-4 mt-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <p className="font-semibold text-[#2A0F16]">
                  Type: {selectedRequest.requestType}
                </p>
                {selectedRequest.requestedAmount && (
                  <p className="text-sm font-bold text-[#6D1A2B]">
                    Amount: <MoneyDisplay amount={selectedRequest.requestedAmount} />
                  </p>
                )}
                <p className="text-stone-600">Requester Reason: {selectedRequest.reason}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Administrative Review Notes (Audit Log)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Provide administrative rationale for ${decisionType.toLowerCase()}ing this request...`}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`min-h-[44px] px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-sm transition flex items-center justify-center ${
                    decisionType === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting
                    ? "Recording..."
                    : `Confirm ${decisionType === "APPROVED" ? "Approval" : "Rejection"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
