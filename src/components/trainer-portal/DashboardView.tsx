import React from "react";
import {
  Calendar,
  Users,
  FileCheck,
  HelpCircle,
  Video,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type {
  TrainerStats,
  TrainerBatch,
  TrainerScheduleItem,
  DoubtSession,
} from "./types";
import type { TrainerNavTab } from "./types";

export function DashboardView({
  stats,
  batches,
  doubts,
  onNavigateTab,
  onSelectBatch,
}: {
  stats: TrainerStats;
  batches: TrainerBatch[];
  doubts: DoubtSession[];
  onNavigateTab: (tab: TrainerNavTab) => void;
  onSelectBatch: (batch: TrainerBatch) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Burgundy Next Class Hero Banner */}
      <div
        className="rounded-xl p-4 sm:p-5 text-white relative overflow-hidden shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, black) 100%)",
        }}
      >
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-contrast) 20%, transparent)",
                color: "var(--accent-contrast)",
              }}
            >
              NEXT CLASS · {stats.nextClassTime}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold tracking-tight text-white pt-0.5">
            {stats.nextClassTitle}
          </div>
          <div className="text-xs flex items-center gap-3 pt-0.5" style={{ color: "color-mix(in srgb, var(--accent-contrast) 85%, transparent)" }}>
            <span>Cohort: <strong className="text-white">{stats.nextClassBatch}</strong></span>
            <span>•</span>
            <span>{stats.nextClassStudents} Students Enrolled</span>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <a
            href="https://meet.aintrix.edu/room-py-a"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 shadow-xs min-h-[44px] w-full sm:w-auto"
            style={{
              backgroundColor: "var(--surface)",
              color: "var(--accent)",
            }}
          >
            <Video size={14} />
            <span>Join Live Classroom</span>
          </a>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stat 1 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Today's Classes
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Calendar size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.todayClasses}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Scheduled sessions
            </p>
          </div>
        </div>

        {/* Stat 2 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Total Students
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.totalStudents}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Across 3 active cohorts
            </p>
          </div>
        </div>

        {/* Stat 3 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Pending Reviews
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <FileCheck size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.pendingReviews}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Submissions to evaluate
            </p>
          </div>
        </div>

        {/* Stat 4 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Open Doubts
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.openDoubts}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Waiting student queries
            </p>
          </div>
        </div>
      </div>

      {/* Grid: My Batches & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Active Batches */}
        <div
          className="lg:col-span-7 rounded-xl border p-4 shadow-2xs space-y-3"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="flex items-center justify-between pb-2 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
              Assigned Cohorts
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab("batches")}
              className="text-[11px] font-medium flex items-center gap-1 hover:underline cursor-pointer"
              style={{ color: "var(--accent)" }}
            >
              <span>All cohorts</span>
              <ArrowRight size={11} />
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {batch.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5">
                      {batch.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
                    {batch.module} • {batch.studentsCount} students
                  </div>
                  <div className="w-36 max-w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${batch.progress}%`,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onSelectBatch(batch)}
                    className="px-2.5 py-1.5 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("attendance")}
                    className="px-2.5 py-1.5 rounded font-semibold text-[11px] shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--accent-contrast)",
                    }}
                  >
                    Attendance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Needs Attention & Doubt Requests */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className="rounded-xl border p-4 shadow-2xs space-y-2.5"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                <HelpCircle size={14} style={{ color: "var(--accent)" }} />
                <span>Pending Doubt Sessions</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab("doubts")}
                className="text-[11px] font-medium hover:underline cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                Resolve ({doubts.filter((d) => d.status === "WAITING").length})
              </button>
            </div>

            <div className="space-y-2">
              {doubts.slice(0, 3).map((doubt) => (
                <div
                  key={doubt.id}
                  className="p-2.5 rounded-lg border text-xs space-y-1"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {doubt.studentName}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {doubt.urgency}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-1" style={{ color: "var(--muted)" }}>{doubt.topic}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-xl border p-4 shadow-2xs space-y-2"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
              Faculty Quick Action
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab("assignments")}
                className="p-2.5 rounded-lg border text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                <FileCheck size={14} className="mb-1" style={{ color: "var(--accent)" }} />
                <div className="font-medium">Grade Submissions</div>
                <div className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>{stats.pendingReviews} waiting</div>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab("announcements")}
                className="p-2.5 rounded-lg border text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ borderColor: "var(--border)" }}
              >
                <Calendar size={14} className="mb-1" style={{ color: "var(--accent)" }} />
                <div className="font-medium">Post Notice</div>
                <div className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>To cohort feed</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

