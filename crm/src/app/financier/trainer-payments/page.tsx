"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  Users,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
  Calendar,
  X,
  RefreshCw,
} from "lucide-react";

interface PayoutItem {
  id: string;
  grossAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  netPayable: number;
  paidAmount?: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: string;
  trainerProfile: {
    id: string;
    user: { name: string; email: string };
  };
  payrollPeriod: {
    periodName: string;
    startDate: string;
    endDate: string;
    status: string;
  };
}

interface PeriodItem {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalGrossPayable: number;
  totalNetPayable: number;
}

export default function FinancierTrainerPaymentsPage() {
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutItem | null>(null);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [disburseMethod, setDisburseMethod] = useState("BANK_TRANSFER");
  const [disburseReference, setDisburseReference] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financier/trainer-payments");
      const data = await res.json();
      if (data.periods && data.payouts) {
        setPeriods(data.periods);
        setPayouts(data.payouts);
      }
    } catch (e) {
      console.error("Failed to load trainer payments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGeneratePayRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName || !startDate || !endDate) {
      setActionMessage({ type: "error", text: "Please enter all period details." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/financier/trainer-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodName, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate pay run");
      }
      setActionMessage({
        type: "success",
        text: `Pay run for "${periodName}" generated with ${data.payoutsCount} trainer draft payouts. Sent for Admin approval.`,
      });
      setIsGenerateModalOpen(false);
      setPeriodName("");
      setStartDate("");
      setEndDate("");
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisbursePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/financier/trainer-payments/${selectedPayout.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: disburseMethod,
          paymentReference: disburseReference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disburse payout");
      }
      setActionMessage({
        type: "success",
        text: `Payout disbursed to ${selectedPayout.trainerProfile.user.name}. Status is now CONFIRMED_PAID.`,
      });
      setIsDisburseModalOpen(false);
      setSelectedPayout(null);
      setDisburseReference("");
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Trainer Payroll & Payouts</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Generate compensation runs based on approved policies and disburse Admin-approved trainer salaries.
          </p>
        </div>
        <button
          onClick={() => setIsGenerateModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Generate Pay Run</span>
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

      {/* Payroll Periods Summary */}
      {periods.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {periods.slice(0, 3).map((p) => (
            <div
              key={p.id}
              className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-[#2A0F16] truncate">{p.periodName}</span>
                  <PaymentStatusBadge status={p.status} />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] text-stone-500">Net Payable</span>
                <span className="font-bold text-sm text-[#6D1A2B]">
                  <MoneyDisplay amount={p.totalNetPayable} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payouts Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2A0F16]">Trainer Compensation Payouts</h2>
          <button
            onClick={loadData}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading payroll ledger...</div>
        ) : payouts.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No payouts generated yet. Click &quot;Generate Pay Run&quot; to calculate period earnings.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {payouts.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#2A0F16]">
                        {p.trainerProfile?.user?.name || "Trainer"}
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        {p.trainerProfile?.user?.email}
                      </p>
                      <p className="text-xs font-semibold text-stone-600 mt-0.5">
                        {p.payrollPeriod?.periodName}
                      </p>
                    </div>
                    <PaymentStatusBadge status={p.paymentStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-stone-50/70 p-2.5 rounded-lg text-center text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Gross</span>
                      <span className="font-medium text-stone-800">
                        <MoneyDisplay amount={p.grossAmount} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Adjust.</span>
                      <span className="font-medium text-stone-600">
                        +{p.bonusAmount}/-{p.deductionAmount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Net</span>
                      <span className="font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.netPayable} />
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1">
                    {p.paymentStatus === "ADMIN_APPROVED" && (
                      <button
                        onClick={() => {
                          setSelectedPayout(p);
                          setIsDisburseModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
                      >
                        <Send className="w-4 h-4 shrink-0" />
                        <span>Disburse Approved Payout</span>
                      </button>
                    )}
                    {p.paymentStatus === "CALCULATED" && (
                      <div className="text-[11px] text-amber-700 italic flex items-center justify-center gap-1.5 py-1 bg-amber-50 rounded-lg">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Awaiting Admin Approval</span>
                      </div>
                    )}
                    {p.paymentStatus === "CONFIRMED_PAID" && (
                      <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1.5 py-1 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Paid via {p.paymentMethod}</span>
                      </div>
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
                    <th className="py-3 px-4">Trainer</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Gross Amount</th>
                    <th className="py-3 px-4">Adjustments</th>
                    <th className="py-3 px-4">Net Payable</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Disbursement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2A0F16]">
                          {p.trainerProfile?.user?.name || "Trainer"}
                        </p>
                        <p className="text-[10px] text-stone-400">{p.trainerProfile?.user?.email}</p>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{p.payrollPeriod?.periodName}</td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        <MoneyDisplay amount={p.grossAmount} />
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        +{p.bonusAmount} / -{p.deductionAmount}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.netPayable} />
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={p.paymentStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.paymentStatus === "ADMIN_APPROVED" && (
                          <button
                            onClick={() => {
                              setSelectedPayout(p);
                              setIsDisburseModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-[11px] shadow-xs transition"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Disburse</span>
                          </button>
                        )}
                        {p.paymentStatus === "CALCULATED" && (
                          <span className="text-[11px] text-amber-700 italic flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Awaiting Admin Approval</span>
                          </span>
                        )}
                        {p.paymentStatus === "CONFIRMED_PAID" && (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid ({p.paymentMethod})</span>
                          </span>
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

      {/* Modal: Generate Pay Run */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6D1A2B]" />
                <span>Generate Compensation Pay Run</span>
              </h2>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGeneratePayRun} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pay Period Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. October 2026 Pay Run"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                Calculates eligible verified locked sessions, scheduled hours, or monthly base rates based on each trainer&apos;s active compensation policy. Draft payouts will be routed to the Admin Approval Center.
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  {submitting ? "Calculating..." : "Generate Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Disburse Payout */}
      {isDisburseModalOpen && selectedPayout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#6D1A2B]" />
                <span>Disburse Trainer Payout</span>
              </h2>
              <button
                onClick={() => setIsDisburseModalOpen(false)}
                className="p-2 -mr-1 rounded-md text-stone-400 hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDisbursePayout} className="space-y-4 mt-4">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <p className="text-xs font-semibold text-[#2A0F16]">
                  Trainer: {selectedPayout.trainerProfile.user.name}
                </p>
                <p className="text-xs text-stone-500">
                  Period: {selectedPayout.payrollPeriod.periodName}
                </p>
                <p className="text-sm font-bold text-[#6D1A2B]">
                  Net Payable: <MoneyDisplay amount={selectedPayout.netPayable} />
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Disbursement Method *
                </label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B] bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Bank Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-20261018-998811"
                  value={disburseReference}
                  onChange={(e) => setDisburseReference(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisburseModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-sm transition active:scale-[0.98]"
                >
                  {submitting ? "Confirming..." : "Confirm & Disburse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
