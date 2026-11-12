"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { Layers, Plus, Calendar, Clock, Users, User, CheckCircle2 } from "lucide-react";

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Batch Modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [courseId, setCourseId] = useState("");
  const [syllabusVersionId, setSyllabusVersionId] = useState("");
  const [trainerProfileId, setTrainerProfileId] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [trainingMode, setTrainingMode] = useState("Hybrid");
  const [scheduleType, setScheduleType] = useState<"WEEKDAYS" | "WEEKENDS" | "FLEXIBLE">("WEEKDAYS");
  const [classDays, setClassDays] = useState("Mon,Wed,Fri");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedEndDate, setExpectedEndDate] = useState(
    new Date(Date.now() + 112 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [creating, setCreating] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/admin/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();

    async function loadMeta() {
      try {
        const [cRes, uRes] = await Promise.all([
          fetch("/api/admin/courses"),
          fetch("/api/admin/users"),
        ]);
        if (cRes.ok) {
          const cData = await cRes.json();
          setCourses(cData.courses || []);
          if (cData.courses?.length > 0) {
            setCourseId(cData.courses[0].id);
            setSyllabusVersionId(cData.courses[0].syllabusVersions[0]?.id || "");
          }
        }
        if (uRes.ok) {
          const uData = await uRes.json();
          const trs = (uData.users || []).filter((u: any) => u.role === "TRAINER");
          setTrainers(trs);
          if (trs.length > 0) {
            // Need trainer profile id
            // fetch trainer profile list or use trainer API
          }
        }
      } catch (e) {}
    }
    loadMeta();
  }, []);

  // Update syllabus version when course changes
  const handleCourseSelect = (cid: string) => {
    setCourseId(cid);
    const sel = courses.find((c) => c.id === cid);
    if (sel && sel.syllabusVersions?.length > 0) {
      setSyllabusVersionId(sel.syllabusVersions[0].id);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Find trainer user's profile ID if trainer selected
      const resTr = await fetch("/api/trainer/batches");
      let trProfileId = trainerProfileId;
      if (!trProfileId) {
        // Fallback fetch first trainer
        const fTr = await fetch("/api/admin/approvals");
        // Or get from trainers array
      }

      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          courseId,
          syllabusVersionId,
          trainerProfileId: trainerProfileId || batches[0]?.trainerAllocations[0]?.trainerProfileId,
          capacity: Number(capacity),
          trainingMode,
          scheduleType,
          classDays,
          startTime,
          endTime,
          startDate,
          expectedEndDate,
        }),
      });

      const data = await res.json();
      setCreating(false);

      if (res.ok) {
        setFeedbackMsg(data.message || `Batch ${code} created successfully!`);
        setShowModal(false);
        setCode("");
        fetchBatches();
      } else {
        alert(data.error || "Failed to create batch");
      }
    } catch {
      setCreating(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Cohort Administration
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Batches & Timetable Generation
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Provision cohort schedules, bind syllabus versions, allocate faculty, and auto-generate class occurrences.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Provision New Batch</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Batches Content: Dual-Mode Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">Provisioned Batches</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {batches.length} Cohorts
          </span>
        </div>

        {/* Mobile Cards (block md:hidden) */}
        <div className="block md:hidden divide-y divide-stone-100">
          {batches.map((b) => {
            const trainer = b.trainerAllocations[0]?.trainerProfile?.user?.name || "Unassigned";

            return (
              <div key={b.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#6D1A2B]">
                      {b.code}
                    </span>
                    <h4 className="font-bold text-sm text-[#2A0F16] mt-0.5">
                      {b.course.title}
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Trainer: <span className="font-medium text-stone-800">{trainer}</span>
                    </p>
                  </div>
                  <StatusBadge status={b.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50/70 p-2.5 rounded-lg">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Schedule</span>
                    <span className="text-stone-700 font-medium block truncate">
                      {b.scheduleType} ({b.classDays})
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {b.startTime} – {b.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase font-medium">Enrollment</span>
                    <span className="font-mono text-stone-800 font-semibold block">
                      {b.enrollments.length} / {b.capacity} Students
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {b._count.occurrences} Sessions
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3 px-4">Batch Code</th>
                <th className="py-3 px-4">Course Program</th>
                <th className="py-3 px-4">Assigned Faculty</th>
                <th className="py-3 px-4">Schedule & Timings</th>
                <th className="py-3 px-4">Roster Capacity</th>
                <th className="py-3 px-4">Timetable</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.map((b) => {
                const trainer = b.trainerAllocations[0]?.trainerProfile?.user?.name || "Unassigned";

                return (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                      {b.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                      {b.course.title}
                    </td>
                    <td className="py-3.5 px-4 text-stone-700">{trainer}</td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {b.scheduleType} ({b.classDays}, {b.startTime} – {b.endTime})
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {b.enrollments.length} / {b.capacity} Students
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500">
                      {b._count.occurrences} Generated Sessions
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge status={b.status} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateBatch}
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-elevated text-xs max-h-[90vh] overflow-y-auto my-auto"
          >
            <h3 className="text-base font-bold text-[#2A0F16]">Provision Batch & Timetable</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Batch Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FS-2026-W2"
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg font-mono uppercase focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Student Capacity *</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Academic Program *</label>
              <select
                value={courseId}
                onChange={(e) => handleCourseSelect(e.target.value)}
                className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-[#6D1A2B]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Schedule Track *</label>
                <select
                  value={scheduleType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setScheduleType(val);
                    if (val === "WEEKENDS") setClassDays("Sat,Sun");
                    else setClassDays("Mon,Wed,Fri");
                  }}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-[#6D1A2B]"
                >
                  <option value="WEEKDAYS">Weekdays</option>
                  <option value="WEEKENDS">Weekends</option>
                  <option value="FLEXIBLE">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Class Days *</label>
                <input
                  type="text"
                  required
                  value={classDays}
                  onChange={(e) => setClassDays(e.target.value)}
                  placeholder="Mon,Wed,Fri"
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Start Time (HH:MM) *</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">End Time (HH:MM) *</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Cohort Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Expected End Date *</label>
                <input
                  type="date"
                  required
                  value={expectedEndDate}
                  onChange={(e) => setExpectedEndDate(e.target.value)}
                  className="w-full p-2.5 text-base sm:text-xs min-h-[44px] sm:min-h-0 border border-stone-200 rounded-lg focus:outline-none focus:border-[#6D1A2B]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] border border-stone-200 rounded-xl font-semibold hover:bg-stone-50"
              >
                Cancel
              </button>
              <Button
                type="submit"
                isLoading={creating}
                className="w-full sm:flex-1 py-2.5 min-h-[44px] rounded-xl bg-[#6D1A2B] text-white font-bold"
              >
                Generate Batch & Timetable
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
