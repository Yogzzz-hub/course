import { skills, skillInfo, type Skill } from '../assessment/skills';
import type { Channel, EventName, StoredEvent } from './events';

/** Pure reporting over stored events. Every number is a count of real events; nothing is estimated. */
const distinct = (events: StoredEvent[], key: (event: StoredEvent) => string = event => event.visitor) => new Set(events.map(key)).size;
const of = (events: StoredEvent[], name: EventName) => events.filter(event => event.name === name);
export const rate = (part: number, whole: number) => whole ? Math.round((part / whole) * 1000) / 10 : null;

export function overview(events: StoredEvent[]) {
  const starts = of(events, 'assessment_started').length;
  const completions = of(events, 'assessment_completed').length;
  return {
    visitors: distinct(events),
    sessions: distinct(events, event => event.session),
    pageViews: of(events, 'page_view').length,
    assessmentStarts: starts,
    assessmentCompletions: completions,
    completionRate: rate(completions, starts),
    courseViews: of(events, 'course_viewed').length,
    roadmapViews: of(events, 'roadmap_viewed').length,
    packageComparisons: of(events, 'package_compared').length,
    counsellingRequests: of(events, 'counselling_requested').length,
    enrollmentStarts: of(events, 'enrollment_started').length,
    challengeStarts: of(events, 'coding_challenge_started').length,
    submissions: of(events, 'code_submitted').length,
  };
}

export const funnelStages: { id: EventName | 'visit'; label: string }[] = [
  { id: 'visit', label: 'Website visitor' },
  { id: 'assessment_started', label: 'Assessment started' },
  { id: 'assessment_completed', label: 'Assessment completed' },
  { id: 'roadmap_viewed', label: 'Roadmap viewed' },
  { id: 'course_viewed', label: 'Course explored' },
  { id: 'counselling_requested', label: 'Counselling requested' },
  { id: 'enrollment_started', label: 'Enrollment initiated' },
  { id: 'payment_confirmed', label: 'Payment confirmed' },
];

/**
 * A visitor counts at a stage only if they also reached every earlier stage.
 * Payment confirmation is never recorded in the browser, so that stage stays null until a server reports it.
 */
export function funnel(events: StoredEvent[]) {
  const byVisitor = new Map<string, Set<string>>();
  for (const event of events) {
    const set = byVisitor.get(event.visitor) ?? new Set<string>();
    set.add('visit'); set.add(event.name);
    byVisitor.set(event.visitor, set);
  }
  let previous: number | null = null;
  return funnelStages.map((stage, index) => {
    if (stage.id === 'payment_confirmed') return { ...stage, count: null as number | null, fromPrevious: null as number | null };
    const required = funnelStages.slice(0, index + 1).map(item => item.id);
    const count = [...byVisitor.values()].filter(set => required.every(id => set.has(id))).length;
    const fromPrevious = previous === null ? null : rate(count, previous);
    previous = count;
    return { ...stage, count, fromPrevious };
  });
}

/** Per-skill outcomes from completed assessments (props s_<skill> = percent, l_<skill> = level). */
export function skillIntelligence(events: StoredEvent[]) {
  const completed = of(events, 'assessment_completed');
  return skills.map(skill => {
    const scored = completed.filter(event => typeof event.props[`s_${skill}`] === 'number');
    const percents = scored.map(event => event.props[`s_${skill}`] as number);
    const developing = scored.filter(event => event.props[`l_${skill}`] === 'developing').length;
    return { skill, label: skillInfo[skill].label, attempts: scored.length, averagePercent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null, developing };
  }).sort((a, b) => b.developing - a.developing || (a.averagePercent ?? 101) - (b.averagePercent ?? 101));
}
export function mostMissed(events: StoredEvent[]): { skill: Skill; count: number }[] {
  return skillIntelligence(events).filter(item => item.developing > 0).map(item => ({ skill: item.skill, count: item.developing }));
}

export function marketing(events: StoredEvent[]) {
  const sessions = new Map<string, { channel: Channel; landing: string; campaign?: string; names: Set<EventName> }>();
  for (const event of events) {
    const entry = sessions.get(event.session) ?? { channel: event.channel, landing: event.landing, campaign: event.campaign, names: new Set<EventName>() };
    entry.names.add(event.name);
    sessions.set(event.session, entry);
  }
  const group = (key: (entry: { channel: Channel; landing: string; campaign?: string }) => string | undefined) => {
    const rows = new Map<string, { key: string; sessions: number; assessments: number; counselling: number }>();
    for (const entry of sessions.values()) {
      const name = key(entry);
      if (!name) continue;
      const row = rows.get(name) ?? { key: name, sessions: 0, assessments: 0, counselling: 0 };
      row.sessions++;
      if (entry.names.has('assessment_started')) row.assessments++;
      if (entry.names.has('counselling_requested')) row.counselling++;
      rows.set(name, row);
    }
    return [...rows.values()].sort((a, b) => b.sessions - a.sessions);
  };
  return { channels: group(entry => entry.channel), landings: group(entry => entry.landing), campaigns: group(entry => entry.campaign) };
}

export function experimentReport(events: StoredEvent[], experimentId: string, goal: EventName) {
  const exposures = of(events, 'experiment_exposure').filter(event => event.props.experiment === experimentId);
  const variants = new Map<string, { variant: string; visitors: Set<string>; converted: Set<string> }>();
  for (const exposure of exposures) {
    const variant = String(exposure.props.variant);
    const row = variants.get(variant) ?? { variant, visitors: new Set<string>(), converted: new Set<string>() };
    row.visitors.add(exposure.visitor);
    if (events.some(event => event.name === goal && event.visitor === exposure.visitor && event.at >= exposure.at)) row.converted.add(exposure.visitor);
    variants.set(variant, row);
  }
  return [...variants.values()].map(row => ({ variant: row.variant, visitors: row.visitors.size, conversions: row.converted.size, rate: rate(row.converted.size, row.visitors.size) }));
}

export function challengeQuality(events: StoredEvent[]) {
  const rows = new Map<string, { challenge: string; starts: number; submissions: number; passed: number; judgeErrors: number; checks: number; checkCorrect: number; checkTotal: number }>();
  const row = (challenge: string) => rows.get(challenge) ?? { challenge, starts: 0, submissions: 0, passed: 0, judgeErrors: 0, checks: 0, checkCorrect: 0, checkTotal: 0 };
  for (const event of events) {
    const challenge = typeof event.props.challenge === 'string' ? event.props.challenge : null;
    if (!challenge) continue;
    const entry = row(challenge);
    if (event.name === 'coding_challenge_started') entry.starts++;
    if (event.name === 'code_submitted') { entry.submissions++; if (event.props.passed === true) entry.passed++; if (event.props.state === 'judge_error') entry.judgeErrors++; }
    if (event.name === 'understanding_completed') { entry.checks++; entry.checkCorrect += Number(event.props.correct) || 0; entry.checkTotal += Number(event.props.total) || 0; }
    rows.set(challenge, entry);
  }
  return [...rows.values()];
}
