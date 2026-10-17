import { z } from "zod";

/**
 * Data contract for the academy-operations workspaces (trainer first). Every response is parsed
 * with these schemas, so a backend plugged in later must return exactly this shape.
 */
const id = z.string().trim().min(1).max(120);
const text = z.string().trim().min(1).max(300);
/** A calendar date in the academy's time zone, as YYYY-MM-DD. */
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** A wall-clock time, as HH:MM (24-hour). */
export const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const instant = z.iso.datetime({ offset: true });

export const attendanceStatusSchema = z.enum(["present", "absent", "leave"]);
export const scheduleTypeSchema = z.enum(["weekdays", "weekends", "flexible"]);

export const subtopicSchema = z.object({ id, title: text });
export const topicSchema = z.object({ id, title: text, subtopics: z.array(subtopicSchema).min(1) });
export const courseSchema = z.object({
  id,
  code: text,
  name: text,
  durationWeeks: z.number().int().positive(),
  /** Only an approved syllabus may be used for class sessions and progress. */
  syllabusStatus: z.literal("approved"),
  syllabus: z.array(topicSchema).min(1),
});

export const studentSchema = z.object({
  id,
  registrationNo: text,
  name: text,
  /** Recorded at enquiry or admission; it is a preference, not the confirmed schedule. */
  schedulePreference: scheduleTypeSchema,
});

export const batchSchema = z.object({
  id,
  code: text,
  courseId: id,
  scheduleType: scheduleTypeSchema,
  /** ISO weekdays the batch meets on: 1 = Monday … 7 = Sunday. */
  classDays: z.array(z.number().int().min(1).max(7)).min(1),
  startTime: clockTime,
  endTime: clockTime,
  startDate: isoDate,
  expectedEndDate: isoDate,
  students: z.array(studentSchema),
});

export const attendanceMarkSchema = z.object({ studentId: id, status: attendanceStatusSchema });

export const classSessionSchema = z.object({
  id,
  batchId: id,
  classDate: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  attendance: z.array(attendanceMarkSchema),
  subtopicIds: z.array(id).min(1),
  notes: z.string().max(1000).nullable(),
  submittedBy: id,
  submittedAt: instant,
  /** Submitted sessions are always locked; corrections go through an authorised workflow. */
  locked: z.literal(true),
});

export const backdateGrantSchema = z.object({
  id,
  batchId: id,
  classDate: isoDate,
  grantedBy: text,
  expiresAt: instant,
  usedBySessionId: id.nullable(),
});

export const completionRequestSchema = z.object({
  batchId: id,
  studentId: id,
  submittedAt: instant,
  status: z.enum(["pending_admin", "approved", "rejected"]),
});

export const trainerWorkspaceSchema = z.object({
  trainer: z.object({ id, name: text, specialization: text, phone: text }),
  /** "Today" in the academy's time zone, decided by the server so date rules agree everywhere. */
  today: isoDate,
  batches: z.array(batchSchema),
  courses: z.array(courseSchema),
  sessions: z.array(classSessionSchema),
  grants: z.array(backdateGrantSchema),
  completionRequests: z.array(completionRequestSchema),
});

export const classSessionInputSchema = z.object({
  batchId: id,
  classDate: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  attendance: z.array(attendanceMarkSchema),
  subtopicIds: z.array(id),
  notes: z.string().max(1000).nullable(),
});

export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type ScheduleType = z.infer<typeof scheduleTypeSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Batch = z.infer<typeof batchSchema>;
export type AttendanceMark = z.infer<typeof attendanceMarkSchema>;
export type ClassSession = z.infer<typeof classSessionSchema>;
export type BackdateGrant = z.infer<typeof backdateGrantSchema>;
export type CompletionRequest = z.infer<typeof completionRequestSchema>;
export type TrainerWorkspace = z.infer<typeof trainerWorkspaceSchema>;
export type ClassSessionInput = z.infer<typeof classSessionInputSchema>;
