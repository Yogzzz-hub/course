"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  FileCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  ShieldAlert,
} from "lucide-react";

interface ReconciliationItem {
  id: string;
  sourceType: string;
  externalReference?: string;
  expectedAmount: number;
  actualAmount: number;
  discrepancy: number;
  currency: string;
  status: string;
  discrepancyReason?: string;
  reconciledAt: string;
  reviewer?: { name: string };
}

export default function FinancierReconciliationPage() {
  const [records, setRecords] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form
  const [sourceType, setSourceType] = useState("BANK");
  const [externalReference, setExternalReference] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financier/reconciliation");
      const data = await res.json();
      if (data.records) {
        setRecords(data.records);
      }
    } catch (e) {
      console.error("Failed to load reconciliation records:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedAmount || !actualAmount) {
      setActionMessage({ type: "error", text: "Please enter expected and actual amounts." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/financier/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          externalReference: externalReference || null,
          expectedAmount: parseFloat(expectedAmount),
          actualAmount: parseFloat(actualAmount),
          currency: "INR",
          discrepancyReason: discrepancyReason || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record reconciliation entry");
      }
      setActionMessage({
        type: "success",
        text: `Reconciliation entry recorded (${data.record.status}).`,
      });
      setIsModalOpen(false);
      setExternalReference("");
      setExpectedAmount("");
      setActualAmount("");
      setDiscrepancyReason("");
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const flaggedCount = records.filter((r) => r.status === "DISCREPANCY_FLAGGED").length;
  const matchedCount = records.filter((r) => r.status === "MATCHED").length;

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
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Treasury Reconciliation</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Compare expected collection records with bank statements, gateway settlements, and cash books.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New Reconciliation Entry</span>
        </button>
      </div>

      {/* Action Notification */}
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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-stone-500">
              Total Audited Runs
            </span>
            <p className="text-xl font-bold text-[#2A0F16] mt-0.5">{records.length}</p>
          </div>
          <FileCheck className="w-6 h-6 text-[#6D1A2B] shrink-0" />
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-emerald-800">
              Matched & Cleared
            </span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{matchedCount}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-amber-800">
              Discrepancies Flagged
            </span>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{flaggedCount}</p>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
        </div>
      </div>

      {/* Audit Trail: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2A0F16]">Reconciliation Audit Trail</h2>
          <button
            onClick={loadData}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading audit trail...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No reconciliation runs on record.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {records.map((r) => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-[#2A0F16]">
                        {r.sourceType} Channel
                      </span>
                      {r.externalReference && (
                        <p className="font-mono text-xs text-stone-500 mt-0.5">
                          Ref: {r.externalReference}
                        </p>
                      )}
                    </div>
                    <PaymentStatusBadge status={r.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-stone-50/70 p-2.5 rounded-lg text-center text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Expected</span>
                      <span className="font-medium text-stone-700">
                        <MoneyDisplay amount={r.expectedAmount} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Actual</span>
                      <span className="font-medium text-stone-700">
                        <MoneyDisplay amount={r.actualAmount} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Variance</span>
                      <span className="font-bold text-rose-700">
                        {r.discrepancy !== 0 ? <MoneyDisplay amount={r.discrepancy} /> : "0.00"}
                      </span>
                    </div>
                  </div>

                  {r.discrepancyReason && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      <strong>Variance Reason:</strong> {r.discrepancyReason}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                    <span>Auditor: {r.reviewer?.name || "System"}</span>
                    <span>{new Date(r.reconciledAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Channel / Source</th>
                    <th className="py-3 px-4">External Ref</th>
                    <th className="py-3 px-4">Expected</th>
                    <th className="py-3 px-4">Actual</th>
                    <th className="py-3 px-4">Discrepancy</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Auditor</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-[#2A0F16]">{r.sourceType}</td>
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {r.externalReference || "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-700">
                        <MoneyDisplay amount={r.expectedAmount} />
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-700">
                        <MoneyDisplay amount={r.actualAmount} />
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-700">
                        {r.discrepancy !== 0 ? <MoneyDisplay amount={r.discrepancy} /> : "0.00"}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={r.status} />
                      </td>
                      <td className="py-3 px-4 text-stone-500">{r.reviewer?.name || "System"}</td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(r.reconciledAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: New Reconciliation Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#6D1A2B]" />
                <span>Record Reconciliation Match</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReconciliation} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reconciliation Channel *
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                >
                  <option value="BANK">Bank Statement Match</option>
                  <option value="UPI">UPI Settlement Batch</option>
                  <option value="GATEWAY">Payment Gateway Settlement</option>
                  <option value="CASH">Cash Till Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  External Batch / Statement Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. STMT-202610-01"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Expected Ledger Amt *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Actual Statement Amt *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Discrepancy Notes (if variance exists)
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for discrepancy (bank charges, settlement lag, etc.)"
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
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
                  {submitting ? "Saving..." : "Record Match"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
