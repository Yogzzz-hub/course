import type { AssessmentResult, SkillLevel } from '../assessment/results';
import { detailedProgrammes } from '../data/programmeCatalog';
import { FRAMEWORK_VERSION, nodeById, nodes, roleById, type RoleId, type SkillNode } from './frameworks';

export const experienceLevels = [
  { id: 'none', label: 'No programming experience yet' },
  { id: 'learning', label: 'Learning, under a year' },
  { id: 'some', label: '1–3 years of coding' },
  { id: 'experienced', label: 'More than 3 years' },
] as const;
export const educationLevels = [
  { id: 'school', label: 'Secondary school' },
  { id: 'undergraduate', label: 'Studying for a degree or diploma' },
  { id: 'graduate', label: 'Graduated' },
  { id: 'other', label: 'Other or prefer not to say' },
] as const;
export const interestAreas = [
  { id: 'interfaces', label: 'Building interfaces', boosts: ['html-css', 'javascript', 'react'] },
  { id: 'data', label: 'Working with data', boosts: ['sql', 'python'] },
  { id: 'apis', label: 'APIs and backend systems', boosts: ['http-apis', 'django', 'security'] },
  { id: 'infrastructure', label: 'Shipping and infrastructure', boosts: ['deployment', 'git'] },
  { id: 'interviews', label: 'Interview preparation', boosts: ['problem-solving', 'debugging'] },
] as const;

export interface RoadmapInput {
  role: RoleId;
  education: typeof educationLevels[number]['id'];
  experience: typeof experienceLevels[number]['id'];
  /** Skills the visitor says they have. Shown as self-reported, never as verified. */
  claimed: string[];
  interests: string[];
  /** Per-skill levels from the latest skill test, if any. */
  assessment?: Pick<AssessmentResult, 'skills' | 'completedAt'> | null;
  jobDescription?: string;
}
export type NodeStatus = 'demonstrated' | 'claimed' | 'needs-practice' | 'not-assessed';
export interface RoadmapStep { node: SkillNode; status: NodeStatus; reasons: string[]; importance: 'core' | 'supporting' | 'job description'; programmeName: string; programmeSlug: string }
export interface Roadmap {
  frameworkVersion: string;
  role: { id: RoleId; label: string; summary: string };
  demonstrated: SkillNode[];
  claimed: SkillNode[];
  missing: SkillNode[];
  priorities: SkillNode[];
  steps: RoadmapStep[];
  projects: { node: SkillNode; project: string }[];
  modules: { programmeId: string; programmeName: string; slug: string; modules: string[] }[];
  jobDescriptionMatches: string[];
  notes: string[];
}

const MAX_JOB_DESCRIPTION = 8000;
/**
 * Pasted job descriptions are untrusted text. They are only lower-cased and matched against fixed
 * keyword patterns; nothing in them is executed, followed or sent anywhere.
 */
export function matchJobDescription(text: string | undefined): string[] {
  if (!text) return [];
  const clean = text.slice(0, MAX_JOB_DESCRIPTION).replace(/\p{Cc}+/gu, ' ').toLowerCase();
  return nodes.filter(node => node.keywords.test(clean)).map(node => node.id);
}

const levelOf = (assessment: RoadmapInput['assessment'], node: SkillNode): SkillLevel | undefined => node.evidence ? assessment?.skills.find(item => item.skill === node.evidence)?.level : undefined;

/** Deterministic: the same input always produces the same roadmap. No external model is involved. */
export function buildRoadmap(input: RoadmapInput): Roadmap {
  const role = roleById(input.role);
  if (!role) throw new Error('Unknown role');
  const jd = matchJobDescription(input.jobDescription);
  const wanted = [...new Set([...role.core, ...role.supporting, ...jd])];
  const boosts = new Set<string>(input.interests.flatMap(id => interestAreas.find(area => area.id === id)?.boosts ?? []));
  // Pull in prerequisites so the sequence never skips a foundation.
  const included = new Set<string>();
  const include = (id: string) => { if (included.has(id)) return; const node = nodeById(id); if (!node) return; node.requires.forEach(include); included.add(id); };
  wanted.forEach(include);

  const status = (node: SkillNode): NodeStatus => {
    const level = levelOf(input.assessment, node);
    if (level === 'strong' || level === 'working') return 'demonstrated';
    if (level === 'developing') return 'needs-practice';
    return input.claimed.includes(node.id) ? 'claimed' : 'not-assessed';
  };
  const priority = (node: SkillNode) => {
    let score = role.core.includes(node.id) ? 3 : role.supporting.includes(node.id) ? 1 : 0;
    if (jd.includes(node.id)) score += 2;
    if (boosts.has(node.id)) score += 1;
    const current = status(node);
    if (current === 'needs-practice') score += 3;
    if (current === 'claimed') score -= 1;
    if (current === 'demonstrated') score -= 4;
    return score;
  };
  // Topological order: a node is ready once its prerequisites are placed; ties go to the highest priority, then the framework order.
  const pending = nodes.filter(node => included.has(node.id));
  const ordered: SkillNode[] = [];
  while (pending.length) {
    const ready = pending.filter(node => node.requires.every(id => !included.has(id) || ordered.some(done => done.id === id)));
    ready.sort((a, b) => priority(b) - priority(a) || nodes.indexOf(a) - nodes.indexOf(b));
    const next = ready[0] ?? pending[0];
    ordered.push(next);
    pending.splice(pending.indexOf(next), 1);
  }

  const steps: RoadmapStep[] = ordered.map(node => {
    const current = status(node);
    const reasons: string[] = [];
    const level = levelOf(input.assessment, node);
    if (level) reasons.push(`Skill test: ${level === 'strong' ? 'strong' : level === 'working' ? 'solid' : level === 'developing' ? 'needs practice' : 'not enough questions to judge'}`);
    else if (node.evidence && !input.assessment) reasons.push('Not measured yet: take the skill test to check it');
    if (current === 'claimed') reasons.push('You said you know this; not yet verified');
    if (jd.includes(node.id)) reasons.push('Mentioned in the job description');
    if (boosts.has(node.id)) reasons.push('Matches your interests');
    const programme = detailedProgrammes.find(item => item.id === node.module.programmeId)!;
    return { node, status: current, reasons, importance: role.core.includes(node.id) ? 'core' : role.supporting.includes(node.id) ? 'supporting' : 'job description', programmeName: programme.name, programmeSlug: programme.slug };
  });
  const toLearn = steps.filter(step => step.status !== 'demonstrated');
  const priorities = [...toLearn].sort((a, b) => priority(b.node) - priority(a.node)).slice(0, 3).map(step => step.node);
  const modules = new Map<string, Roadmap['modules'][number]>();
  for (const step of toLearn) {
    const entry = modules.get(step.node.module.programmeId) ?? { programmeId: step.node.module.programmeId, programmeName: step.programmeName, slug: step.programmeSlug, modules: [] };
    if (!entry.modules.includes(step.node.module.module)) entry.modules.push(step.node.module.module);
    modules.set(step.node.module.programmeId, entry);
  }
  const notes: string[] = [];
  if (!input.assessment) notes.push('No skill test result was used, so nothing on this roadmap is marked as demonstrated. Take the test to personalise it further.');
  if (input.experience === 'none') notes.push('Starting from scratch is normal: the first steps are ordered so every later skill has its foundation.');
  if (jd.length) notes.push(`The job description you pasted matched ${jd.length} skill${jd.length === 1 ? '' : 's'} in this framework. It was only scanned for keywords.`);

  return {
    frameworkVersion: FRAMEWORK_VERSION,
    role: { id: role.id, label: role.label, summary: role.summary },
    demonstrated: steps.filter(step => step.status === 'demonstrated').map(step => step.node),
    claimed: steps.filter(step => step.status === 'claimed').map(step => step.node),
    missing: toLearn.map(step => step.node),
    priorities,
    steps,
    projects: toLearn.slice(0, 4).map(step => ({ node: step.node, project: step.node.project })),
    modules: [...modules.values()],
    jobDescriptionMatches: jd.map(id => nodeById(id)!.label),
    notes,
  };
}
