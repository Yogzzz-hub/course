"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Edit3,
  ExternalLink,
  ChevronRight,
  Download,
} from "lucide-react";

interface AdmissionRecord {
  id: string;
  registrationNumber: string;
  leadId?: string | null;
  studentProfileId?: string | null;
  courseId: string;
  targetBatchId?: string | null;
  agreedFee: number;
  discountAmount: number;
  discountReason?: string | null;
  schedulePreference: string;
  status: string;
  notes?: string | null;
  financialHold: boolean;
  createdAt: string;
  course: { id: string; code: string; title: string };
  targetBatch?: { id: string; code: string; scheduleType: string } | null;
  studentProfile?: {
    id: string;
    registrationNumber: string;
    user: { name: string; email: string; phone?: string | null };
  } | null;
  lead?: { fullName: string; email: string; phone: string } | null;
}

export default function AdminAdmissionsPage() {
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; title: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; code: string; courseId: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Modal edit form state
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editTargetBatchId, setEditTargetBatchId] = useState("");
  const [editFinancialHold, setEditFinancialHold] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  const loadData = async () => {
    try {
      const [admRes, courseRes, batchRes] = await Promise.all([
        fetch("/api/admissions"),
        fetch("/api/admin/courses"),
        fetch("/api/admin/batches"),
      ]);

      if (admRes.ok) {
        const data = await admRes.json();
        setAdmissions(data.admissions || []);
      }
      if (courseRes.ok) {
        const data = await courseRes.json();
        setCourses(data.courses || []);
      }
      if (batchRes.ok) {
        const data = await batchRes.json();
        setBatches(data.batches || []);
      }
    } catch (err) {
      console.error("Failed to load admissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (adm: AdmissionRecord) => {
    setSelectedAdmission(adm);
    setEditStatus(adm.status);
    setEditTargetBatchId(adm.targetBatchId || "");
    setEditFinancialHold(adm.financialHold || false);
    setEditNotes(adm.notes || "");
    setIsEditModalOpen(true);
    setFeedbackMsg("");
  };

  const handleUpdateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmission) return;

    setActionLoading(true);
    setFeedbackMsg("");

    try {
      const res = await fetch(`/api/admissions/${selectedAdmission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          targetBatchId: editTargetBatchId || null,
          financialHold: editFinancialHold,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg("Admission record successfully updated.");
        await loadData();
        setTimeout(() => {
          setIsEditModalOpen(false);
          setSelectedAdmission(null);
        }, 1200);
      } else {
        setFeedbackMsg(data.error || "Failed to update admission");
      }
    } catch (err: any) {
      setFeedbackMsg(err.message || "Network error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Admissions
  const filtered = admissions.filter((adm) => {
    const studentName =
      adm.studentProfile?.user?.name || adm.lead?.fullName || "";
    const email = adm.studentProfile?.user?.email || adm.lead?.email || "";
    const regNum = adm.registrationNumber || "";

    const matchesSearch =
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regNum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "FINANCIAL_HOLD"
        ? adm.financialHold
        : adm.status === statusFilter;

    const matchesCourse =
      courseFilter === "ALL" ? true : adm.courseId === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Calculate stats
  const totalCount = admissions.length;
  const activeCount = admissions.filter((a) => a.status === "ACTIVE").length;
  const pendingCount = admissions.filter(
    (a) => a.status === "DRAFT" || a.status === "PENDING_APPROVAL"
  ).length;
  const holdCount = admissions.filter((a) => a.financialHold).length;
  const totalAgreedTuition = admissions.reduce(
    (sum, a) => sum + Math.max(0, a.agreedFee - (a.discountAmount || 0)),
    0
  );

  return (
    <AppShell
      user={{
        name: "Executive Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Academy Registry & Enrollment
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Admissions Governance
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Complete administrative authority over student registrations, batch assignments, tuition agreements, and financial status holds.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/manager/enquiries"
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Process New Admission</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <MetricCard
          title="Total Admissions"
          value={totalCount}
          subtitle="All-time registered"
          icon={<FileText className="w-5 h-5 text-[#6D1A2B]" />}
        />
        <MetricCard
          title="Active Students"
          value={activeCount}
          subtitle="Enrolled & Learning"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Pending Review"
          value={pendingCount}
          subtitle="Draft / Approval"
          icon={<Users className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          title="Financial Holds"
          value={holdCount}
          subtitle="Restricted Access"
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        />
        <div className="col-span-2 lg:col-span-1">
          <MetricCard
            title="Committed Tuition"
            value={formatCurrency(totalAgreedTuition)}
            subtitle="Net Tuition Agreements"
            icon={<DollarSign className="w-5 h-5 text-[#C9A24B]" />}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student, reg #, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-base sm:text-xs min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#6D1A2B] text-[#2A0F16]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-stone-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter admissions by status"
              className="w-full sm:w-auto text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl px-3 py-2 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="APPROVED">APPROVED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="FINANCIAL_HOLD">ON FINANCIAL HOLD</option>
              <option value="WITHDRAWN">WITHDRAWN</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label="Filter admissions by course"
            className="w-full sm:w-auto text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-xl px-3 py-2 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admissions Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">
            Official Admissions Ledger
          </h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {filtered.length} of {admissions.length} Displayed
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-stone-500 animate-pulse">
            Loading admissions registry...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 italic">
            No admission records found matching current criteria.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filtered.map((adm) => {
                const name =
                  adm.studentProfile?.user?.name || adm.lead?.fullName || "Student";
                const email =
                  adm.studentProfile?.user?.email || adm.lead?.email || "—";
                const phone =
                  adm.studentProfile?.user?.phone || adm.lead?.phone || "—";
                const netFee = Math.max(0, adm.agreedFee - (adm.discountAmount || 0));

                return (
                  <div key={adm.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[#6D1A2B] text-xs">
                          {adm.registrationNumber}
                        </span>
                        <h3 className="font-bold text-sm text-[#2A0F16] mt-0.5">{name}</h3>
                        <p className="text-[11px] font-mono text-stone-500">{email} • {phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={adm.status} size="sm" />
                        {adm.financialHold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            HOLD
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            CLEAR
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-[#FFFBF5] p-2 rounded-xl border border-stone-200/60">
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">Course</span>
                        <span className="font-bold text-[#2A0F16]">{adm.course.code}</span>
                        <p className="text-[10px] text-stone-500 truncate">{adm.course.title}</p>
                      </div>

                      <div className="bg-[#FFFBF5] p-2 rounded-xl border border-stone-200/60">
                        <span className="text-[10px] text-stone-400 font-semibold block uppercase">Cohort Batch</span>
                        {adm.targetBatch ? (
                          <span className="font-mono font-bold text-stone-800">
                            {adm.targetBatch.code}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">Unassigned</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-stone-500">Agreed Net Tuition:</span>
                      <div className="text-right">
                        <span className="font-bold text-sm text-[#2A0F16]">
                          {formatCurrency(netFee)}
                        </span>
                        {adm.discountAmount > 0 && (
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            Disc: {formatCurrency(adm.discountAmount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(adm)}
                      className="min-h-[44px] w-full rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-[#6D1A2B] hover:bg-stone-100 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Manage Admission Record</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                  <tr>
                    <th className="py-3 px-4">Reg #</th>
                    <th className="py-3 px-4">Student Name & Contact</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Batch Allocation</th>
                    <th className="py-3 px-4">Net Tuition</th>
                    <th className="py-3 px-4">Financial Status</th>
                    <th className="py-3 px-4">Admission Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map((adm) => {
                    const name =
                      adm.studentProfile?.user?.name || adm.lead?.fullName || "Student";
                    const email =
                      adm.studentProfile?.user?.email || adm.lead?.email || "—";
                    const phone =
                      adm.studentProfile?.user?.phone || adm.lead?.phone || "—";
                    const netFee = Math.max(0, adm.agreedFee - (adm.discountAmount || 0));

                    return (
                      <tr key={adm.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                          {adm.registrationNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#2A0F16]">{name}</div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            {email} | {phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#2A0F16]">{adm.course.code}</div>
                          <div className="text-[11px] text-stone-500 line-clamp-1">
                            {adm.course.title}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {adm.targetBatch ? (
                            <span className="font-mono font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              {adm.targetBatch.code}
                            </span>
                          ) : (
                            <span className="text-stone-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#2A0F16]">
                            {formatCurrency(netFee)}
                          </div>
                          {adm.discountAmount > 0 && (
                            <div className="text-[10px] text-emerald-700 font-medium">
                              Discount: {formatCurrency(adm.discountAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {adm.financialHold ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" />
                              HOLD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              CLEAR
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={adm.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openEditModal(adm)}
                            className="min-h-[36px] px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-[#6D1A2B] hover:bg-stone-100 transition-colors inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Edit Admission Modal */}
      {isEditModalOpen && selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#2A0F16]/20 shadow-2xl max-w-lg w-full p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-[#2A0F16]">
                  Manage Admission Record
                </h3>
                <p className="text-xs font-mono text-[#6D1A2B] font-semibold">
                  {selectedAdmission.registrationNumber}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 text-lg font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`mt-4 p-3 rounded-xl text-xs font-medium ${
                  feedbackMsg.includes("successfully")
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleUpdateAdmission} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#2A0F16] mb-1">
                  Admission Lifecycle Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PENDING_DOCS">PENDING_DOCS</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="ACTIVE">ACTIVE (Enrolled & Active)</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="WITHDRAWN">WITHDRAWN</option>
                  <option value="GRADUATED">GRADUATED</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Setting status to ACTIVE immediately validates student enrollment in the allocated cohort.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#2A0F16] mb-1">
                  Target Cohort Batch
                </label>
                <select
                  value={editTargetBatchId}
                  onChange={(e) => setEditTargetBatchId(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 bg-white text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                >
                  <option value="">No cohort batch allocated</option>
                  {batches
                    .filter((b) => b.courseId === selectedAdmission.courseId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#2A0F16] block">
                    Financial Status Hold
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Restrict portal access and course materials until tuition dues are resolved.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editFinancialHold}
                  onChange={(e) => setEditFinancialHold(e.target.checked)}
                  className="w-5 h-5 text-[#6D1A2B] rounded border-stone-300 focus:ring-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#2A0F16] mb-1">
                  Administrative Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for status change or financial condition..."
                  className="w-full border border-stone-200 rounded-xl p-2.5 text-base sm:text-xs text-[#2A0F16] focus:outline-none focus:ring-2 focus:ring-[#6D1A2B]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] justify-center"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="min-h-[44px] justify-center"
                  isLoading={actionLoading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
