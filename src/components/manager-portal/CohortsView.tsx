import React, { useState } from "react";
import type { CohortSeat } from "../../data/managerMock";
import { Drawer } from "./Drawer";

export function CohortsView({ cohorts }: { cohorts: CohortSeat[] }) {
  const [selectedCohort, setSelectedCohort] = useState<CohortSeat | null>(null);

  return (
    <div className="space-y-3">
      {/* Cohort Cards Grid - NO headings or subheadings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cohorts.map((cohort) => {
          const seatPercentage = Math.round((cohort.enrolledCount / cohort.maxSeats) * 100);
          const isFull = cohort.enrolledCount >= cohort.maxSeats;

          return (
            <div
              key={cohort.id}
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
                      {cohort.code}
                    </span>
                    <span className="font-semibold text-xs tracking-tight" style={{ color: "var(--text)" }}>
                      {cohort.name}
                    </span>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {cohort.courseTitle}
                    </p>
                  </div>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor:
                        cohort.status === "ACTIVE"
                          ? "#D1FAE5"
                          : cohort.status === "UPCOMING"
                          ? "#FEF3C7"
                          : "var(--bg-secondary)",
                      color:
                        cohort.status === "ACTIVE"
                          ? "#047857"
                          : cohort.status === "UPCOMING"
                          ? "#B45309"
                          : "var(--muted)",
                    }}
                  >
                    {cohort.status}
                  </span>
                </div>

                {/* Seat Quota Progress */}
                <div className="mt-3 p-2.5 rounded-lg border space-y-1" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span style={{ color: "var(--muted)" }}>Capacity Fill</span>
                    <span className="font-semibold" style={{ color: isFull ? "#DC2626" : "var(--text)" }}>
                      {cohort.enrolledCount} / {cohort.maxSeats} seats ({seatPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(seatPercentage, 100)}%`,
                        backgroundColor: isFull ? "#DC2626" : "var(--accent)",
                      }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Lead Trainer</span>
                    <span className="font-medium text-xs" style={{ color: "var(--text)" }}>
                      {cohort.facultyName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Syllabus Progress</span>
                    <span className="font-medium text-xs" style={{ color: "var(--text)" }}>
                      {cohort.progress}% covered
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {cohort.startDate} — {cohort.endDate}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCohort(cohort)}
                  className="px-2 py-1 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cohort Detail Drawer */}
      <Drawer
        isOpen={!!selectedCohort}
        onClose={() => setSelectedCohort(null)}
        title={selectedCohort?.name || "Cohort Details"}
        subtitle={`Code: ${selectedCohort?.code}`}
      >
        {selectedCohort && (
          <div className="space-y-4 text-xs">
            <div
              className="p-3 rounded-lg border space-y-1.5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Curriculum</span>
                <span className="font-semibold">{selectedCohort.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Faculty</span>
                <span className="font-semibold">{selectedCohort.facultyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Utilization</span>
                <span className="font-semibold">
                  {selectedCohort.enrolledCount} of {selectedCohort.maxSeats} enrolled
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Attendance Avg</span>
                <span className="font-semibold text-emerald-600">
                  {selectedCohort.attendanceAverage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Dates</span>
                <span>{selectedCohort.startDate} to {selectedCohort.endDate}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Syllabus Progress ({selectedCohort.progress}%)
              </span>
              <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${selectedCohort.progress}%`,
                    backgroundColor: "var(--accent)",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
