import { beforeEach, describe, expect, it } from 'vitest';
import { installBrowser, setLocation } from './helpers/browser';
installBrowser();
const { deleteAllLocalData, getConsent, setConsent } = await import('../src/analytics/consent');
const { classifySource, pruneEvents, readEvents, sanitiseProps, track } = await import('../src/analytics/events');
const { funnel, overview, skillIntelligence, experimentReport, marketing } = await import('../src/analytics/metrics');
const { assignVariant, experiments, variantFor } = await import('../src/analytics/experiments');
const { contextualPrompt } = await import('../src/analytics/personalize');

beforeEach(() => { deleteAllLocalData(); setLocation('https://aintrix.test/'); });

describe('consent', () => {
  it('records nothing until analytics are allowed', () => {
    expect(getConsent()).toBeNull();
    expect(track('page_view')).toBe(false);
    setConsent('essential');
    expect(track('page_view')).toBe(false);
    expect(readEvents()).toEqual([]);
    setConsent('analytics');
    expect(track('page_view')).toBe(true);
    expect(readEvents()).toHaveLength(1);
  });
  it('removes optional data when consent is withdrawn', () => {
    setConsent('analytics');
    track('page_view');
    setConsent('essential');
    expect(readEvents()).toEqual([]);
  });
  it('deletes everything on request', () => {
    setConsent('analytics');
    track('page_view');
    deleteAllLocalData();
    expect(getConsent()).toBeNull();
    expect(readEvents()).toEqual([]);
  });
});

describe('events', () => {
  beforeEach(() => setConsent('analytics'));
  it('refuses payment confirmation from the browser', () => {
    expect(track('payment_confirmed', { amount: 99999 })).toBe(false);
    expect(readEvents()).toEqual([]);
  });
  it('strips personal and free-text properties', () => {
    expect(sanitiseProps({ email: 'a@b.c', name: 'Asha', message: 'hi', source: 'x'.repeat(200), ok: true, n: 3, nested: { a: 1 }, 'bad key': 1 })).toEqual({ source: 'x'.repeat(80), ok: true, n: 3 });
  });
  it('classifies traffic from the referrer and UTM tags only', () => {
    expect(classifySource('https://aintrix.test/?utm_campaign=autumn', '')).toEqual({ channel: 'campaign', campaign: 'autumn' });
    expect(classifySource('https://aintrix.test/', 'https://www.google.com/')).toEqual({ channel: 'organic' });
    expect(classifySource('https://aintrix.test/', 'https://blog.example.org/post')).toEqual({ channel: 'referral' });
    expect(classifySource('https://aintrix.test/', '')).toEqual({ channel: 'direct' });
  });
  it('keeps events for at most 90 days', () => {
    const now = new Date('2026-10-21T00:00:00Z');
    const old = { id: '1', name: 'page_view' as const, at: '2026-07-01T00:00:00Z', path: '/', visitor: 'v', session: 's', channel: 'direct' as const, landing: '/', props: {} };
    const recent = { ...old, id: '2', at: '2026-10-01T00:00:00Z' };
    expect(pruneEvents([old, recent], now).map(event => event.id)).toEqual(['2']);
  });
});

describe('metrics', () => {
  const event = (visitor: string, name: Parameters<typeof track>[0], props: Record<string, string | number | boolean> = {}, session = visitor) => ({ id: Math.random().toString(), name, at: '2026-10-20T10:00:00Z', path: '/', visitor, session, channel: 'direct' as const, landing: '/', props });
  it('builds a sequential funnel with stage-to-stage rates', () => {
    const events = [event('a', 'page_view'), event('a', 'assessment_started'), event('a', 'assessment_completed'), event('b', 'page_view'), event('b', 'assessment_started'), event('c', 'page_view'), event('c', 'assessment_completed')];
    const stages = funnel(events);
    expect(stages.slice(0, 3).map(stage => stage.count)).toEqual([3, 2, 1]);
    expect(stages[1].fromPrevious).toBe(66.7);
    expect(stages[2].fromPrevious).toBe(50);
    expect(stages.at(-1)).toMatchObject({ id: 'payment_confirmed', count: null });
  });
  it('reports completion rate and per-skill outcomes from real events only', () => {
    const events = [event('a', 'assessment_started'), event('a', 'assessment_completed', { s_sql: 20, l_sql: 'developing', s_python: 80, l_python: 'strong' }), event('b', 'assessment_started')];
    expect(overview(events)).toMatchObject({ visitors: 2, assessmentStarts: 2, assessmentCompletions: 1, completionRate: 50 });
    const intel = skillIntelligence(events);
    expect(intel[0]).toMatchObject({ skill: 'sql', developing: 1, averagePercent: 20 });
    expect(intel.find(item => item.skill === 'web')).toMatchObject({ attempts: 0, averagePercent: null });
    expect(overview([])).toMatchObject({ visitors: 0, completionRate: null });
  });
  it('attributes sessions to channels and counts experiment conversions after exposure', () => {
    const events = [event('a', 'experiment_exposure', { experiment: 'home-cta-2026-10', variant: 'control' }), { ...event('a', 'assessment_started'), at: '2026-10-20T10:05:00Z' }, event('b', 'experiment_exposure', { experiment: 'home-cta-2026-10', variant: 'gap-first' })];
    expect(experimentReport(events, 'home-cta-2026-10', 'assessment_started')).toEqual([{ variant: 'control', visitors: 1, conversions: 1, rate: 100 }, { variant: 'gap-first', visitors: 1, conversions: 0, rate: 0 }]);
    expect(marketing(events).channels).toEqual([{ key: 'direct', sessions: 2, assessments: 1, counselling: 0 }]);
  });
});

describe('experiments and personalisation', () => {
  it('shows the control to visitors without analytics consent and a stable variant otherwise', () => {
    expect(assignVariant('home-cta-2026-10')).toBe('control');
    setConsent('analytics');
    const first = assignVariant('home-cta-2026-10');
    expect(assignVariant('home-cta-2026-10')).toBe(first);
    expect(variantFor(experiments[0], 'visitor-1')).toBe(variantFor(experiments[0], 'visitor-1'));
  });
  it('suggests one relevant next step without urgency', () => {
    expect(contextualPrompt({ path: '/programmes/python-full-stack', events: [], savedProgress: false, hasResult: false })?.title).toBe('Want to test your Python skills?');
    expect(contextualPrompt({ path: '/', events: [], savedProgress: true, hasResult: false })?.title).toBe('Continue your skill test');
    expect(contextualPrompt({ path: '/about', events: [], savedProgress: false, hasResult: true })?.title).toBe('Explore your personalized roadmap');
    expect(contextualPrompt({ path: '/about', events: [], savedProgress: false, hasResult: false })).toBeNull();
    for (const path of ['/', '/programmes/python-full-stack', '/roadmap']) {
      const prompt = contextualPrompt({ path, events: [], savedProgress: true, hasResult: true });
      expect(JSON.stringify(prompt ?? {})).not.toMatch(/hurry|only \d+ (seats|places|spots) left|today only|expires|limited time|last chance/i);
    }
  });
});
