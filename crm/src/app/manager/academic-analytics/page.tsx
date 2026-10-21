"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  TrendingUp,
  AlertCircle,
  FileText,
  ClipboardList,
  Layers,
  Users,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

export default function ManagerAcademicAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/manager/academic-analytics");
      const d = await res.json();
      if (d.success) {
        setData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      user={{
        name: "Operations Manager",
        email: "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-[#C9A24B]/20 pb-4 sm:pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Cohort Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold mt-0.5">
            Academic Operational Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Operational visibility into batch progress, submission rates, pending trainer evaluations, and academic attention alerts.
          </p>
        </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading operational analytics...
        </div>
      ) : !data ? (
        <div className="p-8 text-center bg-white rounded-xl border border-[#C9A24B]/20 text-xs text-[#2A0F16]/60">
          Failed to load academic analytics.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-1">
              <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 font-medium block truncate">
                Active Batches
              </span>
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#6D1A2B] block">
                {data.summary.activeBatchesCount}
              </span>
              <span className="text-[10px] text-[#2A0F16]/50 block truncate">In-flight cohorts</span>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-1">
              <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 font-medium block truncate">
                Open Alerts
              </span>
              <span
                className={`text-2xl sm:text-3xl font-serif font-bold block ${
                  data.summary.totalActiveAlerts > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {data.summary.totalActiveAlerts}
              </span>
              <span className="text-[10px] text-[#2A0F16]/50 block truncate">Intervention required</span>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-1">
              <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 font-medium block truncate">
                Pending Assignments
              </span>
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#C9A24B] block">
                {data.summary.pendingAssignmentReviews}
              </span>
              <span className="text-[10px] text-[#2A0F16]/50 block truncate">Awaiting grading</span>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-[#C9A24B]/20 shadow-xs space-y-1">
              <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 font-medium block truncate">
                Pending Quizzes
              </span>
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2A0F16] block">
                {data.summary.pendingQuizReviews}
              </span>
              <span className="text-[10px] text-[#2A0F16]/50 block truncate">Evaluation backlog</span>
            </div>
          </div>

          {/* Batches Table & Mobile Cards */}
          <div className="bg-white rounded-2xl border border-[#C9A24B]/25 p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2A0F16]">
              Cohort Operational Progress
            </h3>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-[#C9A24B]/10">
              {data.batches.map((b: any) => (
                <div key={b.id} className="py-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6D1A2B]">{b.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.openAlertsCount > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {b.openAlertsCount} Alerts
                    </span>
                  </div>
                  <p className="font-medium text-[#2A0F16]">{b.courseTitle}</p>
                  <div className="flex items-center justify-between text-stone-500 text-[11px]">
                    <span>{b.studentsCount} Students</span>
                    <span>{b.assignmentsCount} Assignments</span>
                    <span>{b.quizzesCount} Quizzes</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#C9A24B]/20 text-[#2A0F16]/60 bg-[#FFFBF5]">
                    <th className="p-3 font-semibold">Batch Code</th>
                    <th className="p-3 font-semibold">Course</th>
                    <th className="p-3 font-semibold">Enrolled Students</th>
                    <th className="p-3 font-semibold">Assignments</th>
                    <th className="p-3 font-semibold">Quizzes</th>
                    <th className="p-3 font-semibold">Active Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A24B]/10">
                  {data.batches.map((b: any) => (
                    <tr key={b.id} className="hover:bg-[#FFFBF5]/60 transition-colors">
                      <td className="p-3 font-bold text-[#6D1A2B]">{b.code}</td>
                      <td className="p-3 font-medium text-[#2A0F16]">{b.courseTitle}</td>
                      <td className="p-3 text-[#2A0F16]">{b.studentsCount}</td>
                      <td className="p-3 text-[#2A0F16]">{b.assignmentsCount}</td>
                      <td className="p-3 text-[#2A0F16]">{b.quizzesCount}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.openAlertsCount > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {b.openAlertsCount} Alerts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Attention Alerts Feed */}
          {data.activeAlerts && data.activeAlerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#C9A24B]/25 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#2A0F16]">
                  Active Academic Attention Alerts
                </h3>
              </div>

              <div className="space-y-3">
                {data.activeAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#2A0F16]">
                          {alert.studentProfile.user.name}
                        </span>
                        <span className="text-xs text-[#2A0F16]/60">
                          ({alert.batch.code})
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#2A0F16]/80 mt-1">
                        Notice Type: <strong>{alert.alertType.replace("_", " ")}</strong>. Overdue assignments or missed assessment threshold detected.
                      </p>
                    </div>

                    <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-[#C9A24B]/30 text-[#6D1A2B] self-start sm:self-auto">
                      Open Notice
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </AppShell>
  );
}
