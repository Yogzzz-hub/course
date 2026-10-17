import { z } from "zod";
import {
  batchSchema,
  classSessionSchema,
  completionRequestSchema,
  courseSchema,
  isoDate,
} from "../academy/contracts";

const id = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(4000);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime({ offset: true });
export const safeLink = z.string().refine((value) => {
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Use a secure HTTPS link or a local path.");
export const webUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS URL without credentials.");
export const leadStatusSchema = z.enum([
  "new",
  "counselling_booked",
  "counselling_complete",
  "plan_ready",
  "payment_pending",
]);
const identity = {
  userId: id,
  cacheKey: id,
  name: text,
  email: z.email(),
  csrfToken: id,
};
export const sessionSchema = z.discriminatedUnion("mode", [
  z.object({
    ...identity,
    mode: z.literal("prospect"),
    leadStatus: leadStatusSchema,
    pendingOrderId: id.nullable(),
  }),
  z.object({
    ...identity,
    mode: z.literal("enrolled"),
    enrolmentId: id,
    programme: text,
    payment: z.object({
      status: z.literal("verified"),
      orderId: id,
      verifiedAt: instant,
    }),
  }),
]);
export const sessionResponseSchema = z.object({
  session: sessionSchema.nullable(),
});
export const packageSchema = z
  .object({
    id,
    name: text,
    description: text,
    inclusions: z.array(z.object({ label: text, included: z.boolean() })),
    feeLines: z.array(z.object({ label: text, amountMinor: amount })).min(1),
    totalMinor: count,
    dueNowMinor: count,
  })
  .refine(
    (value) =>
      Number.isSafeInteger(
        value.feeLines.reduce((total, line) => total + line.amountMinor, 0),
      ) &&
      value.feeLines.reduce((total, line) => total + line.amountMinor, 0) ===
        value.totalMinor &&
      value.dueNowMinor <= value.totalMinor,
    "Invalid fee breakdown.",
  );
export const learningPlanSchema = z
  .object({
    id,
    version: id,
    programme: text,
    counsellor: text,
    summary: text,
    currency: z.string().regex(/^[A-Z]{3}$/),
    recommendedPackageId: id,
    expiresAt: instant,
    terms: z.object({ version: id, url: safeLink }),
    packages: z.array(packageSchema).min(1),
  })
  .refine(
    (value) =>
      value.packages.some((item) => item.id === value.recommendedPackageId) &&
      new Set(value.packages.map((item) => item.id)).size ===
        value.packages.length,
    "Invalid package choices.",
  );
export const billingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  address: z.string().trim().min(5).max(400),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, "Use a two-letter country code, e.g. IN."),
});
export const checkoutInputSchema = z.object({
  planId: id,
  planVersion: id,
  packageId: id,
  termsVersion: id,
  consent: z.literal(true),
  expectedAmountMinor: count,
  currency: z.string().regex(/^[A-Z]{3}$/),
  billing: billingSchema,
});
export const orderSchema = z.object({
  id,
  status: z.enum(["pending", "verified", "failed", "cancelled"]),
  amountMinor: count,
  currency: z.string().regex(/^[A-Z]{3}$/),
  checkoutUrl: webUrl.nullable(),
  expiresAt: instant,
  receiptUrl: safeLink.nullable(),
});
const liveClassSchema = z
  .object({
    id,
    title: text,
    startsAt: instant,
    endsAt: instant,
    joinUrl: safeLink.nullable(),
  })
  .refine(
    (value) => Date.parse(value.endsAt) > Date.parse(value.startsAt),
    "Invalid class duration.",
  );
export const dashboardSchema = z.object({
  nextClass: liveClassSchema.nullable(),
  classes: z.array(liveClassSchema),
  deadlines: z.array(z.object({ id, title: text, dueAt: instant })),
  modules: z.array(
    z
      .object({ id, title: text, completed: count, total: count })
      .refine(
        (value) => value.completed <= value.total,
        "Invalid module progress.",
      ),
  ),
  onboarding: z.array(
    z.object({
      id,
      title: text,
      completed: z.boolean(),
      url: safeLink.nullable(),
    }),
  ),
});
const rubricSchema = z.object({ id, label: text, maxPoints: count });
export const assignmentSchema = z
  .object({
    id,
    title: text,
    description: text,
    kind: z.enum(["assignment", "project"]),
    dueAt: instant,
    canSubmit: z.boolean(),
    maxAttempts: count,
    rubric: z.array(rubricSchema),
    attempts: z.array(
      z.object({
        id,
        number: count,
        submittedAt: instant,
        status: z.enum(["submitted", "reviewing", "graded"]),
        repositoryUrl: webUrl.nullable(),
        liveUrl: webUrl.nullable(),
        attachmentName: text.nullable(),
        feedback: z.string().max(8000).nullable(),
        scores: z.array(z.object({ rubricId: id, points: count })),
      }),
    ),
  })
  .superRefine((value, context) => {
    const criteria = new Map(
      value.rubric.map((item) => [item.id, item.maxPoints]),
    );
    if (
      criteria.size !== value.rubric.length ||
      value.attempts.some((attempt) =>
        attempt.scores.some(
          (score) =>
            !criteria.has(score.rubricId) ||
            score.points > criteria.get(score.rubricId)!,
        ),
      )
    )
      context.addIssue({ code: "custom", message: "Invalid rubric scores." });
  });
export const assignmentsSchema = z.object({
  assignments: z.array(assignmentSchema),
});
export const mentorshipSchema = z.object({
  entitlement: z
    .object({ total: count, used: count, reserved: count })
    .refine(
      (value) => value.used + value.reserved <= value.total,
      "Invalid entitlement.",
    ),
  bookings: z.array(
    z.object({
      id,
      startsAt: instant,
      endsAt: instant,
      mentor: text,
      status: z.enum(["booked", "completed", "cancelled"]),
      joinUrl: safeLink.nullable(),
    }),
  ),
  attendance: z.array(
    z.object({
      classId: id,
      title: text,
      startsAt: instant,
      status: z.enum(["present", "absent", "excused", "pending"]),
    }),
  ),
});
export const slotsSchema = z.object({
  slots: z.array(
    z
      .object({ id, startsAt: instant, endsAt: instant, mentor: text })
      .refine(
        (value) => Date.parse(value.endsAt) > Date.parse(value.startsAt),
        "Invalid slot duration.",
      ),
  ),
});
export const paymentsSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  instalments: z.array(
    z.object({
      id,
      label: text,
      amountMinor: count,
      dueAt: instant,
      status: z.enum(["due", "processing", "paid"]),
      pendingOrderId: id.nullable().default(null),
      receiptUrl: safeLink.nullable(),
    }),
  ),
});
export const sessionsSchema = z.object({
  sessions: z.array(
    z.object({
      id,
      title: text,
      startsAt: instant,
      status: z.enum(["booked", "completed", "cancelled"]),
      joinUrl: safeLink.nullable(),
    }),
  ),
});
// Date-wise class sessions and progress use the academy-operations shapes, narrowed to what one
// student may see: their own roster entry and only their own attendance mark on each session.
export const classProgressSchema = z
  .object({
    /** The signed-in student's id on the batch roster. */
    studentId: id,
    /** "Today" in the academy's time zone, decided by the server so date rules agree everywhere. */
    today: isoDate,
    batch: batchSchema,
    course: courseSchema,
    sessions: z.array(classSessionSchema),
    completionRequest: completionRequestSchema.nullable(),
  })
  .superRefine((value, context) => {
    const { batch, studentId, sessions, completionRequest } = value;
    const invalid = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      batch.courseId !== value.course.id ||
      batch.startDate > batch.expectedEndDate
    )
      invalid("Invalid batch.");
    if (batch.students.length !== 1 || batch.students[0].id !== studentId)
      invalid("The roster may only hold the signed-in student.");
    if (
      new Set(sessions.map((session) => session.id)).size !== sessions.length ||
      sessions.some(
        (session) =>
          session.batchId !== batch.id ||
          session.attendance.length > 1 ||
          session.attendance.some((mark) => mark.studentId !== studentId),
      )
    )
      invalid("Sessions may only carry the student's own attendance.");
    if (
      completionRequest &&
      (completionRequest.batchId !== batch.id ||
        completionRequest.studentId !== studentId)
    )
      invalid("Invalid completion request.");
  });
export type StudentSession = z.infer<typeof sessionSchema>;
export type LearningPlan = z.infer<typeof learningPlanSchema>;
export type PlanPackage = z.infer<typeof packageSchema>;
export type Billing = z.infer<typeof billingSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type PaymentOrder = z.infer<typeof orderSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Mentorship = z.infer<typeof mentorshipSchema>;
export type MentorshipSlot = z.infer<typeof slotsSchema>["slots"][number];
export type Payments = z.infer<typeof paymentsSchema>;
export type StudentSessions = z.infer<typeof sessionsSchema>;
export type ClassProgress = z.infer<typeof classProgressSchema>;
export interface MutationContext {
  csrfToken: string;
  requestId: string;
}
export interface SubmissionInput {
  assignmentId: string;
  repositoryUrl: string;
  liveUrl: string;
  file: File | null;
}
export interface StudentApi {
  session(signal?: AbortSignal): Promise<StudentSession | null>;
  learningPlan(signal?: AbortSignal): Promise<LearningPlan | null>;
  dashboard(signal?: AbortSignal): Promise<Dashboard>;
  assignments(signal?: AbortSignal): Promise<Assignment[]>;
  mentorship(signal?: AbortSignal): Promise<Mentorship>;
  slots(timeZone: string, signal?: AbortSignal): Promise<MentorshipSlot[]>;
  payments(signal?: AbortSignal): Promise<Payments>;
  sessions(signal?: AbortSignal): Promise<StudentSessions["sessions"]>;
  classProgress(signal?: AbortSignal): Promise<ClassProgress | null>;
  order(id: string, signal?: AbortSignal): Promise<PaymentOrder>;
  checkout(
    input: CheckoutInput,
    context: MutationContext,
  ): Promise<PaymentOrder>;
  payInstalment(id: string, context: MutationContext): Promise<PaymentOrder>;
  submit(input: SubmissionInput, context: MutationContext): Promise<Assignment>;
  bookMentorship(slotId: string, context: MutationContext): Promise<Mentorship>;
  completeOnboarding(id: string, context: MutationContext): Promise<Dashboard>;
  logout(context: MutationContext): Promise<void>;
}
export interface PaymentGateway {
  open(order: PaymentOrder): Promise<void>;
}
