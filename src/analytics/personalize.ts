import type { StoredEvent } from './events';

export interface ContextPrompt { id: string; title: string; body: string; cta: { label: string; to: string } }
export interface PromptContext { path: string; events: StoredEvent[]; savedProgress: boolean; hasResult: boolean }

/**
 * Picks at most one helpful next step. Page-based rules need no tracking; history-based rules only
 * see events the visitor allowed. No urgency, no scarcity, no inference about the person.
 */
export function contextualPrompt({ path, events, savedProgress, hasResult }: PromptContext): ContextPrompt | null {
  const did = (name: StoredEvent['name']) => events.some(event => event.name === name);
  if (savedProgress && path !== '/skill-test') return { id: 'resume-test', title: 'Continue your skill test', body: 'Your answers so far are saved on this device. Pick up where you left off.', cta: { label: 'Resume the test', to: '/skill-test' } };
  if (hasResult && !did('roadmap_viewed') && path !== '/roadmap') return { id: 'open-roadmap', title: 'Explore your personalized roadmap', body: 'Turn your skill test results into an ordered learning plan for the role you want.', cta: { label: 'Build my roadmap', to: '/roadmap' } };
  if (did('roadmap_viewed') && path === '/') return { id: 'continue-roadmap', title: 'Continue your learning roadmap', body: 'Your roadmap is ready to revisit, along with the modules it recommends.', cta: { label: 'Open my roadmap', to: '/roadmap' } };
  const pythonPage = /^\/programmes\/(python-full-stack|programming-python-foundation|advanced-python)/.test(path) || /python/.test(path);
  if (pythonPage && !hasResult && path !== '/skill-test') return { id: 'python-test', title: 'Want to test your Python skills?', body: 'Ten questions, about eight minutes, with an explanation for every answer. No account needed.', cta: { label: 'Take the free skill test', to: '/skill-test' } };
  if (did('package_compared') && path.startsWith('/programmes')) return { id: 'packages', title: 'See what\'s included in each learning plan', body: 'Compare Standard, Premium and Elite side by side, including the savings matrix.', cta: { label: 'Compare packages', to: '/programmes/python-full-stack#pricing' } };
  return null;
}
