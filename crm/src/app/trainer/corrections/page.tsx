"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Plus, Clock, Lock } from "lucide-react";

function TrainerCorrectionsContent() {
  const searchParams = useSearchParams();
  const preselectedSessionId = searchParams.get("sessionId") || "";

  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [classSessionId, setClassSessionId] = useState(preselectedSessionId);
  const [targetField, setTargetField] = useState("notes");
  const [oldValue, setOldValue] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchCorrections = async () => {
    try {
      const res = await fetch("/api/trainer/corrections");
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    setSubmitting(true);
    try {
      const res = await fetch("/api/trainer/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classSessionId,
          targetField,
          oldValue,
          proposedValue,
          reason,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit correction request.");
        return;
      }

      setSuccessMsg("Correction request submitted. Staff review is pending.");
      setOldValue("");
      setProposedValue("");
      setReason("");
      fetchCorrections();
    } catch {
      setSubmitting(false);
      setErrorMsg("Network error.");
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
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Audit-Logged Adjustments
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Session Correction Requests
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Trainers cannot edit locked sessions directly. Propose adjustments with previous and proposed values for authorized manager/admin review.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#6D1A2B]" />
              <span>Submit Correction Proposal</span>
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Class Session ID *
              </label>
              <input
                type="text"
                required
                value={classSessionId}
                onChange={(e) => setClassSessionId(e.target.value)}
                placeholder="Paste Session ID from Class History"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Target Field Requiring Correction *
              </label>
              <select
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              >
                <option value="notes">Class Notes / Summary</option>
                <option value="actualStartTime">Actual Start Time</option>
                <option value="actualEndTime">Actual End Time</option>
                <option value="attendance">Student Attendance Mark</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Existing (Current) Recorded Value *
              </label>
              <input
                type="text"
                required
                value={oldValue}
                onChange={(e) => setOldValue(e.target.value)}
                placeholder="Current locked value"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Proposed Corrected Value *
              </label>
              <input
                type="text"
                required
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder="Proposed corrected value"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Reason & Context *
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this adjustment is required..."
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white"
              />
            </div>

            <Button
              type="submit"
              isLoading={submitting}
              className="w-full min-h-[44px] py-2.5 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold"
            >
              Submit to Manager / Admin Review
            </Button>
          </form>
        </div>

        {/* Right History */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#2A0F16]/10">
            <h2 className="text-base font-bold text-[#2A0F16]">Correction Request Queue</h2>
            <p className="text-xs text-stone-500">
              Status of your submitted proposals and review notes.
            </p>
          </div>

          {corrections.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 italic">
              No correction requests submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {corrections.map((item) => (
                <div key={item.id} className="p-4 space-y-2 hover:bg-stone-50/50 transition-colors text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2A0F16]">
                      Batch {item.classSession?.batch?.code} • Field: {item.targetField}
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded bg-[#FFFBF5] border border-stone-200/50 font-mono text-[11px]">
                    <div>
                      <span className="text-stone-400 block">Existing:</span>
                      <span className="text-stone-800">{item.oldValue}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Proposed:</span>
                      <span className="text-[#6D1A2B] font-bold">{item.proposedValue}</span>
                    </div>
                  </div>

                  <p className="text-stone-600">
                    <span className="font-semibold text-stone-800">Reason:</span> {item.reason}
                  </p>

                  {item.reviewNotes && (
                    <p className="text-stone-600 bg-stone-50 p-2 rounded">
                      <span className="font-semibold text-stone-800">Review Note:</span> {item.reviewNotes}
                    </p>
                  )}

                  <span className="text-[10px] text-stone-400 block">
                    Submitted on {formatDate(item.createdAt)}
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

export default function TrainerCorrectionsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-stone-500">
          Loading corrections...
        </div>
      }
    >
      <TrainerCorrectionsContent />
    </React.Suspense>
  );
}

