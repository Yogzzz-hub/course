import { randomInt } from 'node:crypto';
import { skills, type Question } from './bank.ts';
import { z } from 'zod';
import { skillAreas } from '../src/data/skillAreas.ts';

export interface Answer { question: Question; selected: number; correct: boolean }
export const GRADER_VERSION = 'assessment-1.0.0';
export function assessmentLength(bank:Question[]){const areas=new Set(bank.map(q=>q.skill)).size;return areas===1?Math.min(3,bank.length):Math.min(bank.length,Math.max(10,areas));}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function nextQuestion(bank: Question[], answers: Answer[], track: number): Question | undefined {
  const used = new Set(answers.map(a => a.question.id));
  const last = answers.at(-1);
  const target = last ? Math.max(1, Math.min(3, last.question.difficulty + (last.correct ? 1 : -1))) : track;
  const counts = Object.fromEntries(bank.map(q => [q.skill, answers.filter(a => a.question.skill === q.skill).length]));
  return shuffle(bank.filter(q => !used.has(q.id))).sort((a,b) => counts[a.skill] - counts[b.skill] || Math.abs(a.difficulty-target) - Math.abs(b.difficulty-target))[0];
}
export function publicQuestion(question: Question, order: number[]) {
  return { id: question.id, version: question.version, skill: question.skill, difficulty: question.difficulty,
    kind: question.kind, prompt: question.prompt, options: order.map(index => question.options[index]) };
}
export function grade(answers: Answer[]) {
  const total = answers.length;
  const correct = answers.filter(a => a.selected === a.question.answer).length;
  const skills = [...new Set(answers.map(a => a.question.skill))].map(skill => {
    const group = answers.filter(a => a.question.skill === skill);
    const passed = group.filter(a => a.selected === a.question.answer).length;
    return { skill, correct: passed, total: group.length, percent: Math.round(passed / group.length * 100), module: group[0].question.module };
  });
  return { graderVersion: GRADER_VERSION, correct, total, percent: total ? Math.round(correct / total * 100) : 0, skills,
    explanations: answers.map(a => ({ prompt: a.question.prompt, selected: a.question.options[a.selected],
      answer: a.question.options[a.question.answer], correct: a.selected === a.question.answer,
      explanation: a.question.explanation, objective: a.question.objective, version: a.question.version, id: a.question.id })),
    limitation: 'This is a short, adaptive learning check, not a hiring certification or percentile ranking. Skills with few questions have limited evidence. Scores from different question sets are not directly comparable.' };
}
export const roleSkills = {
  'Python Developer': ['python','logic','debugging','sql'],
  'Backend Developer': ['python','sql','backend','apis','debugging'],
  'Full-Stack Developer': ['web','javascript','react','python','sql','backend','apis','fullstack','devops'],
  'Frontend Developer': ['web','javascript','react','apis','debugging'],
  'Software Engineer': ['logic','python','debugging','backend','sql','devops','ai'],
} as const;
export type CareerRole = keyof typeof roleSkills;
export const profileSchema=z.object({
  education:z.enum(['not-specified','school','undergraduate','graduate','other']).default('not-specified'),
  experience:z.enum(['beginner','some-experience','professional']).default('beginner'),
  existingSkills:z.array(z.enum(skills)).max(12).default([]),
  interests:z.array(z.enum(['web','data','automation','backend','frontend'])).max(5).default([]),
  jobDescription:z.string().max(6000).default(''),
}).strict();
export function roadmap(result: ReturnType<typeof grade>, role: CareerRole, profile=profileSchema.parse({})) {
  const projects: Record<string,string> = { python:'Build a command-line expense tracker.', logic:'Implement and test a searchable contact list.', sql:'Design a library database and write aggregate queries.', javascript:'Build a filterable task list.', backend:'Build an authenticated task API.', debugging:'Add regression tests to an existing project.', apis:'Build a client that handles API errors and retries.', web:'Build an accessible responsive registration form.' };
  const keywords:Record<string,string[]>={python:['python'],sql:['sql','postgresql','database'],javascript:['javascript','typescript','react'],backend:['django','backend','back-end'],apis:['api','rest','http'],web:['html','css','accessibility'],debugging:['testing','debugging'],logic:['algorithms','data structures']};
  const jobSkills=Object.entries(keywords).filter(([,words])=>words.some(word=>new RegExp(`\\b${word}\\b`,'i').test(profile.jobDescription))).map(([skill])=>skill);
  if(profile.interests.includes('data')){projects.python='Summarize a CSV dataset and test missing values.';projects.sql='Design a dataset schema and explain aggregate reports.';}
  if(profile.interests.includes('automation'))projects.python='Automate a repeatable file-reporting task with a dry-run option and tests.';
  if(profile.interests.includes('frontend'))projects.apis='Build an accessible search interface with loading, empty and API-error states.';
  const guidance=profile.experience==='beginner'?'Start with one small example, then add boundary tests.':profile.experience==='professional'?'Document tradeoffs, add regression tests and review failure handling.':'Build the project independently, then explain and test your design.';
  return { version: 'role-framework-2', role, profile:{education:profile.education,experience:profile.experience,existingSkills:profile.existingSkills,interests:profile.interests},
    jobSkills, jobNotice:'Job-description matches use keywords only. Pasted instructions are never executed, and self-reported skills do not change assessment scores.',
    basis: 'Academy curriculum learning sequence; not an employer-validated hiring standard.',
    steps: roleSkills[role].map(skill => {
      const evidence = result.skills.find(s => s.skill === skill);
      return { skill, evidence: evidence ? `${evidence.correct}/${evidence.total} observed answers correct` : 'Not assessed',
        priority: !evidence || evidence.percent < 70 ? 'Practice next' : 'Extend with a project',
        selfReported:profile.existingSkills.includes(skill),requestedInJob:jobSkills.includes(skill),
        project: `${projects[skill]??skillAreas.find(area=>area.id===skill)?.project} ${guidance}`, module: evidence?.module ?? `/programmes/${skillAreas.find(area=>area.id===skill)!.module}` };
    }).sort((a,b) => Number(b.priority === 'Practice next') - Number(a.priority === 'Practice next') || Number(b.requestedInJob)-Number(a.requestedInJob)) };
}
