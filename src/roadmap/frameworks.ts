import type { Skill } from '../assessment/skills';

/**
 * Role skill frameworks, version 2026.10.1. Curated by the academy from the programme curriculum
 * and the skills commonly listed for each role; they describe what to learn, not hiring odds.
 * Review them at least yearly and bump the version when anything changes.
 */
export const FRAMEWORK_VERSION = '2026.10.1';

export interface SkillNode {
  id: string;
  label: string;
  description: string;
  /** Nodes that should come first. */
  requires: string[];
  /** Skill test area that can demonstrate this node, if any. */
  evidence?: Skill;
  module: { programmeId: string; module: string };
  project: string;
  /** Lower-case patterns that indicate this skill in a job description. */
  keywords: RegExp;
}

export const nodes: SkillNode[] = [
  { id: 'python', label: 'Python fundamentals', description: 'Data types, control flow, functions, collections and exceptions.', requires: [], evidence: 'python', module: { programmeId: 'programming-python-foundation', module: 'Core Data Structures' }, project: 'A command-line tool that reads a CSV file and prints a summary report.', keywords: /\bpython\b/ },
  { id: 'problem-solving', label: 'Problem solving and complexity', description: 'Break problems down, trace code and reason about time complexity.', requires: ['python'], evidence: 'logic', module: { programmeId: 'dsa-technical-interview', module: 'Complexity & Linear Structures' }, project: 'Solve and explain ten classic array and string problems, with tests.', keywords: /\b(algorithms?|data structures?|dsa|problem[- ]solving|big[- ]o|leetcode)\b/ },
  { id: 'debugging', label: 'Debugging and testing', description: 'Read tracebacks, isolate defects and write automated tests with pytest.', requires: ['python'], evidence: 'debugging', module: { programmeId: 'software-engineering-testing', module: 'Automated Unit Testing with Pytest' }, project: 'Add a pytest suite with edge cases to an existing small project and fix what it finds.', keywords: /\b(debug(ging)?|pytest|unit tests?|testing|tdd|test[- ]driven)\b/ },
  { id: 'git', label: 'Git and team workflow', description: 'Branches, pull requests, code review and clean commit history.', requires: [], module: { programmeId: 'software-engineering-testing', module: 'Version Control & Team Workflows' }, project: 'Contribute a reviewed pull request to a shared repository.', keywords: /\b(git|github|gitlab|version control|pull requests?)\b/ },
  { id: 'sql', label: 'SQL and relational data', description: 'Schema design, joins, aggregation, indexes and transactions.', requires: [], evidence: 'sql', module: { programmeId: 'sql-postgresql', module: 'Advanced Joins & Analytical SQL' }, project: 'Design a normalised database for a course catalogue and write reporting queries.', keywords: /\b(sql|postgres(ql)?|mysql|sqlite|relational databases?)\b/ },
  { id: 'html-css', label: 'HTML and CSS', description: 'Semantic, accessible markup and responsive layouts.', requires: [], evidence: 'web', module: { programmeId: 'html-css-javascript', module: 'Modern CSS & Responsive Design' }, project: 'A responsive, accessible portfolio page that passes an automated accessibility check.', keywords: /\b(html5?|css3?|responsive|accessibility|a11y|tailwind|sass)\b/ },
  { id: 'javascript', label: 'JavaScript', description: 'Language behaviour, the DOM, asynchronous code and fetch.', requires: ['html-css'], evidence: 'javascript', module: { programmeId: 'html-css-javascript', module: 'JavaScript Language Foundations' }, project: 'An interactive page that loads data from a public API and handles errors.', keywords: /\b(javascript|js|es6|typescript|dom)\b/ },
  { id: 'react', label: 'React', description: 'Components, hooks, state and routing.', requires: ['javascript'], module: { programmeId: 'react-development', module: 'Deep Dive into Hooks' }, project: 'A multi-page React app with routing, forms and loading and error states.', keywords: /\b(react(\.js)?|next\.?js|redux|hooks)\b/ },
  { id: 'http-apis', label: 'HTTP and REST APIs', description: 'Methods, status codes, pagination, idempotency and API contracts.', requires: ['python'], evidence: 'apis', module: { programmeId: 'software-engineering-testing', module: 'RESTful API Design & Specification' }, project: 'Design and document a small REST API with an OpenAPI specification.', keywords: /\b(restful|rest apis?|apis?|http|json|graphql|openapi|swagger)\b/ },
  { id: 'django', label: 'Django and the ORM', description: 'Models, queries without N+1 problems, views and Django REST Framework.', requires: ['python', 'sql', 'http-apis'], evidence: 'backend', module: { programmeId: 'django-backend-dev', module: 'Django REST Framework (DRF)' }, project: 'A Django REST API with pagination, filtering and an admin panel.', keywords: /\b(django|drf|flask|fastapi|orm)\b/ },
  { id: 'security', label: 'Authentication and security', description: 'Password hashing, sessions and tokens, secrets and common web vulnerabilities.', requires: ['http-apis'], module: { programmeId: 'django-backend-dev', module: 'Authentication, Security & Testing' }, project: 'Add sign-up, sign-in and permission checks to your API, with tests for each rule.', keywords: /\b(auth(entication|orization)?|oauth|jwt|security|owasp|xss|csrf)\b/ },
  { id: 'full-stack', label: 'Connecting front end and back end', description: 'State management, API integration, CORS and end-to-end features.', requires: ['react', 'django'], module: { programmeId: 'full-stack-app-dev', module: 'State Management & Async Data' }, project: 'A full-stack app where a React front end talks to your Django API.', keywords: /\b(full[- ]stack|end[- ]to[- ]end)\b/ },
  { id: 'deployment', label: 'Deployment and DevOps', description: 'Containers, environment configuration, CI pipelines and hosting.', requires: ['git'], module: { programmeId: 'devops-docker-deployment', module: 'Docker Essentials & Containerization' }, project: 'Containerise a project and deploy it with an automated CI pipeline.', keywords: /\b(docker|kubernetes|ci\/?cd|devops|deploy(ment)?|aws|azure|gcp|linux|nginx)\b/ },
  { id: 'advanced-python', label: 'Advanced Python', description: 'OOP, design patterns, generators and concurrency.', requires: ['python', 'debugging'], module: { programmeId: 'advanced-python', module: 'Advanced OOP & Metaprogramming' }, project: 'Refactor a script into a tested, packaged library with clear classes.', keywords: /\b(oop|object[- ]oriented|design patterns?|asyncio|concurrency|generators?)\b/ },
];

export type RoleId = 'python-developer' | 'backend' | 'fullstack' | 'frontend' | 'software-engineer';
export interface RoleFramework { id: RoleId; label: string; summary: string; core: string[]; supporting: string[] }

export const roles: RoleFramework[] = [
  { id: 'python-developer', label: 'Python Developer', summary: 'Writes reliable Python for scripts, services and data tasks.', core: ['python', 'problem-solving', 'debugging', 'advanced-python', 'git'], supporting: ['sql', 'http-apis'] },
  { id: 'backend', label: 'Backend Developer', summary: 'Builds the APIs, data models and services behind applications.', core: ['python', 'sql', 'http-apis', 'django', 'security', 'debugging', 'git'], supporting: ['deployment', 'problem-solving'] },
  { id: 'fullstack', label: 'Full-Stack Developer', summary: 'Works across the interface, the API and the database.', core: ['html-css', 'javascript', 'react', 'python', 'sql', 'http-apis', 'django', 'full-stack', 'git'], supporting: ['security', 'deployment', 'debugging'] },
  { id: 'frontend', label: 'Frontend Developer', summary: 'Builds accessible, responsive interfaces users interact with.', core: ['html-css', 'javascript', 'react', 'git'], supporting: ['http-apis', 'debugging'] },
  { id: 'software-engineer', label: 'Software Engineer', summary: 'Designs, tests and maintains software as part of a team.', core: ['python', 'problem-solving', 'debugging', 'sql', 'http-apis', 'git'], supporting: ['advanced-python', 'deployment', 'security'] },
];

export const nodeById = (id: string) => nodes.find(node => node.id === id);
export const roleById = (id: string | null | undefined) => roles.find(role => role.id === id);
