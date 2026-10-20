"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { ClipboardList, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function ManagerRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/approvals");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.leaveRequests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDecision = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setActionLoading(id);
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LEAVE_REQUEST",
          id,
          decision,
          reviewNotes: `Decision processed by Operations Manager on ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await res.json();
      setActionLoading(null);

      if (res.ok) {
        setFeedbackMsg(`Leave request has been ${decision.toLowerCase()}.`);
        fetchRequests();
      } else {
        alert(data.error || "Failed to process decision");
      }
    } catch {
      setActionLoading(null);
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
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Operations Reviews
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Student Leave & Petition Requests
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Review, approve, or reject student leave requests with documented justifications.
        </p>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">Pending Student Petitions</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {requests.length} Requests Pending
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No pending student leave requests requiring review.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-stone-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2A0F16]">
                      {req.studentProfile.user.name}
                    </span>
                    <span className="font-mono text-xs text-[#6D1A2B] font-semibold">
                      ({req.batch.code})
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                  </div>

                  <p className="text-stone-600">
                    <span className="font-semibold text-stone-800">Absence Period:</span>{" "}
                    {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                  </p>

                  <p className="text-stone-600">
                    <span className="font-semibold text-stone-800">Reason:</span> {req.reason}
                  </p>

                  <span className="text-[10px] text-stone-400 block pt-0.5">
                    Submitted on {formatDate(req.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <button
                    onClick={() => handleDecision(req.id, "REJECTED")}
                    disabled={actionLoading === req.id}
                    className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center justify-center"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => handleDecision(req.id, "APPROVED")}
                    disabled={actionLoading === req.id}
                    className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center"
                  >
                    Approve Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
