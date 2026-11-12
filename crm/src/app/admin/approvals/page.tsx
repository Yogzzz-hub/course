"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Lock,
} from "lucide-react";

export default function AdminApprovalsPage() {
  const [data, setData] = useState<{
    corrections: any[];
    leaveRequests: any[];
    backdateAuthorizations: any[];
    completionDecisions: any[];
  }>({
    corrections: [],
    leaveRequests: [],
    backdateAuthorizations: [],
    completionDecisions: [],
  });

  const [activeTab, setActiveTab] = useState<
    "CORRECTIONS" | "LEAVES" | "BACKDATES" | "COMPLETIONS"
  >("CORRECTIONS");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/admin/approvals");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (
    type: "CORRECTION_REQUEST" | "LEAVE_REQUEST" | "STUDENT_COMPLETION",
    id: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setActionLoading(id);
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id,
          decision,
          reviewNotes: `Decision processed by Executive Admin on ${new Date().toLocaleDateString()}`,
        }),
      });

      const resData = await res.json();
      setActionLoading(null);

      if (res.ok) {
        setFeedbackMsg(resData.message || "Approval decision committed.");
        fetchApprovals();
      } else {
        alert(resData.error || "Failed to process decision");
      }
    } catch {
      setActionLoading(null);
    }
  };

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Governance Queues
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academic Operations Approval Queue
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review locked session corrections, student leave requests, and academic completion recommendations.
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-[#2A0F16]/10 gap-2 pb-1 sm:pb-0">
        <button
          onClick={() => setActiveTab("CORRECTIONS")}
          className={`min-h-[44px] py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "CORRECTIONS"
              ? "border-[#6D1A2B] text-[#6D1A2B]"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Session Corrections</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px]">
            {data.corrections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("LEAVES")}
          className={`min-h-[44px] py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "LEAVES"
              ? "border-[#6D1A2B] text-[#6D1A2B]"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Student Leave Requests</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px]">
            {data.leaveRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("BACKDATES")}
          className={`min-h-[44px] py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "BACKDATES"
              ? "border-[#6D1A2B] text-[#6D1A2B]"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Backdate Authorizations</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px]">
            {data.backdateAuthorizations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMPLETIONS")}
          className={`min-h-[44px] py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "COMPLETIONS"
              ? "border-[#6D1A2B] text-[#6D1A2B]"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <span>Academic Completion Decisions</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-100 text-[10px]">
            {data.completionDecisions.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        {/* Corrections Tab */}
        {activeTab === "CORRECTIONS" && (
          <div>
            {data.corrections.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No pending session correction requests in the queue.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {data.corrections.map((corr) => (
                  <div
                    key={corr.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#2A0F16]">
                          Batch {corr.classSession.batch.code} • Field: {corr.targetField}
                        </span>
                        <StatusBadge status={corr.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#FFFBF5] border border-stone-200 font-mono text-[11px]">
                        <div>
                          <span className="text-stone-400 block">Existing Value:</span>
                          <span className="text-stone-700">{corr.oldValue}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block">Proposed Value:</span>
                          <span className="text-[#6D1A2B] font-bold">{corr.proposedValue}</span>
                        </div>
                      </div>

                      <p className="text-stone-600">
                        <span className="font-semibold text-stone-800">Reason:</span> {corr.reason}
                      </p>

                      <span className="text-[10px] text-stone-400 block">
                        Proposed by {corr.requestedBy.name} on {formatDate(corr.createdAt)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleDecision("CORRECTION_REQUEST", corr.id, "REJECTED")}
                        disabled={actionLoading === corr.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center justify-center"
                      >
                        Reject Proposal
                      </button>

                      <button
                        onClick={() => handleDecision("CORRECTION_REQUEST", corr.id, "APPROVED")}
                        disabled={actionLoading === corr.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center"
                      >
                        Approve & Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaves Tab */}
        {activeTab === "LEAVES" && (
          <div>
            {data.leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No pending leave requests requiring review.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {data.leaveRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#2A0F16]">
                          {req.studentProfile.user.name}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#6D1A2B]">
                          ({req.batch.code})
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <p className="text-stone-600">
                        <span className="font-semibold text-stone-800">Period:</span>{" "}
                        {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                      </p>
                      <p className="text-stone-600">
                        <span className="font-semibold text-stone-800">Reason:</span> {req.reason}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleDecision("LEAVE_REQUEST", req.id, "REJECTED")}
                        disabled={actionLoading === req.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center justify-center"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleDecision("LEAVE_REQUEST", req.id, "APPROVED")}
                        disabled={actionLoading === req.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center"
                      >
                        Approve Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Backdates Tab */}
        {activeTab === "BACKDATES" && (
          <div>
            {data.backdateAuthorizations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No active backdate authorizations currently granted.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {data.backdateAuthorizations.map((auth) => (
                  <div key={auth.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-sm text-[#2A0F16]">
                        Faculty: {auth.trainerProfile.user.name}
                      </span>
                      <p className="text-stone-600 mt-0.5">
                        Authorized Date: <span className="font-bold text-[#6D1A2B]">{formatDate(auth.allowedDate)}</span>
                      </p>
                      <p className="text-stone-500 text-[11px] mt-0.5">Reason: {auth.reason}</p>
                    </div>
                    <div className="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                      <span className="text-[11px] text-stone-500 block">Expires:</span>
                      <span className="font-mono text-xs text-stone-800 font-bold">
                        {new Date(auth.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completions Tab */}
        {activeTab === "COMPLETIONS" && (
          <div>
            {data.completionDecisions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No pending student completion decisions awaiting executive sign-off.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {data.completionDecisions.map((comp) => (
                  <div
                    key={comp.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-[#2A0F16]">
                        {comp.studentProfile.user.name} ({comp.batch.code})
                      </span>
                      <p className="text-stone-600">
                        Attendance: <span className="font-bold">{comp.attendancePercentage}%</span> •
                        Syllabus: <span className="font-bold">{comp.syllabusPercentage}%</span>
                      </p>
                      <p className="text-stone-500">
                        Eligibility Requirement: 100% Attendance Threshold
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleDecision("STUDENT_COMPLETION", comp.id, "REJECTED")}
                        disabled={actionLoading === comp.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center"
                      >
                        Reject Completion
                      </button>
                      <button
                        onClick={() => handleDecision("STUDENT_COMPLETION", comp.id, "APPROVED")}
                        disabled={actionLoading === comp.id}
                        className="min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center"
                      >
                        Approve Graduation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
