import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button, Card, Empty, inputClass, ScreenTitle, StatusPill } from "./ui";

interface StudentRecord {
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

export function StudentsSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFee, setFilterFee] = useState<string>("all");

  const [students] = useState<StudentRecord[]>([
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
  ]);

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

  return (
    <div className="space-y-6">
      <ScreenTitle
        eyebrow="Learner Management"
        title="Active Students Roster"
        actions={
          <Button secondary>
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
                  ? "bg-[#681C35] text-white shadow-sm"
                  : "border border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
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
            className="absolute left-3.5 top-3.5 text-[#645A62]"
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
              <table className="w-full text-left text-sm text-[#241921]">
                <thead className="bg-[#F3F7FA] border-b border-[#DFE5EC] text-xs font-semibold text-[#645A62] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#DFE5EC]">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F7F9FB] transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#241921]">{s.name}</div>
                        <div className="text-xs text-[#645A62]">{s.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[#241921]">
                          {s.programme}
                        </div>
                        <div className="text-xs text-[#681C35] font-semibold">
                          {s.batch}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#241921]">
                            {s.attendancePct}%
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              s.attendancePct >= 90
                                ? "bg-emerald-600"
                                : s.attendancePct >= 80
                                  ? "bg-amber-600"
                                  : "bg-red-600"
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[160px]">
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span>{s.progressPct}% complete</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#EEF3F7] overflow-hidden">
                          <div
                            style={{ width: `${s.progressPct}%` }}
                            className="h-full bg-[#681C35] rounded-full"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={s.feeStatus} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[#DFE5EC] px-3 text-xs font-semibold text-[#681C35] hover:bg-[#F3F7FA] hover:border-[#681C35] transition"
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
            <div className="divide-y divide-[#DFE5EC] md:hidden">
              {filtered.map((s) => (
                <article key={s.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-[#241921]">
                        {s.name}
                      </h3>
                      <p className="text-xs text-[#645A62]">{s.programme}</p>
                    </div>
                    <StatusPill status={s.feeStatus} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F9FB] p-2.5 rounded-xl border border-[#DFE5EC]">
                    <div>
                      <span className="text-[#645A62] block">Attendance</span>
                      <span className="font-bold text-[#241921]">
                        {s.attendancePct}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[#645A62] block">Batch Code</span>
                      <span className="font-bold text-[#681C35]">{s.batch}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#645A62]">Syllabus Progress</span>
                      <span className="font-bold text-[#681C35]">
                        {s.progressPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#EEF3F7] overflow-hidden">
                      <div
                        style={{ width: `${s.progressPct}%` }}
                        className="h-full bg-[#681C35] rounded-full"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#681C35] px-4 text-xs font-bold text-white shadow-sm"
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
    </div>
  );
}

