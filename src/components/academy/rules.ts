import type { BackdateGrant, Batch, ClassSession, ClassSessionInput, Course } from "./contracts";

/** The academy keeps one calendar; "today" and "yesterday" are always read in this zone. */
export const ACADEMY_TIME_ZONE = "Asia/Kolkata";
export const NOTES_LIMIT = 1000;

// ---------- Calendar helpers (dates are YYYY-MM-DD strings, compared as UTC days) ----------

export function todayIn(timeZone = ACADEMY_TIME_ZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function toUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(toUtc(date)).getUTCDay();
  return day === 0 ? 7 : day;
}
export function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
export function formatDate(date: string, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("en-IN", style === "long"
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
    : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(toUtc(date))).replace(",", "");
}
export function formatTime(time: string): string {
  const [hours, mins] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, hours, mins)));
}

// ---------- Schedule ----------

/** Every date the batch is scheduled to meet, from its start date to its expected end date. */
export function scheduledDates(batch: Batch): string[] {
  const dates: string[] = [];
  for (let date = batch.startDate; date <= batch.expectedEndDate; date = addDays(date, 1)) {
    if (batch.classDays.includes(isoWeekday(date))) dates.push(date);
  }
  return dates;
}
const sessionsFor = (batchId: string, sessions: ClassSession[]) => sessions.filter(session => session.batchId === batchId);

export type DayStatus = "submitted" | "not-submitted" | "due-today" | "upcoming";
/** A scheduled date with no submitted session is "Attendance Not Submitted", never an automatic absence. */
export function dayStatus(batch: Batch, sessions: ClassSession[], date: string, today: string): DayStatus {
  if (sessionsFor(batch.id, sessions).some(session => session.classDate === date)) return "submitted";
  if (date > today) return "upcoming";
  return date === today ? "due-today" : "not-submitted";
}
export function missingAttendanceDates(batch: Batch, sessions: ClassSession[], today: string): string[] {
  return scheduledDates(batch).filter(date => dayStatus(batch, sessions, date, today) === "not-submitted");
}

// ---------- Progress ----------

export interface AttendanceProgress { present: number; scheduled: number; percent: number }
/** (Present classes ÷ total scheduled classes) × 100. Absent and Leave do not count. */
export function attendanceProgress(batch: Batch, sessions: ClassSession[], studentId: string): AttendanceProgress {
  const scheduled = scheduledDates(batch).length;
  const present = sessionsFor(batch.id, sessions)
    .filter(session => session.attendance.some(mark => mark.studentId === studentId && mark.status === "present")).length;
  return { present, scheduled, percent: scheduled === 0 ? 0 : Math.min(100, Math.floor((present / scheduled) * 100)) };
}

export interface SyllabusProgress { covered: number; total: number; percent: number; coveredOn: Map<string, string> }
/** Share of the approved syllabus's subtopics recorded as taught. No weighting, no separate confirmation. */
export function syllabusProgress(batch: Batch, course: Course, sessions: ClassSession[]): SyllabusProgress {
  const subtopicIds = new Set(course.syllabus.flatMap(topic => topic.subtopics.map(sub => sub.id)));
  const coveredOn = new Map<string, string>();
  for (const session of [...sessionsFor(batch.id, sessions)].sort((a, b) => a.classDate.localeCompare(b.classDate))) {
    for (const subtopicId of session.subtopicIds) if (subtopicIds.has(subtopicId) && !coveredOn.has(subtopicId)) coveredOn.set(subtopicId, session.classDate);
  }
  const total = subtopicIds.size;
  return { covered: coveredOn.size, total, percent: total === 0 ? 0 : Math.floor((coveredOn.size / total) * 100), coveredOn };
}

export interface CompletionStatus { eligible: boolean; label: string }
/** The trainer may submit for admin approval only when both values have reached 100%. */
export function completionStatus(attendancePercent: number, syllabusPercent: number): CompletionStatus {
  const attendanceDone = attendancePercent >= 100, syllabusDone = syllabusPercent >= 100;
  if (attendanceDone && syllabusDone) return { eligible: true, label: "Can be submitted for admin approval" };
  if (attendanceDone) return { eligible: false, label: "Not eligible · syllabus incomplete" };
  if (syllabusDone) return { eligible: false, label: "Not eligible · attendance incomplete" };
  return { eligible: false, label: "Not eligible · attendance and syllabus incomplete" };
}

// ---------- Which dates a trainer may enter ----------

export type DateAccess = "today" | "yesterday" | "granted" | "future" | "needs-grant" | "outside-batch";
const liveGrant = (grants: BackdateGrant[], batchId: string, date: string, now: Date) =>
  grants.find(grant => grant.batchId === batchId && grant.classDate === date && grant.usedBySessionId === null && Date.parse(grant.expiresAt) > now.getTime());

/** Today and yesterday are open; earlier dates need an authorised, unused grant; future dates are locked. */
export function dateAccess(batch: Batch, date: string, today: string, grants: BackdateGrant[], now = new Date()): DateAccess {
  if (date < batch.startDate || date > batch.expectedEndDate) return "outside-batch";
  if (date > today) return "future";
  if (date === today) return "today";
  if (date === addDays(today, -1)) return "yesterday";
  return liveGrant(grants, batch.id, date, now) ? "granted" : "needs-grant";
}
export function grantFor(batch: Batch, date: string, grants: BackdateGrant[], now = new Date()) {
  return liveGrant(grants, batch.id, date, now) ?? null;
}

export interface PermittedDate { date: string; access: "today" | "yesterday" | "granted" }
export function permittedDates(batch: Batch, today: string, grants: BackdateGrant[], now = new Date()): PermittedDate[] {
  const candidates = [today, addDays(today, -1), ...grants.filter(grant => grant.batchId === batch.id).map(grant => grant.classDate)];
  const seen = new Set<string>();
  const result: PermittedDate[] = [];
  for (const date of candidates) {
    if (seen.has(date)) continue;
    seen.add(date);
    const access = dateAccess(batch, date, today, grants, now);
    if (access === "today" || access === "yesterday" || access === "granted") result.push({ date, access });
  }
  return result;
}

// ---------- Validating one combined class session ----------

export type SessionField = "form" | "classDate" | "startTime" | "endTime" | "attendance" | "subtopics" | "notes";
export type SessionErrors = Partial<Record<SessionField, string>>;
export interface SessionContext { batch: Batch; course: Course; sessions: ClassSession[]; grants: BackdateGrant[]; today: string; assignedBatchIds: string[]; now?: Date }

export function validateClassSession(input: ClassSessionInput, context: SessionContext): SessionErrors {
  const { batch, course, sessions, grants, today, assignedBatchIds } = context;
  const errors: SessionErrors = {};
  if (!assignedBatchIds.includes(input.batchId) || input.batchId !== batch.id) errors.form = "You can only submit sessions for batches assigned to you.";

  const access = dateAccess(batch, input.classDate, today, grants, context.now);
  if (access === "future") errors.classDate = "Future dates are locked.";
  else if (access === "needs-grant") errors.classDate = "Dates before yesterday need authorised backdated access.";
  else if (access === "outside-batch") errors.classDate = "This date is outside the batch's schedule.";

  if (!input.startTime) errors.startTime = "Enter the time the session started.";
  if (!input.endTime) errors.endTime = "Enter the time the session ended.";
  else if (input.startTime && minutes(input.endTime) <= minutes(input.startTime)) errors.endTime = "End time must be later than the start time.";

  if (!errors.classDate && input.startTime && input.endTime && !errors.endTime) {
    const sameDay = sessionsFor(batch.id, sessions).filter(session => session.classDate === input.classDate);
    if (sameDay.some(session => session.startTime === input.startTime)) {
      errors.form = "A class session for this batch, date and start time has already been submitted.";
    } else if (sameDay.some(session => minutes(input.startTime) < minutes(session.endTime) && minutes(session.startTime) < minutes(input.endTime))) {
      errors.startTime = "This time overlaps a session already submitted for that date.";
    }
  }

  const roster = new Set(batch.students.map(student => student.id));
  const marked = new Set<string>();
  let unknown = false;
  for (const mark of input.attendance) {
    if (!roster.has(mark.studentId) || marked.has(mark.studentId)) unknown = true;
    marked.add(mark.studentId);
  }
  const missing = batch.students.filter(student => !marked.has(student.id)).length;
  if (unknown) errors.attendance = "Attendance includes a student who is not in this batch.";
  else if (missing > 0) errors.attendance = `Mark attendance for every student (${missing} left).`;

  const approved = new Set(course.syllabus.flatMap(topic => topic.subtopics.map(sub => sub.id)));
  if (input.subtopicIds.length === 0) errors.subtopics = "Select at least one subtopic covered in this session.";
  else if (input.subtopicIds.some(subtopicId => !approved.has(subtopicId))) errors.subtopics = "Choose subtopics from the approved syllabus.";

  if ((input.notes ?? "").length > NOTES_LIMIT) errors.notes = `Keep notes under ${NOTES_LIMIT} characters.`;
  return errors;
}
