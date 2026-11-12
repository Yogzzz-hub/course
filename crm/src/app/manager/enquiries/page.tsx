"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from "lucide-react";

export default function ManagerEnquiriesPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Interaction / Stage update state
  const [updating, setUpdating] = useState(false);
  const [targetStatus, setTargetStatus] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [lostReason, setLostReason] = useState("");

  // Convert to Admission Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [agreedFee, setAgreedFee] = useState(3000);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [convertLoading, setConvertLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchLeads = async () => {
    try {
      const url = new URL("/api/leads", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (searchQuery) url.searchParams.set("q", searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (selectedLead) {
          const reloaded = data.leads.find((l: any) => l.id === selectedLead.id);
          if (reloaded) setSelectedLead(reloaded);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  // Load courses & batches for conversion
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch("/api/admin/courses"),
          fetch("/api/admin/batches"),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          setCourses(cData.courses || []);
        }
        if (bRes.ok) {
          const bData = await bRes.json();
          setBatches(bData.batches || []);
        }
      } catch (e) {}
    }
    loadMeta();
  }, []);

  const handleSelectLead = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
        setTargetStatus(data.lead.status);
        setFollowUpDate(
          data.lead.followUpDate
            ? new Date(data.lead.followUpDate).toISOString().split("T")[0]
            : ""
        );
        setNextAction(data.lead.nextAction || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setUpdating(true);
    setFeedbackMsg("");

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          followUpDate: followUpDate || null,
          nextAction: nextAction || null,
          activityNote: activityNote || null,
          lostReason: targetStatus === "LOST" ? lostReason : null,
        }),
      });

      const data = await res.json();
      setUpdating(false);

      if (res.ok) {
        setFeedbackMsg("Lead updated successfully.");
        setActivityNote("");
        handleSelectLead(selectedLead.id);
        fetchLeads();
      }
    } catch {
      setUpdating(false);
    }
  };

  // Convert Lead to Admission
  const handleConvertToAdmission = async () => {
    if (!selectedLead) return;
    setConvertLoading(true);
    setFeedbackMsg("");

    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.id,
          fullName: selectedLead.fullName,
          email: selectedLead.email,
          phone: selectedLead.phone,
          courseId: selectedLead.courseInterestId || courses[0]?.id,
          targetBatchId: targetBatchId || null,
          agreedFee: Number(agreedFee),
          discountAmount: Number(discountAmount),
          schedulePreference: selectedLead.schedulePreference || "WEEKDAYS",
          status: "APPROVED",
        }),
      });

      const data = await res.json();
      setConvertLoading(false);

      if (res.ok) {
        setFeedbackMsg(`Successfully admitted! Registration: ${data.registrationNumber}`);
        setShowConvertModal(false);
        handleSelectLead(selectedLead.id);
        fetchLeads();
      } else {
        alert(data.error || "Failed to convert lead to admission");
      }
    } catch {
      setConvertLoading(false);
    }
  };

  const stages = [
    "ALL",
    "NEW",
    "CONTACTED",
    "COUNSELLING_SCHEDULED",
    "INTERESTED",
    "APPLIED",
    "ADMITTED",
    "LOST",
  ];

  return (
    <AppShell
      user={{
        name: "Operations Manager",
        email: "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Admissions CRM
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Enquiries & Applicant Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Track inquiries through counseling stages and convert approved leads to registered students.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Stage Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {stages.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center justify-center ${
              statusFilter === st
                ? "bg-[#6D1A2B] text-white shadow-sm"
                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            {st.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Main CRM Grid: Leads List & Detail Slide-in */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Lead Directory */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-stone-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-stone-400 shrink-0" />
            <input
              type="text"
              placeholder="Search leads by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
              className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none bg-transparent"
            />
          </div>

          <div className="divide-y divide-stone-100 max-h-[650px] overflow-y-auto">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No enquiries found matching filter.
              </div>
            ) : (
              leads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;

                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#F6EBCF]/30 border-l-4 border-[#6D1A2B]"
                        : "hover:bg-stone-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#2A0F16]">
                        {lead.fullName}
                      </span>
                      <StatusBadge status={lead.status} size="sm" />
                    </div>

                    <p className="text-xs text-stone-500 mt-0.5">
                      {lead.email} • {lead.phone}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-stone-600">
                      <span>{lead.courseInterest?.title || "General Interest"}</span>
                      {lead.followUpDate && (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Follow-up: {formatDate(lead.followUpDate)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Lead Profile & Actions */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-6">
          {selectedLead ? (
            <>
              <div className="flex items-start justify-between border-b border-stone-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#2A0F16]">{selectedLead.fullName}</h2>
                  <p className="text-xs text-stone-500">{selectedLead.email}</p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">{selectedLead.phone}</p>
                </div>
                <StatusBadge status={selectedLead.status} />
              </div>

              {/* Convert Lead Action */}
              {selectedLead.status !== "ADMITTED" && selectedLead.status !== "LOST" && (
                <div className="p-4 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-[#6D1A2B] block">
                      Ready for Admission?
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Generate official registration and enroll student.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Admit Student</span>
                  </button>
                </div>
              )}

              {/* Status & Next Action Form */}
              <form onSubmit={handleUpdateLead} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#2A0F16] mb-1">
                    Pipeline Stage *
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 font-semibold focus:ring-2 focus:ring-[#6D1A2B] bg-white"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="COUNSELLING_SCHEDULED">Counselling Scheduled</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="APPLIED">Applied</option>
                    <option value="ADMITTED">Admitted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                {targetStatus === "LOST" && (
                  <div>
                    <label className="block font-semibold text-rose-800 mb-1">
                      Reason for Lost Lead *
                    </label>
                    <input
                      type="text"
                      required
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      placeholder="e.g. Relocating, chose alternative timing..."
                      className="w-full px-3 py-2.5 rounded-lg border border-rose-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#2A0F16] mb-1">
                      Next Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#2A0F16] mb-1">
                      Next Action Item
                    </label>
                    <input
                      type="text"
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      placeholder="e.g. Send syllabus PDF"
                      className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs min-h-[44px] sm:min-h-0 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#2A0F16] mb-1">
                    Log Activity / Consultation Note
                  </label>
                  <textarea
                    rows={2}
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder="Record conversation summary..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base sm:text-xs bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  isLoading={updating}
                  className="w-full min-h-[44px] py-2.5 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold rounded-xl"
                >
                  Save Lead Updates
                </Button>
              </form>

              {/* Activity Log Trail */}
              <div>
                <span className="text-xs font-bold text-[#2A0F16] uppercase block mb-2">
                  Interaction History ({selectedLead.activities?.length || 0})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedLead.activities?.map((act: any) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-lg bg-[#FFFBF5] border border-stone-100 text-xs text-stone-700"
                    >
                      <div className="flex items-center justify-between text-[10px] text-stone-400 mb-0.5">
                        <span className="font-semibold text-stone-600">{act.actionType}</span>
                        <span>{formatDate(act.createdAt)}</span>
                      </div>
                      <p>{act.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400 italic">
              Select an enquiry from the left list to view details and manage follow-ups.
            </div>
          )}
        </div>
      </div>

      {/* Convert to Admission Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-elevated">
            <h3 className="text-base font-bold text-[#2A0F16]">
              Convert {selectedLead.fullName} to Registered Admission
            </h3>
            <p className="text-xs text-stone-600">
              This creates an official Admission record and unique Registration ID.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Batch</label>
                <select
                  value={targetBatchId}
                  onChange={(e) => setTargetBatchId(e.target.value)}
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 border rounded-lg bg-white"
                >
                  <option value="">Propose Batch Later</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.course.code}) - {b.scheduleType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Total Agreed Fee ($)</label>
                <input
                  type="number"
                  value={agreedFee}
                  onChange={(e) => setAgreedFee(Number(e.target.value))}
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Authorized Scholarship / Discount ($)</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 border rounded-xl text-xs font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <Button
                onClick={handleConvertToAdmission}
                isLoading={convertLoading}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-bold rounded-xl"
              >
                Confirm Admission
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
