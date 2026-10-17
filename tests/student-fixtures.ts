import type { AttendanceStatus, ClassSession } from "../src/components/academy/contracts";
import type {
  Assignment,
  ClassProgress,
  Dashboard,
  LearningPlan,
  Mentorship,
  Payments,
  StudentSession,
} from "../src/components/student-panel/contracts";

export const future = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();
export const prospectSession: StudentSession = {
  mode: "prospect",
  userId: "student-1",
  cacheKey: "session-1",
  name: "Asha Rao",
  email: "asha@example.test",
  csrfToken: "test-csrf",
  leadStatus: "plan_ready",
  pendingOrderId: null,
};
export const enrolledSession: StudentSession = {
  mode: "enrolled",
  userId: "student-1",
  cacheKey: "session-1",
  name: "Asha Rao",
  email: "asha@example.test",
  csrfToken: "test-csrf",
  enrolmentId: "enrolment-1",
  programme: "Python Full-Stack",
  payment: {
    status: "verified",
    orderId: "order-1",
    verifiedAt: new Date().toISOString(),
  },
};
export const studentPlan: LearningPlan = {
  id: "plan-1",
  version: "v2",
  programme: "Python Full-Stack",
  counsellor: "Maya",
  summary:
    "Build strong fundamentals, then ship a full-stack portfolio with weekly practice.",
  currency: "INR",
  recommendedPackageId: "premium",
  expiresAt: future(30),
  terms: { version: "2026-10", url: "/terms-and-conditions" },
  packages: [
    {
      id: "standard",
      name: "Standard",
      description: "A structured path to your first portfolio.",
      inclusions: [
        { label: "Live classes", included: true },
        { label: "Personal mentorship", included: false },
      ],
      feeLines: [{ label: "Tuition", amountMinor: 5999900 }],
      totalMinor: 5999900,
      dueNowMinor: 2000000,
    },
    {
      id: "premium",
      name: "Premium",
      description: "Guidance and feedback as you build.",
      inclusions: [
        { label: "Live classes", included: true },
        { label: "Personal mentorship", included: true },
      ],
      feeLines: [
        { label: "Tuition", amountMinor: 7999900 },
        { label: "Learning plan discount", amountMinor: -500000 },
      ],
      totalMinor: 7499900,
      dueNowMinor: 2500000,
    },
  ],
};
export const studentDashboard: Dashboard = {
  nextClass: {
    id: "class-1",
    title: "Building APIs with Django",
    startsAt: future(1),
    endsAt: new Date(Date.parse(future(1)) + 3600000).toISOString(),
    joinUrl: "https://meet.example.test/class-1",
  },
  classes: [
    {
      id: "class-1",
      title: "Building APIs with Django",
      startsAt: future(1),
      endsAt: new Date(Date.parse(future(1)) + 3600000).toISOString(),
      joinUrl: "https://meet.example.test/class-1",
    },
  ],
  deadlines: [
    { id: "assignment-1", title: "Build a task API", dueAt: future(3) },
  ],
  modules: [
    { id: "python", title: "Python foundations", completed: 8, total: 10 },
    { id: "django", title: "Django APIs", completed: 2, total: 8 },
  ],
  onboarding: [
    {
      id: "profile",
      title: "Complete your profile",
      completed: false,
      url: null,
    },
    {
      id: "community",
      title: "Join the community",
      completed: true,
      url: "https://community.example.test",
    },
  ],
};
export const studentAssignment: Assignment = {
  id: "assignment-1",
  title: "Build a task API",
  description:
    "Implement authenticated CRUD endpoints and document your design choices.",
  kind: "project",
  dueAt: future(3),
  canSubmit: true,
  maxAttempts: 3,
  rubric: [
    { id: "functionality", label: "Functional correctness", maxPoints: 60 },
    { id: "quality", label: "Code quality", maxPoints: 40 },
  ],
  attempts: [],
};
export const studentMentorship: Mentorship = {
  entitlement: { total: 6, used: 2, reserved: 1 },
  bookings: [],
  attendance: [
    {
      classId: "class-1",
      title: "Python foundations",
      startsAt: future(-1),
      status: "present",
    },
    {
      classId: "class-2",
      title: "Django introduction",
      startsAt: future(-2),
      status: "absent",
    },
  ],
};
export const studentPayments: Payments = {
  currency: "INR",
  instalments: [
    {
      id: "instalment-1",
      label: "Second instalment",
      amountMinor: 2500000,
      dueAt: future(5),
      status: "due",
      pendingOrderId: null,
      receiptUrl: null,
    },
  ],
};

const classSession = (
  classDate: string,
  status: AttendanceStatus,
  subtopicIds: string[],
  startTime = "18:30",
  endTime = "20:30",
): ClassSession => ({
  id: `session-${classDate}`,
  batchId: "batch-pfs-01",
  classDate,
  startTime,
  endTime,
  attendance: [{ studentId: "student-1", status }],
  subtopicIds,
  notes: null,
  submittedBy: "trainer-1",
  submittedAt: `${classDate}T15:10:00.000Z`,
  locked: true,
});
/**
 * Tuesday and Thursday classes from 6 to 29 October 2026, read on Tuesday 20 October: present, absent and
 * leave marks, one class never submitted (15 Oct), one Saturday extra class and today's class still due.
 */
export const studentClassProgress: ClassProgress = {
  studentId: "student-1",
  today: "2026-10-20",
  batch: {
    id: "batch-pfs-01",
    code: "PFS-WD-2026-03",
    courseId: "course-pfs",
    scheduleType: "weekdays",
    classDays: [2, 4],
    startTime: "18:30",
    endTime: "20:30",
    startDate: "2026-10-06",
    expectedEndDate: "2026-10-29",
    students: [
      {
        id: "student-1",
        registrationNo: "SS-2026-WD001",
        name: "Asha Rao",
        schedulePreference: "weekdays",
      },
    ],
  },
  course: {
    id: "course-pfs",
    code: "PFS",
    name: "Python Full-Stack",
    durationWeeks: 4,
    syllabusStatus: "approved",
    syllabus: [
      {
        id: "t1",
        title: "Python foundations",
        subtopics: [
          { id: "t1-s1", title: "Variables and types" },
          { id: "t1-s2", title: "Control flow" },
          { id: "t1-s3", title: "Functions" },
        ],
      },
      {
        id: "t2",
        title: "SQL & PostgreSQL",
        subtopics: [
          { id: "t2-s1", title: "Data modeling" },
          { id: "t2-s2", title: "PostgreSQL" },
          { id: "t2-s3", title: "Indexing" },
        ],
      },
    ],
  },
  sessions: [
    classSession("2026-10-06", "present", ["t1-s2", "t1-s1"]),
    classSession("2026-10-08", "absent", ["t1-s3"]),
    classSession("2026-10-13", "leave", ["t2-s1"]),
    classSession("2026-10-17", "present", ["t2-s2", "t1-s3"], "10:00", "12:00"),
  ],
  completionRequest: null,
};
