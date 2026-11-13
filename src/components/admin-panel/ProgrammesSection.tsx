import { useState, useEffect } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  Tag,
  Users,
  X,
  Download,
  Edit2,
} from "lucide-react";
import { useAdminResource } from "./hooks";
import { Button, Card, ScreenTitle, StatusPill, inputClass } from "./ui";
import { money } from "./utils";
import { exportToCsv } from "../../utils/csvExport";

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

interface RosterStudent {
  id: string;
  name: string;
  email: string;
  batchCode: string;
  attendancePct: number;
  progressPct: number;
  feeStatus: string;
}

const mockRoster: Record<string, RosterStudent[]> = {
  "PFS-2026-A": [
    { id: "std-1", name: "Asha Rao", email: "asha.rao@example.test", batchCode: "PFS-2026-A", attendancePct: 94, progressPct: 68, feeStatus: "Paid" },
    { id: "std-2", name: "Noah Singh", email: "noah.singh@example.test", batchCode: "PFS-2026-A", attendancePct: 88, progressPct: 42, feeStatus: "Overdue" },
    { id: "std-6", name: "Aditi Roy", email: "aditi.roy@example.test", batchCode: "PFS-2026-A", attendancePct: 92, progressPct: 75, feeStatus: "Paid" },
  ],
  "FSA-2026-B": [
    { id: "std-3", name: "Rohan Varma", email: "rohan.v@example.test", batchCode: "FSA-2026-B", attendancePct: 96, progressPct: 85, feeStatus: "Paid" },
    { id: "std-7", name: "Kunal Ghosh", email: "kunal.g@example.test", batchCode: "FSA-2026-B", attendancePct: 84, progressPct: 60, feeStatus: "Paid" },
  ],
  "DCA-2026-C": [
    { id: "std-4", name: "Sneha Patel", email: "sneha.p@example.test", batchCode: "DCA-2026-C", attendancePct: 90, progressPct: 30, feeStatus: "Due" },
  ],
  "RNA-2026-D": [
    { id: "std-5", name: "Devanand K", email: "devanand.k@example.test", batchCode: "RNA-2026-D", attendancePct: 82, progressPct: 55, feeStatus: "Paid" },
  ],
};

export function ProgrammesSection() {
  const programmesQuery = useAdminResource("programmes", {});

  const [batches, setBatches] = useState<BatchItem[]>([
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

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchItem | null>(null);
  const [viewingRosterBatch, setViewingRosterBatch] = useState<BatchItem | null>(null);

  // New Batch Form State
  const [newProgName, setNewProgName] = useState("Python Full Stack");
  const [newBatchCode, setNewBatchCode] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newTiming, setNewTiming] = useState("Weekdays · 07:00 PM - 09:00 PM");
  const [newTotalSeats, setNewTotalSeats] = useState("30");
  const [newPriceINR, setNewPriceINR] = useState("75000");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsNewModalOpen(false);
        setEditingBatch(null);
        setViewingRosterBatch(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchCode.trim() || !newStartDate.trim()) return;

    const newItem: BatchItem = {
      id: `b-${Date.now()}`,
      programmeName: newProgName,
      batchCode: newBatchCode.trim().toUpperCase(),
      startDate: newStartDate,
      timing: newTiming,
      enrolled: 0,
      totalSeats: parseInt(newTotalSeats, 10) || 30,
      priceMinor: (parseInt(newPriceINR, 10) || 75000) * 100,
      currency: "INR",
      status: "Starting Soon",
    };

    setBatches([newItem, ...batches]);
    setIsNewModalOpen(false);
    setNewBatchCode("");
    setNewStartDate("");
  };

  const handleSaveEditBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    setBatches(batches.map((b) => (b.id === editingBatch.id ? editingBatch : b)));
    setEditingBatch(null);
  };

  const handleExportRoster = (batch: BatchItem) => {
    const roster = mockRoster[batch.batchCode] || [
      {
        id: `std-gen-1`,
        name: "Learner in Cohort",
        email: `learner@aintrix.edu`,
        batchCode: batch.batchCode,
        attendancePct: 90,
        progressPct: 50,
        feeStatus: "Paid",
      },
    ];

    exportToCsv(
      `aintrix-roster-${batch.batchCode.toLowerCase()}.csv`,
      roster,
      [
        { header: "Student ID", accessor: (r) => r.id },
        { header: "Name", accessor: (r) => r.name },
        { header: "Email", accessor: (r) => r.email },
        { header: "Batch Code", accessor: (r) => r.batchCode },
        { header: "Attendance %", accessor: (r) => `${r.attendancePct}%` },
        { header: "Progress %", accessor: (r) => `${r.progressPct}%` },
        { header: "Fee Status", accessor: (r) => r.feeStatus },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Curriculum & Cohorts"
        title="Programmes & Batches"
        actions={
          <Button secondary onClick={() => setIsNewModalOpen(true)}>
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
                    onClick={() => setEditingBatch({ ...batch })}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--accent-tint)] transition cursor-pointer"
                  >
                    Edit Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingRosterBatch(batch)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--btn-primary-hover)] transition cursor-pointer"
                  >
                    View Roster
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create New Batch Modal */}
      {isNewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text)]">Create New Cohort Batch</h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block text-[var(--text)] mb-1">Programme Name</label>
                <select
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className={inputClass}
                >
                  <option value="Python Full Stack">Python Full Stack</option>
                  <option value="Full-Stack App Development">Full-Stack App Development</option>
                  <option value="Django & Cloud APIs">Django & Cloud APIs</option>
                  <option value="React & Next.js Architecture">React & Next.js Architecture</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PFS-2026-B"
                    value={newBatchCode}
                    onChange={(e) => setNewBatchCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Start Date</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15 Jan 2027"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block text-[var(--text)] mb-1">Schedule & Timing</label>
                <input
                  type="text"
                  required
                  value={newTiming}
                  onChange={(e) => setNewTiming(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Total Seats</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    required
                    value={newTotalSeats}
                    onChange={(e) => setNewTotalSeats(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Fee (INR)</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={newPriceINR}
                    onChange={(e) => setNewPriceINR(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <Button secondary type="button" onClick={() => setIsNewModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editingBatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--accent)]">
                  {editingBatch.batchCode}
                </span>
                <h3 className="text-lg font-bold text-[var(--text)]">Edit Cohort Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditBatch} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block text-[var(--text)] mb-1">Schedule & Timing</label>
                <input
                  type="text"
                  required
                  value={editingBatch.timing}
                  onChange={(e) => setEditingBatch({ ...editingBatch, timing: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Total Capacity</label>
                  <input
                    type="number"
                    min={editingBatch.enrolled}
                    required
                    value={editingBatch.totalSeats}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, totalSeats: parseInt(e.target.value, 10) || 0 })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold block text-[var(--text)] mb-1">Status</label>
                  <select
                    value={editingBatch.status}
                    onChange={(e) =>
                      setEditingBatch({
                        ...editingBatch,
                        status: e.target.value as BatchItem["status"],
                      })
                    }
                    className={inputClass}
                  >
                    <option value="Active">Active</option>
                    <option value="Starting Soon">Starting Soon</option>
                    <option value="Filling Fast">Filling Fast</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
                <Button secondary type="button" onClick={() => setEditingBatch(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Batch Roster Modal */}
      {viewingRosterBatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--accent)] uppercase">
                  {viewingRosterBatch.batchCode} Roster
                </span>
                <h3 className="text-lg font-bold text-[var(--text)] mt-0.5">
                  {viewingRosterBatch.programmeName}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {viewingRosterBatch.enrolled} enrolled of {viewingRosterBatch.totalSeats} max capacity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRosterBatch(null)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--surface-alt)] border-b border-[var(--border)] text-[var(--muted)] font-semibold">
                  <tr>
                    <th className="p-3">Learner</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Attendance</th>
                    <th className="p-3 text-right">Fee Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(mockRoster[viewingRosterBatch.batchCode] || [
                    {
                      id: "std-placeholder",
                      name: "Sample Learner",
                      email: "learner@aintrix.edu",
                      batchCode: viewingRosterBatch.batchCode,
                      attendancePct: 90,
                      progressPct: 50,
                      feeStatus: "Paid",
                    },
                  ]).map((student) => (
                    <tr key={student.id} className="hover:bg-[var(--surface-alt)]">
                      <td className="p-3">
                        <span className="font-semibold text-[var(--text)] block">{student.name}</span>
                        <span className="text-[10px] text-[var(--muted)]">{student.email}</span>
                      </td>
                      <td className="p-3 font-semibold text-[var(--accent)]">{student.progressPct}%</td>
                      <td className="p-3 text-emerald-600 font-semibold">{student.attendancePct}%</td>
                      <td className="p-3 text-right">
                        <StatusPill status={student.feeStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleExportRoster(viewingRosterBatch)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
              >
                <Download size={14} />
                Export Batch Roster CSV
              </button>
              <Button secondary onClick={() => setViewingRosterBatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
