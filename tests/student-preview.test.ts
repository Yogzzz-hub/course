import { describe, expect, it, vi } from 'vitest';
import { createStudentPreviewApi } from '../src/dev/student-preview-api';
import { assignmentSchema, dashboardSchema, learningPlanSchema, mentorshipSchema, paymentsSchema, sessionSchema, sessionsSchema, slotsSchema } from '../src/components/student-panel/contracts';
import { StudentApiError, friendlyError } from '../src/components/student-panel/api';

describe('local student preview', () => {
  for (const mode of ['prospect', 'enrolled'] as const) {
    it(`${mode} sample data satisfies the real panel contracts`, async () => {
      const api = createStudentPreviewApi(mode);
      expect(sessionSchema.parse(await api.session()).mode).toBe(mode);
      learningPlanSchema.parse(await api.learningPlan());
      dashboardSchema.parse(await api.dashboard());
      (await api.assignments()).forEach(item => assignmentSchema.parse(item));
      mentorshipSchema.parse(await api.mentorship());
      paymentsSchema.parse(await api.payments());
      sessionsSchema.parse({ sessions: await api.sessions() });
      slotsSchema.parse({ slots: await api.slots('Asia/Kolkata') });
    });
  }
  it('every write and payment gateway access is rejected without network traffic', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    try {
      const api = createStudentPreviewApi('enrolled');
      const context = { csrfToken: 'demo', requestId: 'demo' };
      const writes = [api.order('demo'), api.payInstalment('demo', context), api.submit({ assignmentId: 'demo', repositoryUrl: '', liveUrl: '', file: null }, context), api.bookMentorship('demo', context), api.completeOnboarding('demo', context), api.logout(context), api.checkout({ planId: 'demo', planVersion: 'demo', packageId: 'demo', termsVersion: 'demo', consent: true, expectedAmountMinor: 1, currency: 'INR', billing: { name: 'Demo Learner', email: 'demo@example.test', address: 'Sample address', city: 'Sample city', postalCode: '123456', country: 'IN' } }, context)];
      const results = await Promise.allSettled(writes);
      for (const result of results) {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason).toBeInstanceOf(StudentApiError);
          expect(friendlyError(result.reason)).toContain('read-only local demo');
        }
      }
      expect(fetcher).not.toHaveBeenCalled();
    } finally { fetcher.mockRestore(); }
  });
});
