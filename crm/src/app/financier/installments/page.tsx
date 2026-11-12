"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { FinancialSummaryCard } from "@/components/ui/FinancialSummaryCard";
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface InstallmentData {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  remainingBalance: number;
  status: string;
  agingBucket: string;
  daysOverdue: number;
  studentName: string;
  studentEmail: string;
  registrationNumber: string;
  courseCode: string;
  courseTitle: string;
  agreementNumber: string;
}

interface AgingSummary {
  notYetDue: number;
  days1To7: number;
  days8To30: number;
  days31To60: number;
  days61Plus: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export default function FinancierInstallmentsPage() {
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financier/installments?status=${statusFilter}`);
      const data = await res.json();
      if (data.installments) {
        setInstallments(data.installments);
        setSummary(data.agingSummary);
      }
    } catch (e) {
      console.error("Failed to load installments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filtered = installments.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.studentName.toLowerCase().includes(q) ||
      item.registrationNumber.toLowerCase().includes(q) ||
      item.courseCode.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apex.edu",
        role: "FINANCIER",
      }}
    >
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Installment Aging & Collections</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Monitor scheduled tuition installments, chronological payment allocations, and past-due aging buckets.
        </p>
      </div>

      {/* Aging KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block truncate">
              Not Yet Due
            </span>
            <p className="text-sm sm:text-base font-bold text-stone-800 mt-1">
              <MoneyDisplay amount={summary.notYetDue} />
            </p>
            <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Current</span>
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block truncate">
              1–7 Days Overdue
            </span>
            <p className="text-sm sm:text-base font-bold text-amber-900 mt-1">
              <MoneyDisplay amount={summary.days1To7} />
            </p>
            <span className="text-[10px] text-amber-700">First reminder tier</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-orange-50/50 border border-orange-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block truncate">
              8–30 Days Overdue
            </span>
            <p className="text-sm sm:text-base font-bold text-orange-900 mt-1">
              <MoneyDisplay amount={summary.days8To30} />
            </p>
            <span className="text-[10px] text-orange-700">Follow-up tier</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block truncate">
              31–60 Days Overdue
            </span>
            <p className="text-sm sm:text-base font-bold text-rose-900 mt-1">
              <MoneyDisplay amount={summary.days31To60} />
            </p>
            <span className="text-[10px] text-rose-700">Critical attention</span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl bg-rose-100/60 border border-rose-300 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block truncate">
              61+ Days Overdue
            </span>
            <p className="text-sm sm:text-base font-bold text-rose-950 mt-1">
              <MoneyDisplay amount={summary.days61Plus} />
            </p>
            <span className="text-[10px] text-rose-800 font-semibold">Collections escalation</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#2A0F16]/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student, reg no, course..."
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
              <option value="ALL">All Installments</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="UPCOMING">Upcoming / Not Due</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dual-Mode Content: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500">Loading installment ledger...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No installments found matching criteria.
          </div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filtered.map((i) => (
                <div key={i.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[10px] font-bold">
                          #{i.installmentNumber}
                        </span>
                        <h4 className="font-bold text-sm text-[#2A0F16]">
                          {i.studentName}
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {i.registrationNumber || i.studentEmail} • {i.courseCode}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PaymentStatusBadge status={i.status} />
                      {i.daysOverdue > 0 && (
                        <span className="text-[10px] font-bold text-rose-600">
                          {i.daysOverdue}d overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-stone-50/70 p-2.5 rounded-lg text-center">
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Due</span>
                      <span className="font-semibold text-stone-800 text-xs">
                        <MoneyDisplay amount={i.amountDue} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Paid</span>
                      <span className="font-semibold text-emerald-700 text-xs">
                        <MoneyDisplay amount={i.amountPaid} />
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase font-medium">Balance</span>
                      <span className="font-bold text-[#6D1A2B] text-xs">
                        <MoneyDisplay amount={i.remainingBalance} />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                    <span>Due Date:</span>
                    <span className="font-medium text-stone-700">
                      {new Date(i.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Inst #</th>
                    <th className="py-3 px-4">Amount Due</th>
                    <th className="py-3 px-4">Paid / Allocated</th>
                    <th className="py-3 px-4">Balance</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status & Aging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#2A0F16]">{i.studentName}</p>
                        <p className="text-[10px] text-stone-400">
                          {i.registrationNumber || i.studentEmail}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{i.courseCode}</td>
                      <td className="py-3 px-4 font-mono font-medium">#{i.installmentNumber}</td>
                      <td className="py-3 px-4 font-semibold text-stone-800">
                        <MoneyDisplay amount={i.amountDue} />
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold">
                        <MoneyDisplay amount={i.amountPaid} />
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={i.remainingBalance} />
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(i.dueDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <PaymentStatusBadge status={i.status} />
                          {i.daysOverdue > 0 && (
                            <span className="text-[10px] font-semibold text-rose-600">
                              {i.daysOverdue} days overdue
                            </span>
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
    </AppShell>
  );
}
