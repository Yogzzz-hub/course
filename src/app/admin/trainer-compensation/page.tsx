"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
  X,
  UserCheck,
} from "lucide-react";

interface PolicyItem {
  id: string;
  policyType: string;
  baseRate: number;
  currency: string;
  effectiveFrom: string;
  isActive: boolean;
  notes?: string;
  trainerProfile: {
    id: string;
    user: { name: string; email: string; phone?: string };
  };
  rates: Array<{
    id: string;
    rate: number;
    effectiveFrom: string;
  }>;
}

interface TrainerItem {
  id: string;
  user: { id: string; name: string; email: string };
  assignedBatches: Array<{ id: string; code: string; course: { title: string } }>;
}

export default function AdminTrainerCompensationPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [trainerProfileId, setTrainerProfileId] = useState("");
  const [policyType, setPolicyType] = useState<"MONTHLY_SALARY" | "PER_SESSION" | "PER_HOUR">("PER_SESSION");
  const [baseRate, setBaseRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trainer-compensation");
      const data = await res.json();
      if (data.policies) {
        setPolicies(data.policies);
        setTrainers(data.trainers || []);
      }
    } catch (e) {
      console.error("Failed to load trainer compensation:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfigurePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerProfileId || !baseRate || Number(baseRate) < 0) {
      setActionMessage({ type: "error", text: "Please select trainer and enter valid base rate." });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/trainer-compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerProfileId,
          policyType,
          baseRate: parseFloat(baseRate),
          currency: "INR",
          effectiveFrom,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to configure policy");
      }
      setActionMessage({
        type: "success",
        text: data.message,
      });
      setIsModalOpen(false);
      setTrainerProfileId("");
      setBaseRate("");
      setNotes("");
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
        name: "Admin",
        email: "admin@apex.edu",
        role: "ADMIN",
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2A0F16]">Trainer Compensation Policies</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Configure effective-dated compensation agreements supporting Monthly Salary, Per-Session, and Per-Hour models.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Configure Policy</span>
        </button>
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

      {/* Policies Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#2A0F16]">Active Trainer Compensation Policies</h2>
          <button
            onClick={loadData}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 active:scale-95 transition-transform"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading compensation policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No compensation policies configured yet. Click &quot;Configure Policy&quot; to assign a rate.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {policies.map((p) => (
                <div key={p.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-[#2A0F16]">
                        {p.trainerProfile?.user?.name || "Trainer"}
                      </p>
                      <p className="text-[11px] text-stone-400">{p.trainerProfile?.user?.email}</p>
                    </div>
                    {p.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] shrink-0">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] shrink-0">
                        SUPERSEDED
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                      {p.policyType.replace(/_/g, " ")}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-base text-[#6D1A2B]">
                        <MoneyDisplay amount={p.baseRate} currency={p.currency} />
                      </span>
                      <span className="text-[11px] text-stone-400 font-normal ml-1">
                        {p.policyType === "PER_SESSION" ? "/ session" : p.policyType === "PER_HOUR" ? "/ hr" : "/ month"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
                    <span>Effective: {new Date(p.effectiveFrom).toLocaleDateString()}</span>
                  </div>

                  {p.notes && (
                    <div className="p-2 rounded-lg bg-[#FFFBF5] border border-stone-200/60 text-[11px] text-stone-600">
                      <span className="text-[10px] text-stone-400 font-semibold block uppercase">Notes</span>
                      {p.notes}
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
                    <th className="py-3 px-4">Trainer</th>
                    <th className="py-3 px-4">Policy Type</th>
                    <th className="py-3 px-4">Base Rate</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2A0F16]">
                          {p.trainerProfile?.user?.name || "Trainer"}
                        </p>
                        <p className="text-[10px] text-stone-400">{p.trainerProfile?.user?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium text-[11px]">
                          {p.policyType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.baseRate} currency={p.currency} />
                        <span className="text-[10px] text-stone-400 font-normal ml-1">
                          {p.policyType === "PER_SESSION" ? "/ session" : p.policyType === "PER_HOUR" ? "/ hr" : "/ month"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(p.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {p.isActive ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px]">
                            SUPERSEDED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 max-w-[200px] truncate">
                        {p.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Configure Policy */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-xl border border-[#2A0F16]/10 relative max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A0F16]/10">
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#6D1A2B]" />
                <span>Configure Trainer Compensation</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfigurePolicy} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Trainer *
                </label>
                <select
                  value={trainerProfileId}
                  onChange={(e) => setTrainerProfileId(e.target.value)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                  required
                >
                  <option value="">Choose trainer...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name} ({t.user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Compensation Model *
                </label>
                <select
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                >
                  <option value="PER_SESSION">Per Session (Locked & Verified Sessions)</option>
                  <option value="PER_HOUR">Per Teaching Hour (Verified Duration)</option>
                  <option value="MONTHLY_SALARY">Monthly Salary (Institutional Agreement)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Rate (INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Effective From *
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Agreement Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms, batch assignment stipulations, or contract references..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600">
                Future rate modifications maintain historical audit integrity and will not silently alter previously approved payouts.
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shadow-xs transition flex items-center justify-center"
                >
                  {submitting ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
