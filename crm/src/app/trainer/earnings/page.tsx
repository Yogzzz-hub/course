"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { formatDate } from "@/lib/utils";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  FileText,
  Calendar,
} from "lucide-react";

export default function TrainerEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trainer/earnings")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch((err) => console.error("Failed to load trainer earnings:", err))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary;
  const trainer = data?.trainer;
  const payouts = data?.payouts || [];
  const currency = trainer?.currency || "INR";

  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "trainer@apexacademy.edu",
        role: "TRAINER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Compensation & Faculty Payroll
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Faculty Compensation Ledger
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review your verified teaching sessions, approved payroll statements, and confirmed bank disbursements.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500 animate-pulse bg-white rounded-2xl border border-stone-200">
          Loading faculty compensation statement...
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-3.5 sm:p-5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-emerald-800 uppercase tracking-wider font-semibold block truncate">
                Confirmed Paid
              </span>
              <div className="mt-1 sm:mt-2">
                <MoneyDisplay amount={summary.totalConfirmedPaid} currency={currency} size="lg" variant="success" />
              </div>
              <span className="text-[10px] text-emerald-700 block mt-1 hidden sm:block">
                Disbursed to bank account
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-[#C9A24B]/30 bg-[#F6EBCF]/20 p-3.5 sm:p-5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-[#4E0F1E] uppercase tracking-wider font-semibold block truncate">
                Approved (Pending)
              </span>
              <div className="mt-1 sm:mt-2">
                <MoneyDisplay amount={summary.approvedPendingDisbursement} currency={currency} size="lg" variant="gold" />
              </div>
              <span className="text-[10px] text-[#4E0F1E]/80 block mt-1 hidden sm:block">
                Approved by Admin, awaiting execution
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-stone-500 uppercase tracking-wider font-semibold block truncate">
                Pending Review
              </span>
              <div className="mt-1 sm:mt-2">
                <MoneyDisplay amount={summary.pendingApprovalAmount} currency={currency} size="lg" />
              </div>
              <span className="text-[10px] text-stone-400 block mt-1 hidden sm:block">
                Awaiting executive audit sign-off
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] text-stone-500 uppercase tracking-wider font-semibold block truncate">
                Verified Classes
              </span>
              <div className="mt-1 sm:mt-2 text-xl sm:text-2xl font-black font-mono text-[#6D1A2B]">
                {summary.verifiedSessionsCount}
              </div>
              <span className="text-[10px] text-stone-400 block mt-1 hidden sm:block">
                Locked & validated classes
              </span>
            </div>
          </div>

          {/* Active Compensation Policy Box */}
          <div className="bg-white rounded-3xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFFBF5] text-[#6D1A2B] border border-[#6D1A2B]/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-[#C9A24B] uppercase tracking-wider block">
                  Employee Code: {trainer?.employeeCode}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-[#2A0F16]">
                  Active Compensation Policy
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Compensation Model: <span className="font-semibold text-stone-800">{trainer?.policyType?.replace(/_/g, " ")}</span>
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between sm:justify-start gap-3 self-stretch md:self-auto">
              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
                  Contracted Rate
                </span>
                <MoneyDisplay amount={trainer?.baseRate} currency={currency} size="md" />
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                / {trainer?.policyType === "PER_HOUR" ? "hour" : trainer?.policyType === "PER_SESSION" ? "session" : "month"}
              </span>
            </div>
          </div>

          {/* Payout History Table & Mobile Cards */}
          <div className="bg-white rounded-3xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">
                  Pay Period Statements & History
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Calculated against verified class logs and approved by academy administration.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-stone-500 shrink-0 ml-2">
                {payouts.length} Statements Total
              </span>
            </div>

            {payouts.length === 0 ? (
              <div className="p-12 text-center text-xs text-stone-500 italic">
                No payroll statements generated yet.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block md:hidden divide-y divide-stone-100">
                  {payouts.map((p: any) => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-[#2A0F16] block">{p.periodName}</span>
                          <span className="text-xs text-stone-500">{p.policyType?.replace(/_/g, " ")}</span>
                        </div>
                        <div className="text-right">
                          <MoneyDisplay amount={p.totalPayable} currency={currency} size="sm" />
                          <span className="text-[11px] text-stone-400 font-mono block">
                            {p.eligibleSessionsCount} sessions ({p.verifiedHours}h)
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.adminApprovalStatus === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.adminApprovalStatus === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.adminApprovalStatus}
                          </span>
                          <PaymentStatusBadge status={p.paymentStatus} size="sm" />
                        </div>
                        <span className="font-mono text-[11px] text-stone-500 truncate max-w-[150px]">
                          {p.paymentReference || "Pending Ref"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                      <tr>
                        <th className="py-3 px-4">Pay Period</th>
                        <th className="py-3 px-4">Model & Rate</th>
                        <th className="py-3 px-4">Eligible Delivery</th>
                        <th className="py-3 px-4">Total Payable</th>
                        <th className="py-3 px-4">Admin Approval</th>
                        <th className="py-3 px-4">Payment Status</th>
                        <th className="py-3 px-4 text-right">Disbursement Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {payouts.map((p: any) => (
                        <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                            {p.periodName}
                          </td>
                          <td className="py-3.5 px-4 text-stone-600">
                            {p.policyType?.replace(/_/g, " ")} ({formatDate(p.applicableRate)})
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-700">
                            {p.eligibleSessionsCount} Sessions ({p.verifiedHours} hrs)
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#6D1A2B]">
                            <MoneyDisplay amount={p.totalPayable} currency={currency} size="sm" />
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.adminApprovalStatus === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.adminApprovalStatus === "REJECTED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {p.adminApprovalStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <PaymentStatusBadge status={p.paymentStatus} size="sm" />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-[11px] text-stone-500">
                            {p.paymentReference || (
                              <span className="text-stone-300 italic">Pending Execution</span>
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
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-stone-500">
          Faculty compensation account not found.
        </div>
      )}
    </AppShell>
  );
}
