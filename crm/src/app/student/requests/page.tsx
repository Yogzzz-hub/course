"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function StudentRequestsPage() {
  const [user, setUser] = useState<any>(null);
  const [batchId, setBatchId] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    try {
      const [resUser, resReq] = await Promise.all([
        fetch("/api/student/me"),
        fetch("/api/student/leave"),
      ]);

      if (resUser.ok) {
        const uData = await resUser.json();
        setUser(uData);
        if (uData.enrollment) {
          setBatchId(uData.enrollment.batchId);
        }
      }

      if (resReq.ok) {
        const rData = await resReq.json();
        setRequests(rData.leaveRequests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!batchId) {
      setErrorMsg("No active batch enrollment identified.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/student/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, startDate, endDate, reason }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit request.");
        return;
      }

      setSuccessMsg("Leave request submitted successfully. Staff review is pending.");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchData();
    } catch {
      setSubmitting(false);
      setErrorMsg("Network error. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-xs text-stone-500 animate-pulse">
        <div className="w-8 h-8 rounded-full border-2 border-[#6D1A2B] border-t-transparent animate-spin mb-3" />
        Loading requests portal...
      </div>
    );
  }

  return (
    <AppShell
      user={{
        name: user?.student?.name || "Student",
        email: user?.student?.email || "",
        role: "STUDENT",
        registrationNumber: user?.student?.registrationNumber,
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Academic Petitions
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Leave & Operational Requests
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Submit absence requests for scheduled cohort sessions with supporting justification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Submit Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#6D1A2B]" />
              <span>Submit Leave Request</span>
            </h2>
            <p className="text-xs text-stone-500">
              Batch: {user?.enrollment?.batchCode || "No Active Batch"}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                Reason / Justification *
              </label>
              <textarea
                rows={4}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the reason for absence (e.g. medical consultation, emergency travel)..."
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <Button
              type="submit"
              isLoading={submitting}
              className="w-full py-3 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold min-h-[44px] flex items-center justify-center"
            >
              Submit Request to Operations
            </Button>
          </form>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#2A0F16]/10">
            <h2 className="text-base font-bold text-[#2A0F16]">Request History</h2>
            <p className="text-xs text-stone-500">
              Track review status and staff responses.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 italic">
              No leave requests submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {requests.map((req) => (
                <div key={req.id} className="p-4 space-y-2 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2A0F16]">
                      {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <p className="text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">Reason:</span> {req.reason}
                  </p>
                  {req.reviewNotes && (
                    <div className="p-2.5 rounded bg-[#FFFBF5] border border-stone-200 text-xs text-stone-600">
                      <span className="font-semibold text-stone-900 block">Staff Note:</span>
                      <span>{req.reviewNotes}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-stone-400 block">
                    Submitted on {formatDate(req.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
