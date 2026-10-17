import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Lock, LoaderCircle } from "lucide-react";
import { AcademyApiError, type TrainerApi } from "./api";
import type { AttendanceStatus, Batch, ClassSession, Course, TrainerWorkspace } from "./contracts";
import { NOTES_LIMIT, formatDate, formatTime, isoWeekday, permittedDates, syllabusProgress, validateClassSession, type SessionErrors, type SessionField } from "./rules";

const statusLabels: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", leave: "Leave" };
const statusTone: Record<AttendanceStatus, string> = {
  present: "peer-checked:bg-emerald-700 peer-checked:text-white peer-checked:border-emerald-700",
  absent: "peer-checked:bg-rose-700 peer-checked:text-white peer-checked:border-rose-700",
  leave: "peer-checked:bg-amber-700 peer-checked:text-white peer-checked:border-amber-700",
};
const accessLabel = { today: "Today", yesterday: "Yesterday", granted: "Backdated access" } as const;
const fieldOrder: SessionField[] = ["form", "classDate", "startTime", "endTime", "attendance", "subtopics", "notes"];
const inputClass = "w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:border-indigo-600";

/**
 * One form for attendance and topics together. Submitting saves a single locked record; after that the
 * trainer can no longer edit it (corrections go through an authorised review).
 */
export function ClassSessionForm({ api, workspace, batch, course, onSubmitted }: { api: TrainerApi; workspace: TrainerWorkspace; batch: Batch; course: Course; onSubmitted: (session: ClassSession) => void }) {
  const client = useQueryClient();
  const dates = useMemo(() => permittedDates(batch, workspace.today, workspace.grants), [batch, workspace.today, workspace.grants]);
  const syllabus = useMemo(() => syllabusProgress(batch, course, workspace.sessions), [batch, course, workspace.sessions]);
  const submittedDates = new Set(workspace.sessions.filter(session => session.batchId === batch.id).map(session => session.classDate));
  const isClassDay = (date: string) => batch.classDays.includes(isoWeekday(date));
  // Open on the latest scheduled class still waiting for entry, so a trainer catching up the next day lands on it.
  const suggestedDate = dates.find(option => isClassDay(option.date) && !submittedDates.has(option.date))?.date ?? dates[0]?.date ?? "";
  const [chosenDate, setClassDate] = useState<string | null>(null);
  // Until the trainer picks a date, and whenever a used backdate grant drops theirs from the list, follow the suggestion.
  const classDate = chosenDate && dates.some(option => option.date === chosenDate) ? chosenDate : suggestedDate;
  const [startTime, setStartTime] = useState(batch.startTime);
  const [endTime, setEndTime] = useState(batch.endTime);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<SessionErrors>({});
  const [reviewing, setReviewing] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const input = { batchId: batch.id, classDate, startTime, endTime, attendance: Object.entries(attendance).filter((entry): entry is [string, AttendanceStatus] => !!entry[1]).map(([studentId, status]) => ({ studentId, status })), subtopicIds, notes: notes.trim() ? notes : null };
  const counts = { present: 0, absent: 0, leave: 0 } as Record<AttendanceStatus, number>;
  for (const mark of input.attendance) counts[mark.status]++;
  const subtopicTitle = new Map(course.syllabus.flatMap(topic => topic.subtopics.map(sub => [sub.id, `${topic.title} · ${sub.title}`] as const)));
  // The first module with something still to teach opens by default.
  const nextTopicId = course.syllabus.find(topic => topic.subtopics.some(sub => !syllabus.coveredOn.has(sub.id)))?.id;

  const submit = useMutation({
    mutationFn: () => api.submitClassSession(input, idempotencyKey.current),
    onSuccess: session => {
      idempotencyKey.current = crypto.randomUUID();
      setClassDate(null); setAttendance({}); setSubtopicIds([]); setNotes(""); setErrors({}); setReviewing(false);
      void client.invalidateQueries({ queryKey: ["trainer", "workspace"] });
      onSubmitted(session);
    },
    onError: error => {
      setReviewing(false);
      setErrors(error instanceof AcademyApiError && Object.keys(error.fieldErrors).length ? error.fieldErrors : { form: error instanceof AcademyApiError ? error.message : "The session could not be submitted. Check your connection and try again." });
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[data-error-summary]")?.focus());
    },
  });

  function review(event: FormEvent) {
    event.preventDefault();
    const found = validateClassSession(input, { batch, course, sessions: workspace.sessions, grants: workspace.grants, today: workspace.today, assignedBatchIds: workspace.batches.map(item => item.id) });
    setErrors(found);
    if (Object.keys(found).length) {
      const first = fieldOrder.find(field => found[field]);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(first === "form" ? "[data-error-summary]" : `[data-field="${first}"]`)?.focus());
      return;
    }
    setReviewing(true);
    requestAnimationFrame(() => reviewRef.current?.focus());
  }
  // Editing a field leaves review mode and clears that field's message; the next review re-checks everything.
  function touch(...fields: SessionField[]) {
    setReviewing(false);
    setErrors(current => fields.some(field => current[field]) ? Object.fromEntries(Object.entries(current).filter(([field]) => !fields.includes(field as SessionField))) : current);
  }
  const markAll = (status: AttendanceStatus) => setAttendance(Object.fromEntries(batch.students.map(student => [student.id, status])));
  // Selections are kept in syllabus order, whatever order they were ticked in.
  const syllabusOrder = useMemo(() => course.syllabus.flatMap(topic => topic.subtopics.map(sub => sub.id)), [course]);
  const toggleSubtopic = (id: string) => setSubtopicIds(current => syllabusOrder.filter(item => item === id ? !current.includes(id) : current.includes(item)));
  const errorText = (field: SessionField) => errors[field] && <p id={`${field}-error`} className="mt-2 text-sm font-medium text-rose-700">{errors[field]}</p>;
  const described = (field: SessionField) => errors[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  if (dates.length === 0) {
    return <p className="rounded-2xl bg-slate-100 p-5 text-base text-slate-700">No class date is open for entry. Today and yesterday fall outside this batch's dates, and no backdated access has been granted. Ask an authorised manager or admin for backdated access.</p>;
  }

  return <form ref={formRef} onSubmit={review} noValidate className="space-y-8" aria-label={`Class session entry for ${batch.code}`}>
    {(errors.form || Object.keys(errors).length > 1) && <div data-error-summary tabIndex={-1} role="alert" className="rounded-2xl bg-rose-50 p-4 text-base text-rose-800">
      <p className="font-semibold">{errors.form ?? "Some details need attention before this session can be submitted."}</p>
    </div>}

    <div className="grid gap-5 sm:grid-cols-3">
      <div className="sm:col-span-1">
        <label htmlFor="session-date" className="mb-2 block text-sm font-semibold text-slate-900">Class date</label>
        <select id="session-date" data-field="classDate" className={inputClass} value={classDate} onChange={event => { setClassDate(event.target.value); touch("classDate", "form"); }} {...described("classDate")}>
          {dates.map(option => <option key={option.date} value={option.date}>{accessLabel[option.access]} · {formatDate(option.date)}{isClassDay(option.date) ? "" : " · extra class"}</option>)}
        </select>
        {errorText("classDate")}
      </div>
      <div>
        <label htmlFor="session-start" className="mb-2 block text-sm font-semibold text-slate-900">Start time</label>
        <input id="session-start" data-field="startTime" type="time" className={inputClass} value={startTime} onChange={event => { setStartTime(event.target.value); touch("startTime", "endTime", "form"); }} {...described("startTime")}/>
        {errorText("startTime")}
      </div>
      <div>
        <label htmlFor="session-end" className="mb-2 block text-sm font-semibold text-slate-900">End time</label>
        <input id="session-end" data-field="endTime" type="time" className={inputClass} value={endTime} onChange={event => { setEndTime(event.target.value); touch("endTime", "form"); }} {...described("endTime")}/>
        {errorText("endTime")}
      </div>
    </div>

    <fieldset data-field="attendance" tabIndex={-1} className="min-w-0" {...described("attendance")}>
      <legend className="text-lg font-semibold text-slate-950">Attendance</legend>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700" aria-live="polite">{input.attendance.length} of {batch.students.length} marked · {counts.present} present · {counts.absent} absent · {counts.leave} on leave</p>
        <button type="button" onClick={() => { markAll("present"); touch("attendance"); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100"><CheckCheck size={16} aria-hidden="true"/>Mark everyone present</button>
      </div>
      {errorText("attendance")}
      <ul className="mt-4 divide-y divide-slate-200 rounded-2xl bg-white">
        {batch.students.map(student => <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0"><p className="text-base font-semibold text-slate-950">{student.name}</p><p className="text-sm text-slate-600">{student.registrationNo}</p></div>
          <div role="radiogroup" aria-label={`Attendance for ${student.name}`} className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
            {(Object.keys(statusLabels) as AttendanceStatus[]).map(status => <label key={status} className="relative">
              <input type="radio" className="peer sr-only" name={`attendance-${student.id}`} value={status} checked={attendance[student.id] === status} onChange={() => { setAttendance(current => ({ ...current, [student.id]: status })); touch("attendance"); }}/>
              <span className={`flex min-h-11 w-full cursor-pointer sm:min-w-[5.5rem] items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600 ${statusTone[status]}`}>{statusLabels[status]}</span>
            </label>)}
          </div>
        </li>)}
      </ul>
    </fieldset>

    <fieldset data-field="subtopics" tabIndex={-1} className="min-w-0" {...described("subtopics")}>
      <legend className="text-lg font-semibold text-slate-950">Topics and subtopics covered</legend>
      <p className="mt-2 text-sm text-slate-700">From the approved syllabus for {course.name}. Select everything taught in this session; it can span more than one module.</p>
      {errorText("subtopics")}
      <div className="mt-4 space-y-2">
        {course.syllabus.map(topic => {
          const selected = topic.subtopics.filter(sub => subtopicIds.includes(sub.id)).length;
          return <details key={topic.id} open={topic.id === nextTopicId || selected > 0} className="rounded-2xl bg-white">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-base font-semibold text-slate-950">
              <span>{topic.title}</span>
              <span className="text-sm font-medium text-slate-600">{selected > 0 ? `${selected} selected` : `${topic.subtopics.filter(sub => syllabus.coveredOn.has(sub.id)).length} of ${topic.subtopics.length} taught`}</span>
            </summary>
            <ul className="grid gap-1 px-4 pb-4 sm:grid-cols-2">
              {topic.subtopics.map(sub => {
                const taughtOn = syllabus.coveredOn.get(sub.id);
                return <li key={sub.id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                    <input type="checkbox" className="mt-1 size-5 shrink-0 accent-indigo-700" checked={subtopicIds.includes(sub.id)} onChange={() => { toggleSubtopic(sub.id); touch("subtopics"); }}/>
                    <span className="text-base text-slate-900">{sub.title}{taughtOn && <span className="block text-sm text-slate-600">Taught {formatDate(taughtOn)}</span>}</span>
                  </label>
                </li>;
              })}
            </ul>
          </details>;
        })}
      </div>
    </fieldset>

    <div>
      <label htmlFor="session-notes" className="mb-2 block text-sm font-semibold text-slate-900">Class notes <span className="font-normal text-slate-600">(optional)</span></label>
      <textarea id="session-notes" data-field="notes" rows={3} maxLength={NOTES_LIMIT} className={inputClass} value={notes} onChange={event => { setNotes(event.target.value); touch("notes"); }} {...described("notes")}/>
      <p className="mt-1 text-sm text-slate-600">{notes.length} / {NOTES_LIMIT}</p>
      {errorText("notes")}
    </div>

    {!reviewing && <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-700 px-6 text-base font-semibold text-white hover:bg-indigo-800">Review class session</button>}

    {reviewing && <div ref={reviewRef} tabIndex={-1} role="region" aria-label="Review before submitting" className="space-y-4 rounded-2xl bg-slate-950 p-6 text-white">
      <h3 className="text-xl font-semibold">Check before you submit</h3>
      <dl className="grid gap-3 text-base sm:grid-cols-2">
        <div><dt className="text-sm text-slate-300">Class</dt><dd>{formatDate(classDate, "long")}, {formatTime(startTime)} to {formatTime(endTime)}</dd></div>
        <div><dt className="text-sm text-slate-300">Attendance</dt><dd>{counts.present} present, {counts.absent} absent, {counts.leave} on leave</dd></div>
        <div className="sm:col-span-2"><dt className="text-sm text-slate-300">Covered</dt><dd><ul className="mt-1 list-disc space-y-1 pl-5">{subtopicIds.map(subtopicId => <li key={subtopicId}>{subtopicTitle.get(subtopicId)}</li>)}</ul></dd></div>
        {input.notes && <div className="sm:col-span-2"><dt className="text-sm text-slate-300">Notes</dt><dd className="whitespace-pre-line">{input.notes.trim()}</dd></div>}
      </dl>
      <p className="flex items-start gap-2 text-sm text-slate-200"><Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true"/>Once submitted, this record is locked. Corrections need an authorised manager or admin.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => submit.mutate()} disabled={submit.isPending} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-slate-950 disabled:opacity-60">{submit.isPending && <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>}{submit.isPending ? "Submitting…" : "Submit and lock"}</button>
        <button type="button" onClick={() => setReviewing(false)} disabled={submit.isPending} className="inline-flex min-h-12 items-center rounded-xl border border-white/30 px-6 text-base font-semibold text-white">Back to editing</button>
      </div>
    </div>}
  </form>;
}
