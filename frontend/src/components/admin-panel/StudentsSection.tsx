import { useState, useMemo, useEffect } from "react";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  GraduationCap,
  Mail,
  Search,
  User,
  X,
  ExternalLink,
} from "lucide-react";
import { Button, Card, Empty, inputClass, ScreenTitle, StatusPill } from "./ui";
import { useAdminResource } from "./hooks";
import { exportToCsv } from "../../utils/csvExport";

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  programme: string;
  batch: string;
  attendancePct: number;
  progressPct: number;
  feeStatus: "Paid" | "Due" | "Overdue";
  nextAssignment: string;
}

const fallbackStudents: StudentRecord[] = [
  {
    id: "std-1",
    name: "Asha Rao",
    email: "asha.rao@example.test",
    programme: "Python Full Stack",
    batch: "PFS-2026-A",
    attendancePct: 94,
    progressPct: 68,
    feeStatus: "Paid",
    nextAssignment: "REST API Authentication",
  },
  {
    id: "std-2",
    name: "Noah Singh",
    email: "noah.singh@example.test",
    programme: "Python Full Stack",
    batch: "PFS-2026-A",
    attendancePct: 88,
    progressPct: 42,
    feeStatus: "Overdue",
    nextAssignment: "Async Task Workers",
  },
  {
    id: "std-3",
    name: "Rohan Varma",
    email: "rohan.v@example.test",
    programme: "Full-Stack App Dev",
    batch: "FSA-2026-B",
    attendancePct: 96,
    progressPct: 85,
    feeStatus: "Paid",
    nextAssignment: "Capstone Deployment Pipeline",
  },
  {
    id: "std-4",
    name: "Sneha Patel",
    email: "sneha.p@example.test",
    programme: "Django Backend Dev",
    batch: "DCA-2026-C",
    attendancePct: 90,
    progressPct: 30,
    feeStatus: "Due",
    nextAssignment: "Database Indexes & Migrations",
  },
  {
    id: "std-5",
    name: "Devanand K",
    email: "devanand.k@example.test",
    programme: "React Development",
    batch: "RNA-2026-D",
    attendancePct: 82,
    progressPct: 55,
    feeStatus: "Paid",
    nextAssignment: "State Management with Zustand",
  },
];

export function StudentsSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFee, setFilterFee] = useState<string>("all");
  const [selectedStudentForLms, setSelectedStudentForLms] = useState<StudentRecord | null>(null);

  const studentsQuery = useAdminResource("students", {});
  const students: StudentRecord[] = studentsQuery.data?.students?.length
    ? studentsQuery.data.students
    : fallbackStudents;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedStudentForLms) {
        setSelectedStudentForLms(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStudentForLms]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterFee !== "all" && s.feeStatus.toLowerCase() !== filterFee)
        return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.programme.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, filterFee, searchTerm]);

  const handleDownloadRoster = () => {
    exportToCsv(
      `aintrix-students-roster-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered,
      [
        { header: "Student ID", accessor: (s) => s.id },
        { header: "Name", accessor: (s) => s.name },
        { header: "Email", accessor: (s) => s.email },
        { header: "Programme", accessor: (s) => s.programme },
        { header: "Batch Code", accessor: (s) => s.batch },
        { header: "Attendance %", accessor: (s) => `${s.attendancePct}%` },
        { header: "Syllabus Progress %", accessor: (s) => `${s.progressPct}%` },
        { header: "Fee Status", accessor: (s) => s.feeStatus },
        { header: "Next Assignment", accessor: (s) => s.nextAssignment },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Learner Management"
        title="Active Students Roster"
        actions={
          <Button secondary onClick={handleDownloadRoster}>
            Download roster
          </Button>
        }
      />

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {["all", "paid", "due", "overdue"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterFee(status)}
              className={`inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold capitalize transition ${
                filterFee === status
                  ? "bg-[var(--btn-primary-bg)] text-white shadow-sm"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent-tint)]"
              }`}
            >
              Fee: {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3.5 top-3.5 text-[var(--muted)]"
          />
          <input
            type="search"
            placeholder="Search student or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Student Roster Table (Desktop) / Cards (Mobile) */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Empty
              title="No students found"
              children="No enrolled students match your selected criteria."
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text)]">
                <thead className="bg-[var(--accent-tint)] border-b border-[var(--border)] text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Student
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Track & Batch
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Attendance
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Curriculum Progress
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Fee Status
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Profile
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-alt)] transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[var(--text)]">{s.name}</div>
                        <div className="text-xs text-[var(--muted)]">{s.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[var(--text)]">
                          {s.programme}
                        </div>
                        <div className="text-xs text-[var(--accent)] font-semibold">
                          {s.batch}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text)]">
                            {s.attendancePct}%
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              s.attendancePct >= 80 ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span>{s.progressPct}% complete</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--accent-tint)] overflow-hidden">
                          <div
                            style={{ width: `${s.progressPct}%` }}
                            className="h-full bg-[var(--btn-primary-bg)] rounded-full"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={s.feeStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForLms(s)}
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-tint)] hover:border-[var(--accent)] transition"
                        >
                          View LMS
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="divide-y divide-[var(--border)] md:hidden">
              {filtered.map((s) => (
                <article key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-[var(--text)]">
                        {s.name}
                      </h3>
                      <p className="text-xs text-[var(--muted)]">{s.programme}</p>
                    </div>
                    <StatusPill status={s.feeStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-alt)] p-2.5 rounded-xl border border-[var(--border)]">
                    <div>
                      <span className="text-[var(--muted)] block">Attendance</span>
                      <span className="font-bold text-[var(--text)]">
                        {s.attendancePct}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--muted)] block">Batch Code</span>
                      <span className="font-bold text-[var(--accent)]">{s.batch}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--muted)]">Syllabus Progress</span>
                      <span className="font-bold text-[var(--accent)]">
                        {s.progressPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--accent-tint)] overflow-hidden">
                      <div
                        style={{ width: `${s.progressPct}%` }}
                        className="h-full bg-[var(--btn-primary-bg)] rounded-full"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForLms(s)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] px-4 text-xs font-bold text-white shadow-sm"
                    >
                      View Student LMS
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Student LMS Detail Modal */}
      {selectedStudentForLms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lms-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold font-mono uppercase text-[var(--accent)]">
                  {selectedStudentForLms.batch} · {selectedStudentForLms.id}
                </span>
                <h3 id="lms-modal-title" className="text-xl font-bold text-[var(--text)] mt-0.5">
                  {selectedStudentForLms.name}
                </h3>
                <p className="text-xs text-[var(--muted)]">{selectedStudentForLms.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForLms(null)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)] transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted)]">Enrolled Programme:</span>
                <span className="font-bold text-[var(--text)]">{selectedStudentForLms.programme}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted)]">Attendance Compliance:</span>
                <span className="font-bold text-emerald-600">{selectedStudentForLms.attendancePct}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--muted)]">Tuition / Fee Status:</span>
                <StatusPill status={selectedStudentForLms.feeStatus} />
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--muted)]">Curriculum Progress:</span>
                  <span className="font-bold text-[var(--accent)]">{selectedStudentForLms.progressPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--accent-tint)] overflow-hidden">
                  <div
                    style={{ width: `${selectedStudentForLms.progressPct}%` }}
                    className="h-full bg-[var(--btn-primary-bg)] rounded-full"
                  />
                </div>
              </div>
              <div className="border-t border-[var(--border)] pt-2 text-xs">
                <span className="text-[var(--muted)] block">Upcoming Deliverable:</span>
                <span className="font-medium text-[var(--text)] mt-0.5 block">{selectedStudentForLms.nextAssignment}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                secondary
                onClick={() => setSelectedStudentForLms(null)}
              >
                Close
              </Button>
              <a
                href={`/student-panel?mode=enrolled`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[var(--btn-primary-bg)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--btn-primary-hover)] transition"
              >
                <ExternalLink size={14} />
                Open Student LMS View
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

