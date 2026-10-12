import { StudentApiError } from '../components/student-panel/api';
import type { Assignment, Dashboard, LearningPlan, Mentorship, Payments, StudentApi, StudentSession } from '../components/student-panel/contracts';

/** Synthetic, read-only data. This module is imported only by the development preview. */
export function createStudentPreviewApi(mode: StudentSession['mode']): StudentApi {
  const instant = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  const identity = { userId: 'demo-learner', cacheKey: `local-demo-${mode}`, name: 'Demo Learner', email: 'demo@example.test', csrfToken: 'local-demo-no-authentication' };
  const session: StudentSession = mode === 'prospect'
    ? { ...identity, mode, leadStatus: 'plan_ready', pendingOrderId: null }
    : { ...identity, mode, enrolmentId: 'demo-enrolment', programme: 'Python Full-Stack', payment: { status: 'verified', orderId: 'demo-sample-order', verifiedAt: instant(-30) } };
  const plan: LearningPlan = {
    id: 'demo-plan', version: 'demo-v1', programme: 'Python Full-Stack', counsellor: 'Demo Counsellor', summary: 'Start with Python foundations, practise weekly, and build a portfolio with structured feedback.', currency: 'INR', recommendedPackageId: 'premium', expiresAt: instant(30), terms: { version: 'demo-terms', url: '/terms-and-conditions' },
    packages: [
      { id: 'standard', name: 'Standard', description: 'A structured path to your first portfolio.', inclusions: [{ label: 'Live classes', included: true }, { label: 'Personal mentorship', included: false }], feeLines: [{ label: 'Sample tuition', amountMinor: 5999900 }], totalMinor: 5999900, dueNowMinor: 2000000 },
      { id: 'premium', name: 'Premium', description: 'Guidance and feedback as you build.', inclusions: [{ label: 'Live classes', included: true }, { label: 'Personal mentorship', included: true }], feeLines: [{ label: 'Sample tuition', amountMinor: 7999900 }, { label: 'Sample learning plan discount', amountMinor: -500000 }], totalMinor: 7499900, dueNowMinor: 2500000 },
    ],
  };
  const nextClass = { id: 'demo-class', title: 'Building APIs with Django', startsAt: instant(1), endsAt: new Date(Date.parse(instant(1)) + 3600000).toISOString(), joinUrl: null };
  const dashboard: Dashboard = {
    nextClass, classes: [nextClass], deadlines: [{ id: 'demo-project', title: 'Build a task API', dueAt: instant(3) }],
    modules: [{ id: 'python', title: 'Python foundations', completed: 8, total: 10 }, { id: 'django', title: 'Django APIs', completed: 2, total: 8 }],
    onboarding: [{ id: 'profile', title: 'Complete your profile', completed: false, url: null }, { id: 'orientation', title: 'Programme orientation', completed: true, url: null }],
  };
  const assignment: Assignment = { id: 'demo-project', title: 'Build a task API', description: 'Implement authenticated CRUD endpoints and document your design choices.', kind: 'project', dueAt: instant(3), canSubmit: true, maxAttempts: 3, rubric: [{ id: 'functionality', label: 'Functional correctness', maxPoints: 60 }, { id: 'quality', label: 'Code quality', maxPoints: 40 }], attempts: [] };
  const mentorship: Mentorship = { entitlement: { total: 6, used: 2, reserved: 1 }, bookings: [], attendance: [{ classId: 'demo-python', title: 'Python foundations', startsAt: instant(-1), status: 'present' }, { classId: 'demo-django', title: 'Django introduction', startsAt: instant(-2), status: 'absent' }] };
  const payments: Payments = { currency: 'INR', instalments: [{ id: 'demo-instalment', label: 'Sample second instalment', amountMinor: 2500000, dueAt: instant(5), status: 'due', pendingOrderId: null, receiptUrl: null }] };
  const readonly = async (): Promise<never> => { throw new StudentApiError(400, 'preview'); };
  // Mutation methods reject locally and cannot reach a payment gateway or backend.
  return {
    session: async () => structuredClone(session), learningPlan: async () => structuredClone(plan), dashboard: async () => structuredClone(dashboard), assignments: async () => [structuredClone(assignment)], mentorship: async () => structuredClone(mentorship), payments: async () => structuredClone(payments),
    slots: async () => [{ id: 'demo-slot', startsAt: instant(2), endsAt: new Date(Date.parse(instant(2)) + 1800000).toISOString(), mentor: 'Demo Mentor' }],
    sessions: async () => [{ id: 'demo-counselling', title: 'Sample counselling session', startsAt: instant(2), status: 'booked', joinUrl: null }],
    order: readonly, checkout: readonly, payInstalment: readonly, submit: readonly, bookMentorship: readonly, completeOnboarding: readonly, logout: readonly,
  };
}
