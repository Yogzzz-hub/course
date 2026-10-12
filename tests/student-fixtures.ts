import type {
  Assignment,
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
