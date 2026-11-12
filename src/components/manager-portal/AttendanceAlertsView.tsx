import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Send, Filter } from "lucide-react";
import type { AttendanceAlert } from "../../data/managerMock";
import { ResponsiveTable } from "./ResponsiveTable";

export function AttendanceAlertsView({
  alerts,
  onAddToast,
  onUpdateAlert,
}: {
  alerts: AttendanceAlert[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
  onUpdateAlert: (updated: AttendanceAlert) => void;
}) {
  const [batchFilter, setBatchFilter] = useState("ALL");

  const filteredAlerts = alerts.filter(
    (alert) => batchFilter === "ALL" || alert.batchCode === batchFilter
  );

  const handleSendWarning = (alert: AttendanceAlert) => {
    // TODO: Connect to backend API: POST /api/manager/attendance-alerts/[id]/send-warning
    const updated: AttendanceAlert = {
      ...alert,
      warningSent: true,
    };
    onUpdateAlert(updated);
    onAddToast({
      type: "warning",
      title: "Warning Dispatched",
      message: `75% attendance notice delivered to ${alert.studentName}.`,
    });
  };

  return (
    <div className="space-y-3">
      {/* Top filter toolbar - NO headings or subheadings */}
      <div
        className="p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <span className="font-medium text-stone-500" style={{ color: "var(--muted)" }}>
          {filteredAlerts.length} students currently below 75% attendance threshold
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={13} style={{ color: "var(--muted)" }} className="shrink-0" />
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="p-2 rounded-lg border text-xs outline-none cursor-pointer min-h-[44px] flex-1 sm:flex-initial"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="ALL">All Cohorts</option>
            <option value="BATCH-PY-2026-A">BATCH-PY-2026-A</option>
            <option value="BATCH-REACT-2026-B">BATCH-REACT-2026-B</option>
            <option value="BATCH-DSA-2026-C">BATCH-DSA-2026-C</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
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
                <th className="py-2.5 px-3.5">Student</th>
                <th className="py-2.5 px-3.5">Cohort</th>
                <th className="py-2.5 px-3.5">Attendance</th>
                <th className="py-2.5 px-3.5">Missed</th>
                <th className="py-2.5 px-3.5">Risk Level</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {alert.studentName}
                    </span>
                    <p className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>
                      {alert.email} • {alert.phone}
                    </p>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span className="font-mono text-xs font-medium" style={{ color: "var(--text)" }}>
                      {alert.batchCode}
                    </span>
                    <p className="text-[10px] text-stone-500">{alert.batchName}</p>
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-xs" style={{ color: "var(--accent)" }}>
                    {alert.attendancePercentage}%
                  </td>
                  <td className="py-2.5 px-3.5 font-medium" style={{ color: "var(--text)" }}>
                    {alert.missedSessions} classes
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {alert.riskLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    {alert.warningSent ? (
                      <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                        <CheckCircle2 size={12} />
                        Dispatched
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleSendWarning(alert)}
                      className="px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-opacity shadow-2xs hover:opacity-90 cursor-pointer inline-flex items-center justify-center gap-1.5 min-h-[44px] md:min-h-0"
                      style={{
                        backgroundColor: alert.warningSent ? "var(--bg-secondary)" : "var(--accent)",
                        color: alert.warningSent ? "var(--muted)" : "var(--accent-contrast)",
                      }}
                    >
                      <Send size={11} />
                      <span>{alert.warningSent ? "Resend" : "Send Warning"}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                    No students currently below the 75% attendance threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>
    </div>
  );
}
