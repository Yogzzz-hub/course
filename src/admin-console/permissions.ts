/**
 * Role-based permissions for the management console and the grading service.
 * The browser uses this matrix to decide what to show; a server must enforce the same checks on
 * every request, because anything in the browser can be changed by its user.
 */
export const roles = ['owner', 'administrator', 'counselor', 'instructor', 'analyst'] as const;
export type Role = typeof roles[number];

export const actions = [
  'overview.view', 'funnel.view', 'skills.view', 'marketing.view', 'revenue.view',
  'leads.view', 'leads.manage', 'leads.export',
  'quality.view', 'grades.review', 'grades.correct', 'grades.rejudge',
  'questions.view', 'questions.edit',
  'experiments.view', 'experiments.manage', 'audit.view',
] as const;
export type Action = typeof actions[number];

export const roleLabels: Record<Role, string> = { owner: 'Owner', administrator: 'Administrator', counselor: 'Admissions / Counselor', instructor: 'Instructor', analyst: 'Analyst' };

const matrix: Record<Role, readonly Action[]> = {
  owner: actions,
  administrator: actions,
  counselor: ['overview.view', 'funnel.view', 'skills.view', 'leads.view', 'leads.manage'],
  instructor: ['overview.view', 'skills.view', 'quality.view', 'grades.review', 'grades.correct', 'grades.rejudge', 'questions.view', 'questions.edit'],
  analyst: ['overview.view', 'funnel.view', 'skills.view', 'marketing.view', 'revenue.view', 'quality.view', 'experiments.view'],
};

export const can = (role: Role | null | undefined, action: Action) => !!role && matrix[role].includes(action);

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(action: Action) { super(`Not allowed: ${action}`); this.name = 'ForbiddenError'; }
}
export class UnauthenticatedError extends Error {
  readonly status = 401;
  constructor() { super('Sign in to continue.'); this.name = 'UnauthenticatedError'; }
}
export interface Actor { id: string; role: Role | null }
/** Throws unless the actor is signed in and the role allows the action. */
export function requirePermission(actor: Actor | null | undefined, action: Action): asserts actor is Actor & { role: Role } {
  if (!actor?.id) throw new UnauthenticatedError();
  if (!can(actor.role, action)) throw new ForbiddenError(action);
}
