"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialSummaryCard } from "@/components/ui/FinancialSummaryCard";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import {
  Download,
  Calendar,
  CreditCard,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Wallet,
  DollarSign,
} from "lucide-react";

interface ReportData {
  summary: {
    dailyCollections: number;
    weeklyCollections: number;
    monthlyCollections: number;
    yearlyCollections: number;
    totalGrossCollections: number;
    totalRefunds: number;
    totalNetCollections: number;
    totalExpenses: number;
    totalTrainerPayouts: number;
    netCashMovement: number;
  };
  methodBreakdown: Record<string, { count: number; total: number }>;
  courseBreakdown: Record<string, { title: string; contracted: number; collected: number }>;
  recentPayments: Array<{
    id: string;
    transactionNumber: string;
    studentName: string;
    courseCode: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    verifierName: string;
  }>;
}

export default function FinancierReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financier/reports");
      const json = await res.json();
      if (json.summary) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <h1 className="text-xl sm:text-2xl font-bold text-[#2A0F16]">Treasury Reports & Statements</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Authoritative cash movement statements, course revenues, and exportable financial audit sheets.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/api/financier/reports?format=csv"
            download
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] font-semibold text-xs shadow-sm transition active:scale-[0.98]"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-xl p-12 text-center text-xs text-stone-500 border border-[#2A0F16]/10">
          Generating financial statements...
        </div>
      ) : (
        <>
          {/* Time Windows */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Today&apos;s Collections
              </span>
              <p className="text-lg font-bold text-[#2A0F16] mt-1">
                <MoneyDisplay amount={data.summary.dailyCollections} />
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                This Week
              </span>
              <p className="text-lg font-bold text-[#2A0F16] mt-1">
                <MoneyDisplay amount={data.summary.weeklyCollections} />
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                This Month
              </span>
              <p className="text-lg font-bold text-[#2A0F16] mt-1">
                <MoneyDisplay amount={data.summary.monthlyCollections} />
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Year-To-Date
              </span>
              <p className="text-lg font-bold text-[#2A0F16] mt-1">
                <MoneyDisplay amount={data.summary.yearlyCollections} />
              </p>
            </div>
          </div>

          {/* Net Cash Movement Summary */}
          <div className="bg-white rounded-xl p-5 border border-[#2A0F16]/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#2A0F16]">Institutional Cash Movement Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">Gross Collections</span>
                <p className="text-base font-bold text-emerald-950 mt-1">
                  <MoneyDisplay amount={data.summary.totalGrossCollections} />
                </p>
              </div>

              <div className="p-3.5 bg-rose-50/50 rounded-lg border border-rose-200">
                <span className="text-xs font-semibold text-rose-800">Executed Refunds</span>
                <p className="text-base font-bold text-rose-950 mt-1">
                  -<MoneyDisplay amount={data.summary.totalRefunds} />
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-xs font-semibold text-stone-700">Operating Outlays & Payroll</span>
                <p className="text-base font-bold text-stone-900 mt-1">
                  -<MoneyDisplay amount={data.summary.totalExpenses + data.summary.totalTrainerPayouts} />
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Exp: {data.summary.totalExpenses} | Trainer: {data.summary.totalTrainerPayouts}
                </p>
              </div>

              <div className="p-3.5 bg-[#FFFBF5] rounded-lg border border-[#C9A24B]/40">
                <span className="text-xs font-bold text-[#6D1A2B]">Net Cash Position</span>
                <p className="text-base font-extrabold text-[#2A0F16] mt-1">
                  <MoneyDisplay amount={data.summary.netCashMovement} />
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">Verified liquidity movement</p>
              </div>
            </div>
          </div>

          {/* Payment Method Breakdown & Course Revenues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div className="bg-white rounded-xl p-5 border border-[#2A0F16]/10 shadow-sm">
              <h2 className="text-sm font-bold text-[#2A0F16] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#6D1A2B]" />
                <span>Collections by Payment Method</span>
              </h2>
              <div className="space-y-2.5">
                {Object.entries(data.methodBreakdown).map(([method, info]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#FFFBF5] border border-[#2A0F16]/5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#2A0F16]">{method}</span>
                      <span className="text-stone-400 text-[10px] ml-2">({info.count} transactions)</span>
                    </div>
                    <span className="font-bold text-[#6D1A2B]">
                      <MoneyDisplay amount={info.total} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Breakdown */}
            <div className="bg-white rounded-xl p-5 border border-[#2A0F16]/10 shadow-sm">
              <h2 className="text-sm font-bold text-[#2A0F16] mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#6D1A2B]" />
                <span>Revenue by Course Curriculum</span>
              </h2>
              <div className="space-y-2.5">
                {Object.entries(data.courseBreakdown).map(([code, item]) => (
                  <div
                    key={code}
                    className="p-2.5 rounded-lg bg-[#FFFBF5] border border-[#2A0F16]/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#2A0F16]">{code}</span>
                      <span className="font-semibold text-emerald-700">
                        Collected: <MoneyDisplay amount={item.collected} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="truncate max-w-[200px]">{item.title}</span>
                      <span>Contracted: <MoneyDisplay amount={item.contracted} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
