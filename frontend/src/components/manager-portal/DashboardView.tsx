import React from "react";
import {
  Users,
  Clock,
  UserCheck,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Lead, ManagerStats, Admission, AttendanceAlert } from "./types";
import type { ManagerNavTab } from "./types";

export function DashboardView({
  stats,
  leads,
  admissions,
  alerts,
  onNavigateTab,
  onSelectLead,
}: {
  stats: ManagerStats;
  leads: Lead[];
  admissions: Admission[];
  alerts: AttendanceAlert[];
  onNavigateTab: (tab: ManagerNavTab) => void;
  onSelectLead: (lead: Lead) => void;
}) {
  return (
    <div className="space-y-4">
      {/* 4 Clean Metric Cards (compact, no giant headings) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              New Enquiries
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.newEnquiries}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Uncontacted web leads
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Follow-ups Due
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.pendingFollowUps}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Next 24 hours
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Active Students
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                color: "var(--accent)",
              }}
            >
              <UserCheck size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.activeStudents}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Enrolled in live cohorts
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Running Cohorts
            </span>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                color: "var(--accent)",
              }}
            >
              <Layers size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {stats.runningBatches}
            </div>
            <p className="text-xs text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
              Active curricula
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Leads feed & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left column: Recent Enquiries */}
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
              Recent Admission Enquiries
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab("leads")}
              className="text-[11px] font-medium flex items-center gap-1 hover:underline cursor-pointer"
              style={{ color: "var(--accent)" }}
            >
              <span>View all</span>
              <ArrowRight size={11} />
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {leads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {lead.name}
                    </span>
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor:
                          lead.status === "New Lead" || lead.status === "Admitted"
                            ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                            : "var(--bg-secondary)",
                        color:
                          lead.status === "New Lead" || lead.status === "Admitted"
                            ? "var(--accent)"
                            : "var(--muted)",
                      }}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 text-stone-500" style={{ color: "var(--muted)" }}>
                    {lead.track} • {lead.email}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectLead(lead)}
                  className="px-2.5 py-1.5 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  Details
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Attendance alerts & Admission drafts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Attendance Risk Alert card */}
          <div
            className="rounded-xl border p-4 shadow-2xs space-y-2.5"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                <AlertCircle size={14} style={{ color: "var(--accent)" }} />
                <span>Attendance Threshold Alerts</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab("attendance")}
                className="text-[11px] font-medium hover:underline cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                View all ({alerts.length})
              </button>
            </div>

            {alerts.length > 0 ? (
              <div
                className="p-3 rounded-lg border text-xs space-y-1.5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
                  borderColor: "color-mix(in srgb, var(--accent) 30%, var(--border))",
                  color: "var(--text)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">
                    {alerts.length} Students Below 75%
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                    style={{
                      backgroundColor: "var(--accent)",
                      color: "var(--accent-contrast)",
                    }}
                  >
                    Action Required
                  </span>
                </div>
                <p className="text-[11px] leading-normal" style={{ color: "var(--muted)" }}>
                  Academic counseling needed before batch test deadlines.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("attendance")}
                    className="text-[11px] font-bold underline cursor-pointer"
                    style={{ color: "var(--accent)" }}
                  >
                    Open Attendance Management &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="p-3 rounded-lg border text-xs flex items-center gap-2"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <CheckCircle2 size={14} className="shrink-0" style={{ color: "var(--accent)" }} />
                <span className="text-[11px]">All students maintain attendance above 75%.</span>
              </div>
            )}
          </div>

          {/* Admission Drafts review */}
          <div
            className="rounded-xl border p-4 shadow-2xs space-y-2.5"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                Admission Enrolments
              </span>
              <button
                type="button"
                onClick={() => onNavigateTab("admissions")}
                className="text-[11px] font-medium hover:underline cursor-pointer"
                style={{ color: "var(--accent)" }}
              >
                All Admissions
              </button>
            </div>

            <div className="space-y-2">
              {admissions.map((adm) => (
                <div
                  key={adm.id}
                  className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div>
                    <span className="font-medium text-xs block" style={{ color: "var(--text)" }}>
                      {adm.studentName}
                    </span>
                    <span className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>
                      {adm.course} • {adm.batch}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: adm.status === "APPROVED" ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-secondary)",
                      color: adm.status === "APPROVED" ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {adm.status === "APPROVED" ? "Approved" : "Review"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
