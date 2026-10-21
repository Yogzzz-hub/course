import { useEffect, useState } from 'react';
import { hashString } from '../assessment/engine';
import { analyticsAllowed, safeStorage } from './consent';
import { trackOncePerSession, visitorId, type EventName } from './events';

export interface Experiment { id: string; label: string; surface: string; goal: EventName; variants: { id: string; label: string }[] }

/** Experiments only run for visitors who allowed analytics; everyone else always sees the control. */
export const experiments: Experiment[] = [
  { id: 'home-cta-2026-10', label: 'Homepage skill-test heading', surface: 'Homepage CTA', goal: 'assessment_started', variants: [
    { id: 'control', label: 'Are You Ready for Your Next Developer Interview?' },
    { id: 'gap-first', label: 'Find the gaps before your next developer interview.' },
  ] },
  { id: 'results-cta-2026-10', label: 'Results page next step', surface: 'Assessment results', goal: 'roadmap_viewed', variants: [
    { id: 'control', label: 'Build My Career Roadmap' },
    { id: 'plan', label: 'Turn my results into a learning plan' },
  ] },
];
const STORE_KEY = 'aintrix-experiments';

/** Deterministic and stable: the same visitor id always lands in the same variant. */
export function variantFor(experiment: Experiment, visitor: string) {
  return experiment.variants[hashString(`${experiment.id}:${visitor}`) % experiment.variants.length].id;
}

export function assignVariant(experimentId: string): string {
  const experiment = experiments.find(item => item.id === experimentId);
  if (!experiment) return 'control';
  const visitor = analyticsAllowed() ? visitorId() : null;
  if (!visitor) return 'control';
  const store = safeStorage();
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(store?.getItem(STORE_KEY) || '{}'); } catch { saved = {}; }
  const variant = saved[experimentId] && experiment.variants.some(item => item.id === saved[experimentId]) ? saved[experimentId] : variantFor(experiment, visitor);
  if (saved[experimentId] !== variant) try { store?.setItem(STORE_KEY, JSON.stringify({ ...saved, [experimentId]: variant })); } catch { /* ignore */ }
  return variant;
}

/** Server render and first paint show the control; the assigned variant appears after hydration. */
export function useExperiment(experimentId: string) {
  const experiment = experiments.find(item => item.id === experimentId)!;
  const [variant, setVariant] = useState('control');
  useEffect(() => {
    const assigned = assignVariant(experimentId);
    setVariant(assigned);
    if (analyticsAllowed()) trackOncePerSession('experiment_exposure', experimentId, { experiment: experimentId, variant: assigned });
  }, [experimentId]);
  return { variant, label: experiment.variants.find(item => item.id === variant)?.label ?? experiment.variants[0].label };
}
