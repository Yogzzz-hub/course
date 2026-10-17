import { detailedProgrammes } from "../../data/programmeCatalog";
import { AcademyApiError, type TrainerApi } from "./api";
import { trainerWorkspaceSchema, type AttendanceStatus, type Batch, type ClassSession, type Course, type Student, type TrainerWorkspace } from "./contracts";
import { addDays, attendanceProgress, completionStatus, dateAccess, grantFor, scheduledDates, syllabusProgress, todayIn, validateClassSession } from "./rules";

/**
 * An in-browser stand-in for the academy API, used until a backend is connected. It applies the same
 * rules a backend must enforce (assigned batches only, date window, one locked record per batch, date
 * and time, approved syllabus) and keeps submissions for the current browser tab only.
 */
const STORAGE_KEY = "academy-demo-trainer-v1";

interface DemoState { seededFor: string; workspace: TrainerWorkspace; idempotency: Record<string, string> }

function courseFrom(programmeId: string, code: string, durationWeeks: number): Course {
  const programme = detailedProgrammes.find(item => item.id === programmeId);
  if (!programme) throw new Error(`Unknown programme ${programmeId}`);
  return {
    id: `course-${programmeId}`,
    code,
    name: programme.name,
    durationWeeks,
    syllabusStatus: "approved",
    syllabus: programme.modules.map((module, topicIndex) => ({
      id: `${code.toLowerCase()}-t${topicIndex + 1}`,
      title: module.name,
      subtopics: module.topics.map((topic, subIndex) => ({ id: `${code.toLowerCase()}-t${topicIndex + 1}-s${subIndex + 1}`, title: topic })),
    })),
  };
}
const students = (prefix: string, names: [string, Student["schedulePreference"]][]): Student[] =>
  names.map(([name, schedulePreference], index) => ({ id: `${prefix}-st${index + 1}`, registrationNo: `SS-2026-${prefix.toUpperCase()}${String(index + 1).padStart(3, "0")}`, name, schedulePreference }));

function seed(today: string, now: Date): TrainerWorkspace {
  const python = courseFrom("python-full-stack", "PFS", 28);
  const react = courseFrom("react-development", "RCT", 4);
  const weekday: Batch = {
    id: "batch-pfs-weekday", code: "PFS-WD-2026-03", courseId: python.id, scheduleType: "weekdays", classDays: [1, 3, 5],
    startTime: "18:30", endTime: "20:30", startDate: addDays(today, -42), expectedEndDate: addDays(today, 7 * 28 - 42),
    students: students("wd", [["Aarav Menon", "weekdays"], ["Diya Krishnan", "weekdays"], ["Ishaan Rao", "flexible"], ["Meera Pillai", "weekdays"], ["Rohan Iyer", "weekdays"], ["Sana Fathima", "weekdays"]]),
  };
  const weekend: Batch = {
    id: "batch-react-weekend", code: "RCT-WE-2026-01", courseId: react.id, scheduleType: "weekends", classDays: [6, 7],
    startTime: "10:00", endTime: "13:00", startDate: addDays(today, -27), expectedEndDate: today,
    students: students("we", [["Arjun Nair", "weekends"], ["Kavya Reddy", "weekends"], ["Nikhil Das", "flexible"], ["Priya Raman", "weekends"]]),
  };
  const submittedAt = (date: string) => `${date}T15:10:00.000Z`;
  const sessions: ClassSession[] = [];
  const grants: TrainerWorkspace["grants"] = [];
  const expiresAt = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  // Weekday batch: about six weeks in, two past classes never submitted, one of them with granted backdated access.
  const weekdayPast = scheduledDates(weekday).filter(date => date < addDays(today, -1));
  const pythonSubtopics = python.syllabus.flatMap(topic => topic.subtopics.map(sub => sub.id));
  const missingWithGrant = weekdayPast[weekdayPast.length - 3], missingPlain = weekdayPast[weekdayPast.length - 6];
  weekdayPast.forEach((date, index) => {
    if (date === missingWithGrant || date === missingPlain) return;
    const status = (studentIndex: number): AttendanceStatus => (studentIndex * 7 + index * 3) % 11 === 0 ? "absent" : (studentIndex + index) % 13 === 0 ? "leave" : "present";
    sessions.push({ id: `seed-wd-${index}`, batchId: weekday.id, classDate: date, startTime: "18:30", endTime: "20:30", attendance: weekday.students.map((student, studentIndex) => ({ studentId: student.id, status: status(studentIndex) })), subtopicIds: [pythonSubtopics[Math.floor(index / 2)]], notes: index % 4 === 0 ? "Pair exercise reviewed at the end of class." : null, submittedBy: "trainer-demo", submittedAt: submittedAt(date), locked: true });
  });
  if (missingWithGrant) grants.push({ id: "grant-wd-1", batchId: weekday.id, classDate: missingWithGrant, grantedBy: "Academy admin", expiresAt, usedBySessionId: null });

  // Weekend batch: ends today. Every class but the last is in, so one more session completes the course for two students.
  const weekendDates = scheduledDates(weekend);
  const finalDate = weekendDates[weekendDates.length - 1];
  const reactSubtopics = react.syllabus.flatMap(topic => topic.subtopics.map(sub => sub.id));
  weekendDates.slice(0, -1).forEach((date, index) => {
    const status = (studentIndex: number): AttendanceStatus => studentIndex === 2 && index === 1 ? "absent" : studentIndex === 3 && index === 3 ? "leave" : "present";
    sessions.push({ id: `seed-we-${index}`, batchId: weekend.id, classDate: date, startTime: "10:00", endTime: "13:00", attendance: weekend.students.map((student, studentIndex) => ({ studentId: student.id, status: status(studentIndex) })), subtopicIds: reactSubtopics.slice(index * 2, index * 2 + 2), notes: null, submittedBy: "trainer-demo", submittedAt: submittedAt(date), locked: true });
  });
  if (finalDate && finalDate < addDays(today, -1)) grants.push({ id: "grant-we-1", batchId: weekend.id, classDate: finalDate, grantedBy: "Academy admin", expiresAt, usedBySessionId: null });

  return {
    trainer: { id: "trainer-demo", name: "Demo Trainer", specialization: "Python, Django and React", phone: "+91 90000 00000" },
    today, batches: [weekday, weekend], courses: [python, react], sessions, grants, completionRequests: [],
  };
}

export interface DemoTrainerApi extends TrainerApi { reset(): void }

export function createDemoTrainerApi({ now = () => new Date(), storage = defaultStorage(), latency = 120 }: { now?: () => Date; storage?: Storage | null; latency?: number } = {}): DemoTrainerApi {
  let memory: DemoState | null = null;
  const wait = () => new Promise(resolve => setTimeout(resolve, latency));
  function fresh(): DemoState {
    const today = todayIn(undefined, now());
    return { seededFor: today, workspace: seed(today, now()), idempotency: {} };
  }
  function load(): DemoState {
    const today = todayIn(undefined, now());
    if (!memory) {
      try {
        const saved = storage?.getItem(STORAGE_KEY);
        if (saved) memory = JSON.parse(saved) as DemoState;
      } catch { memory = null; }
    }
    // A new academy day starts a fresh demo, so the date rules always have something to show.
    if (!memory || memory.seededFor !== today) memory = fresh();
    return memory;
  }
  function save(state: DemoState) {
    memory = state;
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Kept in memory when storage is blocked. */ }
  }
  const snapshot = (state: DemoState) => trainerWorkspaceSchema.parse({ ...structuredClone(state.workspace), today: state.seededFor });

  return {
    async workspace() {
      await wait();
      return snapshot(load());
    },
    async submitClassSession(input, idempotencyKey) {
      await wait();
      const state = load();
      const workspace = state.workspace;
      const repeat = state.idempotency[idempotencyKey];
      if (repeat) {
        const existing = workspace.sessions.find(session => session.id === repeat);
        if (existing) return structuredClone(existing);
      }
      const batch = workspace.batches.find(item => item.id === input.batchId);
      const course = batch && workspace.courses.find(item => item.id === batch.courseId);
      if (!batch || !course) throw new AcademyApiError(403, "This batch is not assigned to you.");
      const errors = validateClassSession(input, { batch, course, sessions: workspace.sessions, grants: workspace.grants, today: state.seededFor, assignedBatchIds: workspace.batches.map(item => item.id), now: now() });
      if (Object.keys(errors).length) {
        const duplicate = errors.form?.includes("already been submitted");
        throw new AcademyApiError(duplicate ? 409 : 422, duplicate ? errors.form! : "Check the highlighted fields.", errors);
      }
      const access = dateAccess(batch, input.classDate, state.seededFor, workspace.grants, now());
      const session: ClassSession = {
        id: `session-${crypto.randomUUID()}`, batchId: batch.id, classDate: input.classDate, startTime: input.startTime, endTime: input.endTime,
        attendance: batch.students.map(student => ({ studentId: student.id, status: input.attendance.find(mark => mark.studentId === student.id)!.status })),
        subtopicIds: [...new Set(input.subtopicIds)], notes: input.notes?.trim() ? input.notes.trim() : null,
        submittedBy: workspace.trainer.id, submittedAt: now().toISOString(), locked: true,
      };
      const grant = access === "granted" ? grantFor(batch, input.classDate, workspace.grants, now()) : null;
      save({
        ...state,
        idempotency: { ...state.idempotency, [idempotencyKey]: session.id },
        workspace: { ...workspace, sessions: [...workspace.sessions, session], grants: workspace.grants.map(item => item.id === grant?.id ? { ...item, usedBySessionId: session.id } : item) },
      });
      return structuredClone(session);
    },
    async requestCompletion({ batchId, studentId }) {
      await wait();
      const state = load();
      const workspace = state.workspace;
      const batch = workspace.batches.find(item => item.id === batchId);
      const course = batch && workspace.courses.find(item => item.id === batch.courseId);
      if (!batch || !course || !batch.students.some(student => student.id === studentId)) throw new AcademyApiError(403, "This student is not in a batch assigned to you.");
      if (workspace.completionRequests.some(request => request.batchId === batchId && request.studentId === studentId)) throw new AcademyApiError(409, "This course has already been submitted for approval.");
      const status = completionStatus(attendanceProgress(batch, workspace.sessions, studentId).percent, syllabusProgress(batch, course, workspace.sessions).percent);
      if (!status.eligible) throw new AcademyApiError(422, `${status.label}. Both attendance and syllabus must reach 100%.`);
      const request = { batchId, studentId, submittedAt: now().toISOString(), status: "pending_admin" as const };
      save({ ...state, workspace: { ...workspace, completionRequests: [...workspace.completionRequests, request] } });
      return structuredClone(request);
    },
    reset() { save(fresh()); },
  };
}

function defaultStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}
