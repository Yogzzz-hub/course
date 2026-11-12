import React, { useState } from "react";
import type { TrainerBatch } from "../../data/trainerMock";
import { Drawer } from "../manager-portal/Drawer";

export function BatchesView({
  batches,
  onTakeAttendance,
}: {
  batches: TrainerBatch[];
  onTakeAttendance: (batch: TrainerBatch) => void;
}) {
  const [selectedBatch, setSelectedBatch] = useState<TrainerBatch | null>(null);

  return (
    <div className="space-y-3">
      {/* Batches Grid - NO headings or subheadings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="p-4 rounded-xl border shadow-2xs space-y-3 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-semibold block" style={{ color: "var(--accent)" }}>
                    {batch.code}
                  </span>
                  <span className="font-semibold text-xs tracking-tight" style={{ color: "var(--text)" }}>
                    {batch.name}
                  </span>
                  <p className="text-[11px] mt-0.5 text-stone-500">{batch.track}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Active
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg border space-y-1" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: "var(--muted)" }}>Current Topic Milestone</span>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {batch.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${batch.progress}%`,
                      backgroundColor: "var(--accent)",
                    }}
                  />
                </div>
                <div className="text-[11px] font-medium text-stone-700 pt-0.5">
                  {batch.module}
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">Class Timings</span>
                  <span className="font-medium">{batch.schedule}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-500">Roster</span>
                  <span className="font-medium">{batch.studentsCount} students</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex flex-wrap sm:flex-nowrap items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => setSelectedBatch(batch)}
                className="px-3 py-1.5 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center whitespace-nowrap"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                Module & Students
              </button>
              <button
                type="button"
                onClick={() => onTakeAttendance(batch)}
                className="px-3 py-1.5 rounded font-semibold text-[11px] shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] md:min-h-0 flex-1 sm:flex-initial inline-flex items-center justify-center whitespace-nowrap"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-contrast)",
                }}
              >
                Take Attendance
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Batch Detail Drawer */}
      <Drawer
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch?.name || "Batch Overview"}
        subtitle={`Cohort Code: ${selectedBatch?.code}`}
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            <div
              className="p-3 rounded-lg border space-y-1.5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between">
                <span className="text-stone-500">Track</span>
                <span className="font-semibold">{selectedBatch.track}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Active Module</span>
                <span className="font-semibold">{selectedBatch.module}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Meeting Days</span>
                <span className="font-semibold">{selectedBatch.schedule}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Enrolled Students ({selectedBatch.students.length})
              </span>
              <div className="divide-y rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                {selectedBatch.students.map((student) => (
                  <div
                    key={student.id}
                    className="p-2.5 flex items-center justify-between"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <div>
                      <div className="font-medium text-xs">{student.name}</div>
                      <div className="text-[10px] text-stone-500">{student.email}</div>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: student.attendanceRate >= 75 ? "#D1FAE5" : "#FEE2E2",
                        color: student.attendanceRate >= 75 ? "#047857" : "#B91C1C",
                      }}
                    >
                      {student.attendanceRate}% Attendance
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const b = selectedBatch;
                setSelectedBatch(null);
                onTakeAttendance(b);
              }}
              className="w-full py-2 rounded-lg font-semibold text-xs shadow-xs hover:opacity-90 cursor-pointer"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              Start Attendance Session
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

