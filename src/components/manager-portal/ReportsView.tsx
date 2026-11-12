import React from "react";
import { initialReportsData } from "../../data/managerMock";

export function ReportsView({
  onAddToast,
}: {
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Grid of Report Cards - NO headings or subheadings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Admissions conversion */}
        <div
          className="p-4 rounded-xl border shadow-2xs space-y-3"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
              Monthly Lead-to-Admissions Velocity
            </span>
            <span className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
              65.9% Avg
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {initialReportsData.monthlyAdmissions.map((m) => {
              const rate = Math.round((m.admissions / m.leads) * 100);
              return (
                <div key={m.month} className="space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "var(--text)" }}>{m.month} 2026</span>
                    <span style={{ color: "var(--muted)" }}>
                      {m.admissions} enrolled / {m.leads} leads ({rate}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${rate}%`,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track revenue breakdown */}
        <div
          className="p-4 rounded-xl border shadow-2xs space-y-3"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
              Curriculum Revenue Distribution
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              ₹ 48,50,000 Total
            </span>
          </div>

          <div className="space-y-2 pt-1">
            {initialReportsData.trackBreakdown.map((t) => (
              <div
                key={t.track}
                className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <div>
                  <span className="font-medium text-xs block" style={{ color: "var(--text)" }}>
                    {t.track}
                  </span>
                  <span className="text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>
                    {t.share}% of student enrollments
                  </span>
                </div>
                <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                  {t.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
