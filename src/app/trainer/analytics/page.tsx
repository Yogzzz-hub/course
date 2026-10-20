"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  ClipboardList,
  Layers,
  Users,
} from "lucide-react";

export default function TrainerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/trainer/analytics");
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
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
        name: "Trainer",
        email: "",
        role: "TRAINER",
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-[#C9A24B]/20 pb-4 sm:pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Performance Insights
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold mt-0.5">
            Trainer Academic Analytics
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Monitor batch assignment submission rates, quiz pass percentages, and active academic alerts.
          </p>
        </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Aggregating batch learning metrics...
        </div>
      ) : analytics.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <TrendingUp className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Batch Analytics Available</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not currently have assigned active batches with registered submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {analytics.map((b) => (
            <div
              key={b.batchId}
              className="bg-white rounded-2xl border border-[#C9A24B]/25 p-6 shadow-sm space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C9A24B]/15 pb-4">
                <div>
                  <span className="text-xs text-[#6D1A2B] font-bold uppercase tracking-wider block">
                    Batch: {b.batchCode}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-[#2A0F16]">
                    {b.courseTitle}
                  </h3>
                </div>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-[#FFFBF5] border border-[#C9A24B]/30 font-semibold text-[#2A0F16]">
                  {b.studentCount} Active Learners
                </span>
              </div>

              {/* 4 KPIs for Batch */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1">
                  <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 block font-medium truncate">
                    Syllabus Coverage
                  </span>
                  <span className="text-xl sm:text-2xl font-serif font-bold text-[#2A0F16] block">
                    {b.syllabusCoveragePercent}%
                  </span>
                  <span className="text-[10px] text-[#2A0F16]/50 block truncate">Verified Sessions</span>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1">
                  <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 block font-medium truncate">
                    Assignment Rate
                  </span>
                  <span className="text-xl sm:text-2xl font-serif font-bold text-[#6D1A2B] block">
                    {b.assignmentSubmissionRate}%
                  </span>
                  <span className="text-[10px] text-[#2A0F16]/50 block truncate">Delivered vs Expected</span>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1">
                  <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 block font-medium truncate">
                    Quiz Pass Rate
                  </span>
                  <span className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 block">
                    {b.quizPassRate}%
                  </span>
                  <span className="text-[10px] text-[#2A0F16]/50 block truncate">Attempt Success</span>
                </div>

                <div className="p-3 sm:p-4 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/20 space-y-1">
                  <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 block font-medium truncate">
                    Academic Alerts
                  </span>
                  <span
                    className={`text-xl sm:text-2xl font-serif font-bold block ${
                      b.activeAlertsCount > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {b.activeAlertsCount}
                  </span>
                  <span className="text-[10px] text-[#2A0F16]/50 block truncate">Needs Follow-Up</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </AppShell>
  );
}
