# Learning platform delivery

## Implemented

The existing React/Vite site, catalogue, four palettes and booking/student/admin interfaces are retained. The new backend is a separate Node/PostgreSQL service. It adds a ten-question adaptive assessment across eight skills with versioned questions, shuffled choices, server-only answer keys, transactional answer commits, exact grading and per-answer explanations. Results state their evidence limits rather than claiming a hiring percentile.

Five career targets use measured gaps and self-reported context to generate project-based roadmaps. Experience and interests change practice guidance; optional job keywords prioritize relevant gaps without executing instructions or retaining raw job text. Roadmaps can be explicitly shared through expiring, revocable snapshot links. Private pages are noindex.

The Python arena includes a CodeMirror editor, three difficulty levels, public examples, sample runs, full submissions, hidden edge cases, shuffled understanding checks, cancellation, exact-code rejudging, infrastructure-error handling and audited score corrections. Judge0 is a separately secured infrastructure dependency; no visitor code runs in this API. Missing execution produces an unavailable state, not a fabricated score.

Optional invited learner accounts support private score history, public pseudonyms and separately opted-in leaderboards with week/month/all-time and difficulty/skill filters. Ranking counts a best verified result per challenge; resubmission cannot farm additional completion points. Independence is self-reported, not a proctored-exam claim.

The learning dashboard provides role-controlled metrics, skill evidence, versioned question drafts/publication/retirement, execution failures/retries, grade corrections, learner invitations, consented lead assignment/status/follow-ups/CSV export, an ordered conversion funnel, attribution channels, demand reports and experiment controls. Experiments are disabled by default and consent-gated; no fabricated statistical significance is displayed. Payment/enrollment stages remain explicitly unavailable until their external systems are connected.

## Changed files and modules

| Area | Files |
| --- | --- |
| HTTP service, authentication, grading | `server/app.ts`, `server/index.ts`, `server/security.ts`, `server/assessment.ts`, `server/bank.ts` |
| Database and operations | `server/db.ts`, `server/manage.ts`, `server/migrations/*`, `compose.yaml`, `Dockerfile.learning`, `.dockerignore`, `.env.example`, `.gitignore` |
| Isolated execution | `server/challenges.ts`, `server/judge.ts`, `server/worker.ts`, `server/ranking.ts` |
| Accounts/reporting | `server/community.ts`, `server/insights.ts` |
| Hosted API adapters | `api/learning.ts`, `api/enquiry.ts`, `vercel.json` |
| New pages | `src/pages/Assessment.tsx`, `CodingArena.tsx`, `LearningAdmin.tsx`, `Leaderboard.tsx`, `LearningLanding.tsx`, `SharedRoadmap.tsx` |
| Learning UI/data | `src/components/learning/*` |
| Routing/SEO/legal | `src/App.tsx`, `src/data/routes.ts`, `src/utils/seo.ts`, `src/entry-server.tsx`, `scripts/prerender.mjs`, `src/pages/Legal.tsx` |
| Home/navigation/conversion | `src/components/home/HomeSections.tsx`, `src/components/layout.tsx`, `src/styles/experience.css` |
| Existing booking repairs | `src/components/public-booking/ProgrammeShowcase.tsx`, `src/components/course-fees/CourseFeesComparison.tsx`, `types.ts` |
| Dependencies/build | `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts` |
| Validation | `tests/learning.test.ts`, `tests/judge.test.ts`, `tests/learning-integration.test.ts`, `tests/learning-browser/platform.spec.ts`, `playwright.learning.config.ts`, `scripts/test-learning.mjs`, `scripts/validate-challenges.mjs`; updated existing browser assertions/fixtures |

Existing booking repairs restore supplied programme/empty states and optional-extra selection. Browser test changes update the new hero/routes, replace a timing-dependent checkout fixture with an explicit response trigger, and give the eight-viewport student journey an appropriate timeout. They do not replace real integration requirements with mock production behavior.

## Database migrations

1. `001_learning.sql`: session/attempt/question bank, consent/events, leads, administrators, audit and rate/idempotency records.
2. `002_judging.sql`: execution queue and worker health.
3. `003_score_reviews.sql`: append-only grade corrections.
4. `004_roadmaps.sql`: saved roadmap profiles and explicit snapshot shares.
5. `005_learners.sql`: single-use invites, learner accounts, persistent best points/history.
6. `006_engagement.sql`: attribution, lead ownership/status/follow-ups and experiment assignments.
7. `007_judge_operations.sql`: sample/full purpose, original-code hash and rejudge history.

## Routes and endpoint inventory

Public pages: `/developer-readiness-test`, `/python-aptitude-test`, `/backend-developer-roadmap`, `/full-stack-developer-roadmap`, `/python-interview-practice`, `/python-coding-challenge`, `/leaderboard`. Private/noindex pages: `/assessment`, `/shared-roadmap`, `/admin`. Existing routes remain.

All endpoints below are under `/api/learning`. Mutations require exact Origin; session-authorized mutations additionally require `X-CSRF-Token`.

| Methods | Paths |
| --- | --- |
| GET | `/health`, `/session`, `/session/current`, `/challenges`, `/leaderboard` |
| GET, POST | `/attempts` |
| GET | `/attempts/:id` |
| POST | `/attempts/:id/answer`, `/attempts/:id/roadmap` |
| POST | `/preferences`, `/events`, `/experiments`, `/leads` |
| DELETE | `/data` |
| GET, POST | `/report-shares` |
| POST | `/report-shares/revoke`, `/shared-report` |
| POST | `/submissions` |
| GET | `/submissions/:id` |
| POST | `/submissions/:id/understanding`, `/submissions/:id/cancel`, `/submissions/:id/rejudge` |
| GET, DELETE | `/account` |
| POST | `/account/register`, `/account/login`, `/account/preferences`, `/account/logout` |
| POST | `/admin/login`, `/admin/logout`, `/admin/invites`, `/admin/corrections` |
| GET | `/admin/session`, `/admin/metrics`, `/admin/insights`, `/admin/submissions`, `/admin/leads`, `/admin/lead-detail?id=…` |
| GET, POST | `/admin/questions`, `/admin/experiments` |
| POST | `/admin/questions/status`, `/admin/leads/update`, `/admin/leads/export` |

The existing enquiry adapter shares the established validation/CAPTCHA/email handler and now uses expiring PostgreSQL records on Vercel. It still needs its real provider credentials and legal approval.

## Security and privacy

Opaque hashed sessions, HttpOnly/SameSite cookies, Secure `__Host-` cookies in production, login token rotation, scrypt password hashing, disabled-account checks, server-enforced roles, exact Origin and CSRF checks, parameterized SQL, strict payload validation and size limits, atomic rate/queue limits, bounded external responses, hidden tests excluded from client payloads, version snapshots, transaction locks and audit trails are implemented. CSV export defends spreadsheet formula injection. Request logs avoid code/contact payloads.

Analytics are opt-in; disabling deletes optional events/assignments. Learner account and session deletion are available. Shared reports require explicit consent. Retention requires the scheduled pruning command. Production identity MFA, external sandbox verification, backup deletion policy and hosting hardening remain operator release gates; see the operations guide.

## Open-source dependencies and licenses

New runtime packages: `pg 8.23.1`, CodeMirror `state 6.7.6`, `view 6.43.14`, `lang-python 6.2.1`, and `recharts 3.10.1`, all MIT. New development typings `@types/pg` are MIT. Existing React, React DOM, React Router, TanStack Query/Table, Motion and Zod are MIT; Lucide is ISC; bundled Manrope and Space Grotesk fonts use OFL-1.1. TypeScript/Playwright use Apache-2.0; Vite/Vitest/ESLint/Tailwind use MIT. PostgreSQL uses the PostgreSQL License; the fixture Python runtime uses PSF licensing. Judge0 is GPL-3.0 licensed external infrastructure, not copied into the frontend. Preserve package and container notices when redistributing; the lockfile is the complete dependency version inventory.

The unused Vercel CLI dependency was removed; the prior dependency audit findings were resolved. Hosting configuration does not require bundling that CLI into the app.

## Running, deployment and limitations

See [LEARNING-OPERATIONS.md](./LEARNING-OPERATIONS.md) for environment variables, local commands, deployment, retention, security boundaries, exact incomplete features and production verification. This delivery is an implemented local application and tested integration path, not a claim that external judging, payments or hosted deployment are already provisioned.
