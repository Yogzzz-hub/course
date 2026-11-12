import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Plus, Search, Trash2, Video, Edit3, AlertCircle } from "lucide-react";
import type { CohortSeat } from "./types";
import {
  computeDurationLabel,
  formatDateLabel,
  formatTime12h,
  type ScheduledClassItem,
} from "../../utils/classScheduleStore";
import { ResponsiveTable } from "./ResponsiveTable";

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
}

export function ScheduleClassesView({
  cohorts,
  classes,
  initialBatchCode,
  onSaveClass,
  onDeleteClass,
  onAddToast,
}: {
  cohorts: CohortSeat[];
  classes: ScheduledClassItem[];
  initialBatchCode?: string;
  onSaveClass: (item: ScheduledClassItem, isEdit: boolean) => void;
  onDeleteClass: (id: string) => void;
  onAddToast: (toast: {
    type: "success" | "info" | "warning" | "danger";
    title: string;
    message: string;
  }) => void;
}) {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [batchCode, setBatchCode] = useState(
    initialBatchCode || cohorts[0]?.code || "BATCH-PY-2026-A"
  );
  const [topic, setTopic] = useState("");
  const [dateIso, setDateIso] = useState(todayIso);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [roomLink, setRoomLink] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const [filterBatch, setFilterBatch] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialBatchCode) {
      setBatchCode(initialBatchCode);
    }
  }, [initialBatchCode]);

  const selectedCohort = cohorts.find((c) => c.code === batchCode) || cohorts[0];
  const calculatedDuration = computeDurationLabel(startTime, endTime);

  const resetForm = () => {
    setTopic("");
    setDateIso(todayIso);
    setStartTime("10:00");
    setEndTime("12:00");
    setRoomLink("");
    setEditingId(null);
    setFormError("");
  };

  const handleStartEdit = (item: ScheduledClassItem) => {
    setEditingId(item.id);
    setBatchCode(item.batchCode);
    setTopic(item.topic);
    setDateIso(item.dateIso || todayIso);
    setStartTime(item.startTime || "10:00");
    setEndTime(item.endTime || "12:00");
    setRoomLink(item.roomLink);
    setFormError("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setFormError("Please enter the class topic.");
      return;
    }

    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    if (startMins < 0 || endMins <= startMins) {
      setFormError("End time must be later than start time.");
      return;
    }

    const conflict = classes.find((existing) => {
      if (editingId && existing.id === editingId) return false;
      if (existing.batchCode !== batchCode) return false;
      if (existing.dateIso !== dateIso) return false;
      if (!existing.startTime || !existing.endTime) return false;
      const exStart = parseTimeToMinutes(existing.startTime);
      const exEnd = parseTimeToMinutes(existing.endTime);
      return startMins < exEnd && exStart < endMins;
    });

    if (conflict) {
      setFormError(
        `Time conflict for ${batchCode} on ${formatDateLabel(dateIso)}: overlaps with "${conflict.topic}" (${conflict.time}).`
      );
      return;
    }

    const defaultRoomSlug = batchCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newItem: ScheduledClassItem = {
      id: editingId || `SCH-${Date.now().toString().slice(-4)}`,
      batchCode,
      batchName: selectedCohort?.name || batchCode,
      facultyName: selectedCohort?.facultyName || "Assigned Faculty",
      topic: trimmedTopic,
      date: formatDateLabel(dateIso),
      dateIso,
      startTime,
      endTime,
      time: `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`,
      duration: calculatedDuration || "2 Hours",
      roomLink: roomLink.trim() || `https://meet.aintrix.edu/${defaultRoomSlug}`,
      status: "UPCOMING",
    };

    onSaveClass(newItem, Boolean(editingId));
    onAddToast({
      type: "success",
      title: editingId ? "Class Rescheduled" : "Class Scheduled",
      message: `${newItem.batchCode} · ${newItem.date} (${newItem.time})`,
    });
    resetForm();
  };

  const filteredClasses = classes.filter((item) => {
    const matchesBatch = filterBatch === "ALL" || item.batchCode === filterBatch;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      item.topic.toLowerCase().includes(q) ||
      item.batchName.toLowerCase().includes(q) ||
      item.batchCode.toLowerCase().includes(q) ||
      (item.facultyName || "").toLowerCase().includes(q);
    return matchesBatch && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Schedule Class Composer */}
      <div
        className="p-4 rounded-xl border shadow-2xs space-y-3"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {editingId ? "Reschedule Class Session" : "Schedule Class by Batch & Time"}
            </h2>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              Assign a cohort batch, date, and time window. Updates sync directly to the trainer timetable.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border p-2.5 text-xs"
            style={{
              backgroundColor: "rgba(185, 28, 28, 0.08)",
              borderColor: "rgba(185, 28, 28, 0.25)",
              color: "#991B1B",
            }}
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="mgr-schedule-batch"
                className="font-semibold block text-[11px]"
                style={{ color: "var(--text)" }}
              >
                Batch / Cohort
              </label>
              <select
                id="mgr-schedule-batch"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.code}>
                    {cohort.code} — {cohort.name}
                  </option>
                ))}
              </select>
              {selectedCohort && (
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                  Trainer: <strong style={{ color: "var(--text)" }}>{selectedCohort.facultyName}</strong>
                </div>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="mgr-schedule-topic"
                className="font-semibold block text-[11px]"
                style={{ color: "var(--text)" }}
              >
                Class Topic / Module
              </label>
              <input
                id="mgr-schedule-topic"
                type="text"
                required
                placeholder="e.g., JWT Auth & Role Permissions"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="mgr-schedule-date"
                className="font-semibold block text-[11px]"
                style={{ color: "var(--text)" }}
              >
                Date
              </label>
              <input
                id="mgr-schedule-date"
                type="date"
                required
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="mgr-schedule-start"
                  className="font-semibold block text-[11px]"
                  style={{ color: "var(--text)" }}
                >
                  Start Time
                </label>
                <input
                  id="mgr-schedule-start"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="mgr-schedule-end"
                  className="font-semibold block text-[11px]"
                  style={{ color: "var(--text)" }}
                >
                  End Time
                </label>
                <input
                  id="mgr-schedule-end"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="flex-1 space-y-1">
              <label
                htmlFor="mgr-schedule-room"
                className="font-semibold block text-[11px]"
                style={{ color: "var(--text)" }}
              >
                Classroom / Meeting Link (Optional)
              </label>
              <input
                id="mgr-schedule-room"
                type="url"
                placeholder={`https://meet.aintrix.edu/${batchCode.toLowerCase()}`}
                value={roomLink}
                onChange={(e) => setRoomLink(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs focus:outline-none min-h-[44px]"
                style={{
                  backgroundColor: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {calculatedDuration && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  <Clock size={13} />
                  {calculatedDuration}
                </span>
              )}

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity shadow-xs hover:opacity-90 cursor-pointer min-h-[44px]"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-text)",
                }}
              >
                <Plus size={15} />
                <span>{editingId ? "Update Class" : "Schedule Class"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filter Toolbar */}
      <div
        className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterBatch("ALL")}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
            style={{
              backgroundColor:
                filterBatch === "ALL" ? "var(--btn-primary-bg)" : "var(--bg-secondary)",
              color: filterBatch === "ALL" ? "var(--btn-primary-text)" : "var(--text)",
            }}
          >
            All Batches ({classes.length})
          </button>
          {cohorts.map((cohort) => {
            const count = classes.filter((c) => c.batchCode === cohort.code).length;
            const active = filterBatch === cohort.code;
            return (
              <button
                key={cohort.id}
                type="button"
                onClick={() => setFilterBatch(cohort.code)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap min-h-[38px]"
                style={{
                  backgroundColor: active ? "var(--btn-primary-bg)" : "var(--bg-secondary)",
                  color: active ? "var(--btn-primary-text)" : "var(--text)",
                }}
              >
                {cohort.code} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="search"
            placeholder="Search topic or trainer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs focus:outline-none min-h-[38px]"
            style={{
              backgroundColor: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          />
        </div>
      </div>

      {/* Scheduled Classes Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <ResponsiveTable className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                <th className="py-2.5 px-3.5">Batch &amp; Trainer</th>
                <th className="py-2.5 px-3.5">Topic</th>
                <th className="py-2.5 px-3.5">Date &amp; Time</th>
                <th className="py-2.5 px-3.5">Duration</th>
                <th className="py-2.5 px-3.5">Room</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-xs" style={{ color: "var(--muted)" }}>
                    No classes scheduled for this filter yet.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((item) => (
                  <tr key={item.id} className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                    <td className="py-2.5 px-3.5" data-label="Batch">
                      <span
                        className="font-mono text-[10px] font-semibold block"
                        style={{ color: "var(--accent)" }}
                      >
                        {item.batchCode}
                      </span>
                      <span className="font-medium text-xs block" style={{ color: "var(--text)" }}>
                        {item.batchName}
                      </span>
                      {item.facultyName && (
                        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                          {item.facultyName}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium" data-label="Topic" style={{ color: "var(--text)" }}>
                      {item.topic}
                    </td>
                    <td className="py-2.5 px-3.5" data-label="Date & Time">
                      <div className="font-medium flex items-center gap-1" style={{ color: "var(--text)" }}>
                        <Calendar size={12} style={{ color: "var(--accent)" }} />
                        <span>{item.date}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {item.time}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5" data-label="Duration" style={{ color: "var(--muted)" }}>
                      {item.duration}
                    </td>
                    <td className="py-2.5 px-3.5" data-label="Classroom">
                      <a
                        href={item.roomLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        <Video size={12} />
                        <span>Classroom</span>
                      </a>
                    </td>
                    <td className="py-2.5 px-3.5 text-right" data-label="Actions">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ borderColor: "var(--border)", color: "var(--text)" }}
                          title="Reschedule"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteClass(item.id);
                            onAddToast({
                              type: "info",
                              title: "Class Removed",
                              message: `Removed "${item.topic}" for ${item.batchCode}.`,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer hover:bg-red-50"
                          style={{ borderColor: "var(--border)", color: "#B91C1C" }}
                          title="Remove class"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>
    </div>
  );
}

