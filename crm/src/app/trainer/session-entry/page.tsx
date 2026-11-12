"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  BookOpen,
  Send,
  Lock,
  Calendar,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";

function TrainerSessionEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialBatchId = searchParams.get("batchId") || "";
  const initialOccurrenceId = searchParams.get("occurrenceId") || "";
  const initialDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [sessionDate, setSessionDate] = useState(initialDate);
  const [occurrenceId, setOccurrenceId] = useState(initialOccurrenceId);

  // Form payload
  const [actualStartTime, setActualStartTime] = useState("10:00");
  const [actualEndTime, setActualEndTime] = useState("12:00");
  const [sessionType, setSessionType] = useState<
    "TEACHING" | "REVISION" | "ASSESSMENT" | "PROJECT_REVIEW" | "DOUBT_CLEARING" | "MAKEUP" | "OTHER"
  >("TEACHING");
  const [notes, setNotes] = useState("");

  // Loaded metadata
  const [students, setStudents] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, "PRESENT" | "ABSENT" | "LEAVE">>({});
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [backdateAuthorized, setBackdateAuthorized] = useState(true);
  const [existingSession, setExistingSession] = useState<any>(null);

  // Status
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 1. Fetch trainer's allocated batches
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch("/api/trainer/batches");
        if (res.ok) {
          const data = await res.json();
          setBatches(data.batches || []);
          if (!selectedBatchId && data.batches?.length > 0) {
            setSelectedBatchId(data.batches[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBatches();
  }, []);

  // 2. When batch or date changes, preload roster and syllabus
  useEffect(() => {
    if (!selectedBatchId) return;

    async function loadBatchDetails() {
      try {
        const res = await fetch(
          `/api/trainer/session-entry?batchId=${selectedBatchId}&date=${sessionDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
          setModules(data.modules || []);
          setExistingSession(data.existingSession);
          setBackdateAuthorized(data.backdateAuthorized);

          if (data.batch) {
            if (data.batch.startTime) setActualStartTime(data.batch.startTime);
            if (data.batch.endTime) setActualEndTime(data.batch.endTime);
          }

          // Default all students to PRESENT
          const initialAtt: Record<string, "PRESENT" | "ABSENT" | "LEAVE"> = {};
          (data.students || []).forEach((st: any) => {
            initialAtt[st.studentProfileId] = "PRESENT";
          });
          setAttendance(initialAtt);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadBatchDetails();
  }, [selectedBatchId, sessionDate]);

  // Bulk Attendance
  const markAllAttendance = (status: "PRESENT" | "ABSENT" | "LEAVE") => {
    const updated: Record<string, "PRESENT" | "ABSENT" | "LEAVE"> = {};
    students.forEach((s) => {
      updated[s.studentProfileId] = status;
    });
    setAttendance(updated);
  };

  const setStudentStatus = (id: string, status: "PRESENT" | "ABSENT" | "LEAVE") => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  };

  // Toggle Subtopic selection
  const toggleSubtopic = (id: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (existingSession) {
      setErrorMsg("A class session has already been submitted and locked for this date.");
      return;
    }

    if (!backdateAuthorized) {
      setErrorMsg("This date requires an approved Backdated Attendance Authorization.");
      return;
    }

    if (sessionType === "TEACHING" && selectedSubtopics.length === 0) {
      setErrorMsg("Please select at least one syllabus subtopic for teaching sessions.");
      return;
    }

    const attendanceArray = students.map((s) => ({
      studentProfileId: s.studentProfileId,
      status: attendance[s.studentProfileId] || "PRESENT",
    }));

    setSubmitting(true);

    try {
      const res = await fetch("/api/trainer/session-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: selectedBatchId,
          occurrenceId: occurrenceId || null,
          sessionDate,
          actualStartTime,
          actualEndTime,
          sessionType,
          notes,
          attendance: attendanceArray,
          subtopicIds: selectedSubtopics,
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit session.");
        return;
      }

      setSuccessMsg(data.message || "Session submitted and locked successfully!");
      // Redirect to class history after brief moment
      setTimeout(() => {
        router.push("/trainer/class-history");
      }, 1500);
    } catch {
      setSubmitting(false);
      setErrorMsg("Network communication error. Please try again.");
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
          Daily Teaching Operations
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Class Session Entry Form
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Atomic submission of student attendance, actual session times, and syllabus subtopics taught.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {existingSession && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <span>
              A session for this date is already locked ({existingSession.actualStartTime} – {existingSession.actualEndTime}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/trainer/corrections")}
            className="text-xs font-bold underline text-amber-800 hover:text-amber-950"
          >
            Request Correction
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Session Details */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2 border-b border-stone-100 pb-3">
            <Clock className="w-4 h-4 text-[#6D1A2B]" />
            <span>1. Session Timing & Cohort</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Assigned Batch *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white font-semibold min-h-[44px]"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} ({b.course.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Class Date *
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Actual Start Time *
              </label>
              <input
                type="time"
                required
                value={actualStartTime}
                onChange={(e) => setActualStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#2A0F16] mb-1">
                Actual End Time *
              </label>
              <input
                type="time"
                required
                value={actualEndTime}
                onChange={(e) => setActualEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2A0F16] mb-1.5 text-xs">
              Session Classification
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "TEACHING",
                "REVISION",
                "ASSESSMENT",
                "PROJECT_REVIEW",
                "DOUBT_CLEARING",
                "MAKEUP",
                "OTHER",
              ].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setSessionType(type as any)}
                  className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors border min-h-[40px] flex items-center justify-center ${
                    sessionType === type
                      ? "bg-[#6D1A2B] text-white border-[#6D1A2B]"
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Student Attendance Roster (Mobile Friendly) */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#6D1A2B]" />
                <span>2. Student Attendance Roster ({students.length} Enrolled)</span>
              </h2>
              <p className="text-xs text-stone-500">
                Mark each student Present, Absent, or Leave. All students must be marked.
              </p>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-500 font-medium">Quick set:</span>
              <button
                type="button"
                onClick={() => markAllAttendance("PRESENT")}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold hover:bg-emerald-100 transition-colors min-h-[38px] flex items-center justify-center"
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => markAllAttendance("ABSENT")}
                className="px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-xs font-semibold hover:bg-rose-100 transition-colors min-h-[38px] flex items-center justify-center"
              >
                All Absent
              </button>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {students.map((student) => {
              const currentStatus = attendance[student.studentProfileId] || "PRESENT";

              return (
                <div
                  key={student.studentProfileId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-[#2A0F16] block">
                      {student.name}
                    </span>
                    <span className="font-mono text-[11px] text-[#6D1A2B]">
                      {student.registrationNumber}
                    </span>
                  </div>

                  {/* Attendance State Selector Buttons (Touch Targets) */}
                  <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.studentProfileId, "PRESENT")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center ${
                        currentStatus === "PRESENT"
                          ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1"
                          : "bg-stone-100 text-stone-600 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                    >
                      Present
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.studentProfileId, "ABSENT")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center ${
                        currentStatus === "ABSENT"
                          ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600 ring-offset-1"
                          : "bg-stone-100 text-stone-600 hover:bg-rose-50 hover:text-rose-800"
                      }`}
                    >
                      Absent
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentStatus(student.studentProfileId, "LEAVE")}
                      className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all min-h-[44px] flex items-center justify-center ${
                        currentStatus === "LEAVE"
                          ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600 ring-offset-1"
                          : "bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-800"
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Syllabus Subtopic Coverage */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6D1A2B]" />
              <span>3. Delivered Syllabus Topics & Subtopics</span>
            </h2>
            <p className="text-xs text-stone-500">
              Select which subtopics were completed in this session. Only approved curriculum items appear.
            </p>
          </div>

          <div className="space-y-4">
            {modules.map((mod, idx) => (
              <div
                key={mod.id}
                className="p-4 rounded-xl border border-stone-200/60 bg-[#FFFBF5]/40 space-y-3"
              >
                <h3 className="font-bold text-xs sm:text-sm text-[#2A0F16]">
                  Module {idx + 1}: {mod.title.replace(/^module\s+\d+:\s*/i, "")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {mod.subtopics.map((st: any) => {
                    const isSelected = selectedSubtopics.includes(st.id);

                    return (
                      <label
                        key={st.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors min-h-[48px] ${
                          isSelected
                            ? "bg-[#F6EBCF]/60 border-[#C9A24B] text-[#4E0F1E] font-medium"
                            : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSubtopic(st.id)}
                          className="mt-0.5 w-4 h-4 rounded text-[#6D1A2B] focus:ring-[#6D1A2B] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block leading-snug">{st.title}</span>
                          {st.alreadyCovered && (
                            <span className="text-[10px] text-[#C9A24B] font-semibold block mt-0.5">
                              ✓ Previously Taught (Reinforcement)
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Class Notes */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-5 sm:p-6 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#6D1A2B]" />
            <span>4. Instructor Notes & Lab Observations</span>
          </h2>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record notes on practical lab challenges, comprehension checks, or student questions..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 text-base sm:text-xs focus:ring-2 focus:ring-[#6D1A2B] bg-white"
          />
        </div>

        {/* Final Submission Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFBF5] border border-[#2A0F16]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-stone-600">
            <span className="font-bold text-[#6D1A2B] block">
              Notice: Atomic Commitment & Automatic Locking
            </span>
            <span>
              Once submitted, this session will immediately lock. Attendance and syllabus progress will be recalculated atomically.
            </span>
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            disabled={!!existingSession || !backdateAuthorized}
            className="w-full sm:w-auto py-3.5 px-8 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white font-bold text-sm shadow-md min-h-[48px] flex items-center justify-center"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit & Lock Session
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

export default function TrainerSessionEntryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-stone-500">
          Loading session entry console...
        </div>
      }
    >
      <TrainerSessionEntryContent />
    </React.Suspense>
  );
}

