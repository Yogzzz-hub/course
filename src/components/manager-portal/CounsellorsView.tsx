import React from "react";
import type { Counsellor } from "../../data/managerMock";

export function CounsellorsView({
  counsellors,
  onAddToast,
}: {
  counsellors: Counsellor[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
}) {
  const handleAssignBulk = (counsellor: Counsellor) => {
    // TODO: Connect to backend API: POST /api/manager/counsellors/[id]/assign-batch
    onAddToast({
      type: "success",
      title: "Leads Routed",
      message: `Next 5 unassigned incoming leads allocated to ${counsellor.name}.`,
    });
  };

  return (
    <div className="space-y-3">
      {/* Counsellor cards grid - NO headings or subheadings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {counsellors.map((c) => {
          const targetPercentage = Math.round((c.convertedCount / c.targetCount) * 100);

          return (
            <div
              key={c.id}
              className="p-4 rounded-xl border shadow-2xs flex flex-col justify-between space-y-3"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-xs block" style={{ color: "var(--text)" }}>
                      {c.name}
                    </span>
                    <p className="text-[10px] text-stone-500 mt-0.5" style={{ color: "var(--muted)" }}>
                      {c.email}
                    </p>
                  </div>
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      backgroundColor: c.status === "ACTIVE" ? "#D1FAE5" : "#FEF3C7",
                      color: c.status === "ACTIVE" ? "#047857" : "#B45309",
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg border" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                    <span className="text-[10px] text-stone-500 block">Active Leads</span>
                    <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
                      {c.activeLeadsCount}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg border" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                    <span className="text-[10px] text-stone-500 block">Conversion</span>
                    <span className="font-bold text-sm text-emerald-600">
                      {c.conversionRate}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "var(--muted)" }}>Quarter Target</span>
                    <span className="font-medium" style={{ color: "var(--text)" }}>
                      {c.convertedCount} / {c.targetCount} ({targetPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(targetPercentage, 100)}%`,
                        backgroundColor: "var(--accent)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAssignBulk(c)}
                className="w-full py-1.5 rounded-lg border text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                Route Incoming Leads (+5)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
