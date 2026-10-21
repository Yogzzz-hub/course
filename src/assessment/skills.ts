import { detailedProgrammes } from '../data/programmeCatalog';

export const skills = ['python', 'logic', 'sql', 'javascript', 'backend', 'debugging', 'apis', 'web'] as const;
export type Skill = typeof skills[number];
export type Difficulty = 1 | 2 | 3;

export const skillInfo: Record<Skill, { label: string; short: string; phrase: string; plural: boolean; programmes: string[] }> = {
  python: { label: 'Python fundamentals', short: 'Python', phrase: 'Python fundamentals', plural: true, programmes: ['programming-python-foundation', 'advanced-python'] },
  logic: { label: 'Logical reasoning', short: 'Logic', phrase: 'logical reasoning', plural: false, programmes: ['dsa-technical-interview', 'programming-python-foundation'] },
  sql: { label: 'SQL and databases', short: 'SQL', phrase: 'database queries', plural: true, programmes: ['sql-postgresql'] },
  javascript: { label: 'JavaScript', short: 'JavaScript', phrase: 'JavaScript skills', plural: true, programmes: ['html-css-javascript', 'react-development'] },
  backend: { label: 'Backend development', short: 'Backend', phrase: 'backend development', plural: false, programmes: ['django-backend-dev'] },
  debugging: { label: 'Debugging', short: 'Debugging', phrase: 'debugging skills', plural: true, programmes: ['software-engineering-testing', 'advanced-python'] },
  apis: { label: 'APIs', short: 'APIs', phrase: 'API development', plural: false, programmes: ['software-engineering-testing', 'full-stack-app-dev'] },
  web: { label: 'Web fundamentals', short: 'Web', phrase: 'web fundamentals', plural: true, programmes: ['html-css-javascript'] },
};

export const difficultyLabel: Record<Difficulty, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

export const tracks = [
  { id: 'beginner', label: 'Beginner', start: 1 as Difficulty, description: 'New to programming or returning after a break.' },
  { id: 'intermediate', label: 'Intermediate', start: 2 as Difficulty, description: 'You have written programs or completed a course.' },
  { id: 'advanced', label: 'Advanced', start: 3 as Difficulty, description: 'You build projects or work with code regularly.' },
] as const;
export type TrackId = typeof tracks[number]['id'];

export const focusAreas = [
  { id: 'core', label: 'Core developer mix', skills: ['python', 'logic', 'sql', 'javascript', 'debugging', 'web'] as Skill[], description: 'Python, logic, SQL, JavaScript, debugging and web basics.' },
  { id: 'backend', label: 'Backend developer', skills: ['python', 'sql', 'backend', 'apis', 'debugging', 'logic'] as Skill[], description: 'Python, SQL, backend design, APIs and debugging.' },
  { id: 'fullstack', label: 'Full-stack (optional)', skills: [...skills] as Skill[], description: 'Every area, front end to database.' },
] as const;
export type FocusId = typeof focusAreas[number]['id'];

/** A course module the bank links to. Validated against the live programme catalogue. */
export interface ModuleRef { programmeId: string; module: string }

export function programmeFor(id: string) {
  return detailedProgrammes.find(item => item.id === id);
}
export function moduleExists(ref: ModuleRef) {
  return !!programmeFor(ref.programmeId)?.modules.some(module => module.name === ref.module);
}
