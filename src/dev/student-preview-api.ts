import { StudentApiError } from '../components/student-panel/api';
import type {
  Assignment,
  CheckoutInput,
  Dashboard,
  LearningPlan,
  Mentorship,
  MentorshipSlot,
  MutationContext,
  PaymentOrder,
  Payments,
  StudentApi,
  StudentSession,
  StudentSessions,
  SubmissionInput,
} from '../components/student-panel/contracts';

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

/** Resilient fallback wrapper: attempts live API first, falls back gracefully on network errors or challenges */
export function createDevFallbackStudentApi(
  realApi: StudentApi,
  defaultMode: StudentSession['mode'] = 'enrolled'
): StudentApi {
  const preview = createStudentPreviewApi(defaultMode);
  let fallbackActive = false;

  return {
    async session(signal?: AbortSignal): Promise<StudentSession | null> {
      if (fallbackActive) return preview.session(signal);
      try {
        const live = await realApi.session(signal);
        if (live) return live;
        return await preview.session(signal);
      } catch (err) {
        console.warn('[StudentPanel] Live student session unavailable; using preview fallback.', err);
        fallbackActive = true;
        return preview.session(signal);
      }
    },
    async learningPlan(signal?: AbortSignal): Promise<LearningPlan | null> {
      if (fallbackActive) return preview.learningPlan(signal);
      try {
        return await realApi.learningPlan(signal);
      } catch {
        fallbackActive = true;
        return preview.learningPlan(signal);
      }
    },
    async dashboard(signal?: AbortSignal): Promise<Dashboard> {
      if (fallbackActive) return preview.dashboard(signal);
      try {
        return await realApi.dashboard(signal);
      } catch {
        fallbackActive = true;
        return preview.dashboard(signal);
      }
    },
    async assignments(signal?: AbortSignal): Promise<Assignment[]> {
      if (fallbackActive) return preview.assignments(signal);
      try {
        return await realApi.assignments(signal);
      } catch {
        fallbackActive = true;
        return preview.assignments(signal);
      }
    },
    async mentorship(signal?: AbortSignal): Promise<Mentorship> {
      if (fallbackActive) return preview.mentorship(signal);
      try {
        return await realApi.mentorship(signal);
      } catch {
        fallbackActive = true;
        return preview.mentorship(signal);
      }
    },
    async slots(timeZone: string, signal?: AbortSignal): Promise<MentorshipSlot[]> {
      if (fallbackActive) return preview.slots(timeZone, signal);
      try {
        return await realApi.slots(timeZone, signal);
      } catch {
        fallbackActive = true;
        return preview.slots(timeZone, signal);
      }
    },
    async payments(signal?: AbortSignal): Promise<Payments> {
      if (fallbackActive) return preview.payments(signal);
      try {
        return await realApi.payments(signal);
      } catch {
        fallbackActive = true;
        return preview.payments(signal);
      }
    },
    async sessions(signal?: AbortSignal): Promise<StudentSessions['sessions']> {
      if (fallbackActive) return preview.sessions(signal);
      try {
        return await realApi.sessions(signal);
      } catch {
        fallbackActive = true;
        return preview.sessions(signal);
      }
    },
    async order(id: string, signal?: AbortSignal): Promise<PaymentOrder> {
      if (fallbackActive) return preview.order(id, signal);
      try {
        return await realApi.order(id, signal);
      } catch {
        fallbackActive = true;
        return preview.order(id, signal);
      }
    },
    async checkout(input: CheckoutInput, context: MutationContext): Promise<PaymentOrder> {
      if (fallbackActive) return preview.checkout(input, context);
      try {
        return await realApi.checkout(input, context);
      } catch {
        fallbackActive = true;
        return preview.checkout(input, context);
      }
    },
    async payInstalment(id: string, context: MutationContext): Promise<PaymentOrder> {
      if (fallbackActive) return preview.payInstalment(id, context);
      try {
        return await realApi.payInstalment(id, context);
      } catch {
        fallbackActive = true;
        return preview.payInstalment(id, context);
      }
    },
    async submit(input: SubmissionInput, context: MutationContext): Promise<Assignment> {
      if (fallbackActive) return preview.submit(input, context);
      try {
        return await realApi.submit(input, context);
      } catch {
        fallbackActive = true;
        return preview.submit(input, context);
      }
    },
    async bookMentorship(slotId: string, context: MutationContext): Promise<Mentorship> {
      if (fallbackActive) return preview.bookMentorship(slotId, context);
      try {
        return await realApi.bookMentorship(slotId, context);
      } catch {
        fallbackActive = true;
        return preview.bookMentorship(slotId, context);
      }
    },
    async completeOnboarding(id: string, context: MutationContext): Promise<Dashboard> {
      if (fallbackActive) return preview.completeOnboarding(id, context);
      try {
        return await realApi.completeOnboarding(id, context);
      } catch {
        fallbackActive = true;
        return preview.completeOnboarding(id, context);
      }
    },
    async logout(context: MutationContext): Promise<void> {
      try {
        localStorage.removeItem('crm_session');
      } catch {}
      if (fallbackActive) return preview.logout(context);
      try {
        return await realApi.logout(context);
      } catch {
        fallbackActive = true;
        return preview.logout(context);
      }
    },
  };
}
