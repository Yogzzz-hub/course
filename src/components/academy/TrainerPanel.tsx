import { useEffect, useMemo, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CircleAlert, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { WorkspaceAppearance } from "../PaletteMenu";
import { AcademyApiError, type TrainerApi } from "./api";
import { ClassSessionForm } from "./ClassSessionForm";
import type { Batch, ClassSession, Course, TrainerWorkspace } from "./contracts";
import { attendanceProgress, completionStatus, dayStatus, formatDate, formatTime, grantFor, missingAttendanceDates, scheduledDates, syllabusProgress } from "./rules";
import "./academy.css";

const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const listFormat = new Intl.ListFormat("en-IN", { type: "conjunction" });
const scheduleLabel = { weekdays: "Weekdays", weekends: "Weekends", flexible: "Flexible" } as const;

/** The trainer's workspace: allocated batches, one combined class-session entry, and the progress it drives. */
export function TrainerPanel({ api, onResetDemo }: { api: TrainerApi; onResetDemo?: () => void }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}>
    <div className="ss-trainer min-h-screen">
      <WorkspaceAppearance/>
      {onResetDemo && <DemoNotice onReset={() => { onResetDemo(); void client.invalidateQueries(); }}/>}
      <TrainerWorkspaceView api={api}/>
    </div>
  </QueryClientProvider>;
}

function DemoNotice({ onReset }: { onReset: () => void }) {
  return <div role="note" className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-base text-amber-900 sm:mx-8 xl:mx-auto">
    <p><strong>Demo workspace.</strong> Sample batches and students; nothing is sent to the academy and submissions stay in this browser tab.</p>
    <button type="button" onClick={onReset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900"><RotateCcw size={16} aria-hidden="true"/>Reset demo data</button>
  </div>;
}

function TrainerWorkspaceView({ api }: { api: TrainerApi }) {
  const workspace = useQuery({ queryKey: ["trainer", "workspace"], queryFn: ({ signal }) => api.workspace(signal) });
  const [batchId, setBatchId] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<ClassSession | null>(null);

  if (workspace.isPending) return <main id="trainer-main" className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><p role="status" className="text-base text-slate-700">Loading your batches…</p></main>;
  if (workspace.isError) return <main id="trainer-main" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
    <h1 className="text-3xl font-semibold text-slate-950">Class sessions</h1>
    <div role="alert" className="mt-6 rounded-2xl bg-rose-50 p-5 text-base text-rose-800"><p>{workspace.error instanceof AcademyApiError && workspace.error.status === 401 ? "Your session has ended. Sign in again to continue." : "Your batches could not be loaded. Check your connection and try again."}</p>
      <button type="button" onClick={() => void workspace.refetch()} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-rose-800">Try again</button></div>
  </main>;

  const data = workspace.data;
  const batch = data.batches.find(item => item.id === batchId) ?? data.batches[0];
  const course = batch && data.courses.find(item => item.id === batch.courseId);
  return <main id="trainer-main" tabIndex={-1} className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Class sessions</h1>
        <p className="mt-2 text-lg text-slate-700">{data.trainer.name} · {data.trainer.specialization}</p>
      </div>
      <p className="text-base text-slate-700">{formatDate(data.today, "long")}</p>
    </header>

    {data.batches.length === 0 ? <p className="mt-8 rounded-2xl bg-slate-100 p-6 text-base text-slate-700">No batches are assigned to you yet. An admin or authorised manager allocates batches.</p> : <>
      <div role="tablist" aria-label="Your batches" className="mt-8 grid gap-3 sm:grid-cols-2" onKeyDown={event => {
        // Arrow keys, Home and End move between batches, as in any tab list.
        const index = data.batches.findIndex(item => item.id === batch?.id), last = data.batches.length - 1;
        const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const target = data.batches[(next + last + 1) % (last + 1)];
        setBatchId(target.id); setLastSubmitted(null);
        document.getElementById(`tab-${target.id}`)?.focus();
      }}>
        {data.batches.map(item => {
          const itemCourse = data.courses.find(entry => entry.id === item.courseId);
          const missing = missingAttendanceDates(item, data.sessions, data.today).length;
          const selected = item.id === batch?.id;
          return <button key={item.id} type="button" role="tab" id={`tab-${item.id}`} aria-selected={selected} tabIndex={selected ? 0 : -1} aria-controls="batch-panel" onClick={() => { setBatchId(item.id); setLastSubmitted(null); }}
            className={`rounded-2xl p-5 text-left transition-colors ${selected ? "bg-slate-950 text-white" : "bg-white text-slate-950 hover:bg-slate-50"}`}>
            <span className="block text-sm font-semibold">{item.code}</span>
            <span className="mt-1 block text-lg font-semibold">{itemCourse?.name}</span>
            <span className={`mt-2 block text-sm ${selected ? "text-slate-200" : "text-slate-700"}`}>{scheduleLabel[item.scheduleType]} · {item.classDays.map(day => dayNames[day]).join(", ")} · {formatTime(item.startTime)} to {formatTime(item.endTime)}</span>
            {missing > 0 && <span className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${selected ? "text-amber-200" : "text-amber-800"}`}><CircleAlert size={15} aria-hidden="true"/>{missing} {missing === 1 ? "class" : "classes"} with attendance not submitted</span>}
          </button>;
        })}
      </div>
      {batch && course && <section id="batch-panel" role="tabpanel" tabIndex={-1} aria-labelledby={`tab-${batch.id}`} className="mt-8 space-y-12">
        <BatchSummary workspace={data} batch={batch} course={course}/>
        <section aria-labelledby="entry-title">
          <h2 id="entry-title" className="text-2xl font-semibold text-slate-950">Submit a class session</h2>
          <p className="mt-2 max-w-3xl text-base text-slate-700">Record attendance and the topics covered together. Entry is open for today and yesterday; earlier dates need authorised backdated access, and future dates are locked.</p>
          {lastSubmitted && <SubmittedNotice session={lastSubmitted} course={course} batch={batch}/>}
          <div className="mt-6 rounded-3xl bg-slate-100 p-5 sm:p-8">
            <ClassSessionForm key={batch.id} api={api} workspace={data} batch={batch} course={course} onSubmitted={setLastSubmitted}/>
          </div>
        </section>
        <StudentProgress api={api} workspace={data} batch={batch} course={course}/>
        <SessionRecord workspace={data} batch={batch} course={course}/>
      </section>}
    </>}
  </main>;
}

function Meter({ value, label }: { value: number; label: string }) {
  return <div>
    <div className="flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-800">{label}</span><span className="text-2xl font-semibold text-slate-950">{value}%</span></div>
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-700" style={{ width: `${value}%` }}/></div>
  </div>;
}

function BatchSummary({ workspace, batch, course }: { workspace: TrainerWorkspace; batch: Batch; course: Course }) {
  const syllabus = syllabusProgress(batch, course, workspace.sessions);
  const scheduled = scheduledDates(batch);
  const held = workspace.sessions.filter(session => session.batchId === batch.id).length;
  const missing = missingAttendanceDates(batch, workspace.sessions, workspace.today);
  return <section aria-labelledby="summary-title" className="grid gap-6 rounded-3xl bg-white p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
    <div>
      <h2 id="summary-title" className="text-2xl font-semibold text-slate-950">{batch.code}</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-3 text-base sm:grid-cols-2">
        <div><dt className="text-sm text-slate-600">Course</dt><dd className="text-slate-950">{course.name}</dd></div>
        <div><dt className="text-sm text-slate-600">Schedule</dt><dd className="text-slate-950">{scheduleLabel[batch.scheduleType]}, {batch.classDays.map(day => dayNames[day]).join(", ")}</dd></div>
        <div><dt className="text-sm text-slate-600">Dates</dt><dd className="text-slate-950">{formatDate(batch.startDate)} to {formatDate(batch.expectedEndDate)}</dd></div>
        <div><dt className="text-sm text-slate-600">Classes</dt><dd className="text-slate-950">{held} submitted of {scheduled.length} scheduled</dd></div>
      </dl>
      {missing.length > 0 && <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-base text-amber-900"><CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true"/>Attendance not submitted for {listFormat.format([...missing.slice(-3).map(date => formatDate(date)), ...(missing.length > 3 ? [`${missing.length - 3} earlier ${missing.length - 3 === 1 ? "class" : "classes"}`] : [])])}. These are not counted as absences.</p>}
    </div>
    <div className="space-y-5 self-center">
      <Meter label="Syllabus progress (batch)" value={syllabus.percent}/>
      <p className="text-sm text-slate-700">{syllabus.covered} of {syllabus.total} subtopics taught, from submitted class sessions.</p>
    </div>
  </section>;
}

function SubmittedNotice({ session, course, batch }: { session: ClassSession; course: Course; batch: Batch }) {
  const titles = new Map(course.syllabus.flatMap(topic => topic.subtopics.map(sub => [sub.id, sub.title] as const)));
  const present = session.attendance.filter(mark => mark.status === "present").length;
  const ref = useRef<HTMLDivElement>(null);
  // The review panel that held focus is gone after submission, so focus moves to the confirmation.
  useEffect(() => ref.current?.focus(), [session.id]);
  return <div ref={ref} tabIndex={-1} data-session-confirmation className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5 text-base text-emerald-900">
    <Lock size={18} className="mt-1 shrink-0" aria-hidden="true"/>
    <p><strong>Class session submitted and locked.</strong> {formatDate(session.classDate, "long")}, {formatTime(session.startTime)} to {formatTime(session.endTime)}. {present} of {batch.students.length} present. Covered: {session.subtopicIds.map(id => titles.get(id)).join(", ")}. Progress has been recalculated.</p>
  </div>;
}

function StudentProgress({ api, workspace, batch, course }: { api: TrainerApi; workspace: TrainerWorkspace; batch: Batch; course: Course }) {
  const client = useQueryClient();
  const syllabus = syllabusProgress(batch, course, workspace.sessions);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const request = useMutation({
    mutationFn: (studentId: string) => api.requestCompletion({ batchId: batch.id, studentId }),
    onSuccess: (_, studentId) => { setMessage({ tone: "ok", text: `${batch.students.find(student => student.id === studentId)?.name}'s course was sent to admin for approval.` }); void client.invalidateQueries({ queryKey: ["trainer", "workspace"] }); },
    onError: error => setMessage({ tone: "error", text: error instanceof AcademyApiError ? error.message : "The request could not be sent. Try again." }),
  });
  return <section aria-labelledby="progress-title">
    <h2 id="progress-title" className="text-2xl font-semibold text-slate-950">Student progress</h2>
    <p className="mt-2 max-w-3xl text-base text-slate-700">Attendance is present classes divided by all scheduled classes; absence and leave do not count. A course can be sent for admin approval once attendance and syllabus both reach 100%.</p>
    {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-2xl p-4 text-base ${message.tone === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-900"}`}>{message.text}</p>}
    <div className="mt-6 overflow-x-auto rounded-2xl bg-white" role="region" aria-label="Student progress table" tabIndex={0}>
      <table className="w-full min-w-[720px] text-left text-base">
        <caption className="sr-only">Attendance and syllabus progress for {batch.code}</caption>
        <thead><tr className="text-sm text-slate-600"><th scope="col" className="px-5 py-3 font-semibold">Student</th><th scope="col" className="px-5 py-3 font-semibold">Attendance</th><th scope="col" className="px-5 py-3 font-semibold">Syllabus</th><th scope="col" className="px-5 py-3 font-semibold">Completion</th></tr></thead>
        <tbody>
          {batch.students.map(student => {
            const attendance = attendanceProgress(batch, workspace.sessions, student.id);
            const status = completionStatus(attendance.percent, syllabus.percent);
            const requested = workspace.completionRequests.find(item => item.batchId === batch.id && item.studentId === student.id);
            return <tr key={student.id} className="border-t border-slate-100">
              <th scope="row" className="px-5 py-4 font-semibold text-slate-950">{student.name}<span className="block text-sm font-normal text-slate-600">{student.registrationNo} · prefers {scheduleLabel[student.schedulePreference].toLowerCase()}</span></th>
              <td className="px-5 py-4 text-slate-950"><strong className="font-semibold">{attendance.percent}%</strong><span className="block text-sm text-slate-600">{attendance.present} of {attendance.scheduled} classes</span></td>
              <td className="px-5 py-4 font-semibold text-slate-950">{syllabus.percent}%</td>
              <td className="px-5 py-4">
                {requested ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"><ShieldCheck size={16} aria-hidden="true"/>Awaiting admin approval</span>
                  : status.eligible ? <button type="button" onClick={() => request.mutate(student.id)} disabled={request.isPending} className="inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">Submit {student.name.split(" ")[0]} for admin approval</button>
                  : <span className="text-sm text-slate-700">{status.label}</span>}
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </section>;
}

function SessionRecord({ workspace, batch, course }: { workspace: TrainerWorkspace; batch: Batch; course: Course }) {
  const [showAll, setShowAll] = useState(false);
  const titles = useMemo(() => new Map(course.syllabus.flatMap(topic => topic.subtopics.map(sub => [sub.id, sub.title] as const))), [course]);
  const sessions = workspace.sessions.filter(session => session.batchId === batch.id);
  // Every scheduled date up to today, plus any extra sessions, newest first.
  const dates = [...new Set([...scheduledDates(batch).filter(date => date <= workspace.today), ...sessions.map(session => session.classDate)])].sort().reverse();
  const visible = showAll ? dates : dates.slice(0, 8);
  return <section aria-labelledby="record-title">
    <h2 id="record-title" className="text-2xl font-semibold text-slate-950">Session record</h2>
    <p className="mt-2 max-w-3xl text-base text-slate-700">Date by date, as students see it on their dashboard.</p>
    <ol className="mt-6 space-y-2">
      {visible.map(date => {
        const daySessions = sessions.filter(session => session.classDate === date);
        const status = dayStatus(batch, workspace.sessions, date, workspace.today);
        const grant = grantFor(batch, date, workspace.grants);
        if (daySessions.length === 0) return <li key={date} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4">
          <span className="text-base font-semibold text-slate-950">{formatDate(date, "long")}</span>
          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${status === "due-today" ? "text-slate-700" : "text-amber-800"}`}><CalendarClock size={16} aria-hidden="true"/>{status === "due-today" ? "Due today" : grant ? "Attendance not submitted · backdated access granted" : "Attendance not submitted"}</span>
        </li>;
        return daySessions.map(session => {
          const present = session.attendance.filter(mark => mark.status === "present").length;
          return <li key={session.id} className="rounded-2xl bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-base font-semibold text-slate-950">{formatDate(date, "long")} · {formatTime(session.startTime)} to {formatTime(session.endTime)}</span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><Lock size={15} aria-hidden="true"/>Submitted and locked</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{present} of {session.attendance.length} present · {session.subtopicIds.map(id => titles.get(id)).join(", ")}</p>
            {session.notes && <p className="mt-1 text-sm text-slate-600">{session.notes}</p>}
          </li>;
        });
      })}
    </ol>
    {dates.length > 8 && <button type="button" onClick={() => setShowAll(value => !value)} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">{showAll ? "Show recent dates only" : `Show all ${dates.length} dates`}</button>}
  </section>;
}
