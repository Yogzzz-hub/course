import { useState } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Tag,
  Users,
} from "lucide-react";
import { useAdminResource } from "./hooks";
import { Button, Card, ScreenTitle, StatusPill } from "./ui";
import { money } from "./utils";

interface BatchItem {
  id: string;
  programmeName: string;
  batchCode: string;
  startDate: string;
  timing: string;
  enrolled: number;
  totalSeats: number;
  priceMinor: number;
  currency: string;
  status: "Active" | "Starting Soon" | "Filling Fast" | "Completed";
}

export function ProgrammesSection() {
  const programmesQuery = useAdminResource("programmes", {});

  const [batches] = useState<BatchItem[]>([
    {
      id: "b-1",
      programmeName: "Python Full Stack",
      batchCode: "PFS-2026-A",
      startDate: "24 Nov 2026",
      timing: "Weekdays · 07:00 PM - 09:00 PM",
      enrolled: 34,
      totalSeats: 40,
      priceMinor: 9000000,
      currency: "INR",
      status: "Filling Fast",
    },
    {
      id: "b-2",
      programmeName: "Full-Stack App Development",
      batchCode: "FSA-2026-B",
      startDate: "01 Dec 2026",
      timing: "Weekends · 10:00 AM - 02:00 PM",
      enrolled: 22,
      totalSeats: 25,
      priceMinor: 8500000,
      currency: "INR",
      status: "Filling Fast",
    },
    {
      id: "b-3",
      programmeName: "Django & Cloud APIs",
      batchCode: "DCA-2026-C",
      startDate: "15 Dec 2026",
      timing: "Weekdays · 08:00 AM - 10:00 AM",
      enrolled: 14,
      totalSeats: 25,
      priceMinor: 6500000,
      currency: "INR",
      status: "Starting Soon",
    },
    {
      id: "b-4",
      programmeName: "React & Next.js Architecture",
      batchCode: "RNA-2026-D",
      startDate: "10 Nov 2026",
      timing: "Weekdays · 07:00 PM - 09:00 PM",
      enrolled: 20,
      totalSeats: 20,
      priceMinor: 6000000,
      currency: "INR",
      status: "Active",
    },
  ]);

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Curriculum & Cohorts"
        title="Programmes & Batches"
        actions={
          <Button secondary>
            <Plus size={16} /> New batch
          </Button>
        }
      />

      {/* Cohort Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batches.map((batch) => {
          const fillPercentage = Math.round(
            (batch.enrolled / batch.totalSeats) * 100,
          );
          const isNearlyFull = fillPercentage >= 80;

          return (
            <Card key={batch.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase">
                    {batch.batchCode}
                  </span>
                  <h3 className="text-lg font-bold text-[var(--text)] mt-0.5">
                    {batch.programmeName}
                  </h3>
                </div>
                <StatusPill
                  status={batch.status}
                  variant={
                    batch.status === "Active"
                      ? "paid"
                      : isNearlyFull
                        ? "pending"
                        : "new"
                  }
                />
              </div>

              {/* Schedule and Timing */}
              <div className="flex flex-col gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-alt)] rounded-xl p-3 border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--accent)]" />
                  <span>Starts: {batch.startDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--accent)]" />
                  <span>{batch.timing}</span>
                </div>
              </div>

              {/* Fill-rate progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text)]">
                    Seat Fill Rate
                  </span>
                  <span className="font-bold text-[var(--accent)]">
                    {batch.enrolled} / {batch.totalSeats} seats ({fillPercentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[var(--accent-tint)] overflow-hidden">
                  <div
                    style={{ width: `${fillPercentage}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      fillPercentage >= 95
                        ? "bg-red-700"
                        : fillPercentage >= 80
                          ? "bg-[var(--btn-primary-bg)]"
                          : "bg-[var(--accent)]"
                    }`}
                  />
                </div>
              </div>

              {/* Pricing and Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div>
                  <span className="text-[11px] text-[var(--muted)] block">Package Fee</span>
                  <span className="text-base font-bold text-[var(--text)]">
                    {money(batch.priceMinor, batch.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-tint)]"
                  >
                    Edit Batch
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--btn-primary-hover)]"
                  >
                    View Roster
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

