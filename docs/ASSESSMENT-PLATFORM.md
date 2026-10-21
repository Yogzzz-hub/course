# Aintrix Academy assessment platform

**Scope decision (21 Oct 2026): front end only, backend-ready.** No database, server or new npm packages were added. Every feature ships as working UI on the existing stack (React 19, Vite, Tailwind 4, zod, motion, lucide) with typed API contracts, so a backend can be connected later without rewriting screens. The brand is now **Aintrix Academy**; the visual identity, routes and animations are unchanged.

What that means in practice:

- The **skill test, results, roadmap, understanding checks, consent and analytics** work fully in the browser today.
- **Live code judging, the public leaderboard, verified payments and real access control** need a server. Their code paths are built and tested; on the site they show honest "not connected" states. Nothing falls back to running visitor code in the browser or on the web server.

## Features and where they live

| Area | Route | Code |
| --- | --- | --- |
| Developer Reality Check (adaptive skill test, results, explanations, course recommendations) | `/skill-test` | `src/assessment/*`, `src/pages/SkillTest.tsx` |
| Homepage call to action ("Are You Ready for Your Next Developer Interview?") | `/` | `src/components/home/ReadinessBand.tsx`, hero button in `HomeSections.tsx` |
| Coding arena (challenge list, editor, two learning modes, AI-use declaration, understanding check, skill report) | `/coding-arena`, `/coding-arena?challenge=<id>` | `src/arena/*`, `src/pages/CodingArena.tsx` |
| Grading service library (server-side) | — | `judge/*` |
| Personalised roadmap | `/roadmap` | `src/roadmap/*`, `src/pages/Roadmap.tsx` |
| Leaderboard | `/leaderboard` | `src/leaderboard/scoring.ts`, `src/pages/Leaderboard.tsx` |
| Growth & assessment console (overview, funnel, skills, leads, quality, question bank, marketing, experiments, audit) | `/admin` (noindex) | `src/pages/AdminConsole.tsx`, `src/admin-console/*` |
| Consent, first-party events, personalisation, experiments | `/privacy-choices` | `src/analytics/*`, `src/components/platform/ui.tsx` |
| SEO landing pages | `/python-aptitude-test`, `/developer-readiness-test`, `/python-coding-challenge`, `/backend-developer-roadmap`, `/full-stack-developer-roadmap`, `/python-interview-practice` | `src/data/landingPages.ts`, `src/pages/Landing.tsx`, `src/seo.ts` |

## Skill test

- **Question bank** (`src/assessment/questionBank.ts`, version `2026.10.1`): 52 questions across 8 skills (Python, logic, SQL, JavaScript, backend, debugging, APIs, web) at 3 difficulties. Each has an id, version, skill, difficulty, answer, explanation, learning objective, a programme module from the real catalogue, and scoring (1–3 points by difficulty).
- **Validated before release:** `tests/question-bank.test.ts` checks structure with zod and *executes* every checkable answer key: 30 questions run in Python, Node or SQLite and must produce exactly the keyed answer, with no distractor matching the real output; debugging questions substitute each option into a harness and only the key may pass. The remaining questions are conceptual and carry a review date.
- **Adaptive engine** (`engine.ts`): seeded and deterministic; rotates through the chosen focus skills; each correct answer moves the next question up a level, each miss moves it down; options are shuffled per attempt; questions never repeat.
- **Truthful scoring** (`results.ts`): points earned ÷ points available, plus the exact correct count. A skill is rated only when both its points share and its share of correct answers clear the bar, and a skill with fewer than two questions is shown as "Not enough evidence". No percentiles, curves, comparisons or job-readiness claims.
- **Progress** is saved only when the visitor ticks "Save my progress on this device".
- **Backend-ready:** `src/assessment/api.ts` defines `AssessmentApi`. Set `VITE_ASSESSMENT_API_URL` and a server implementing `POST /assessments`, `GET /assessments/current`, `POST /assessments/:id/answers` (with `Idempotency-Key`), `GET /assessments/:id/result` and `DELETE /assessments/:id` takes over scoring and keeps the answer key private. Until then the key ships with the page, so local results are a self-assessment only and never feed the leaderboard.

## Coding arena and grading

### Challenge bank
Ten Python challenges: arrays, strings, dictionaries, conditions and loops, algorithms (two of them), error handling, backend logic, recursion and data processing, from beginner to advanced.

- **Public data** (statement, examples, constraints, limits, rubric) is in `src/arena/challenges.ts`.
- **Hidden tests, reference solutions and faulty solutions** are in `judge/bank/hidden.ts`, which the browser never imports. A test enforces this, and a scan of the production bundle found none of the hidden data.

### Grader (`judge/grader.ts`, `GRADER_VERSION = grader-2026.10.1`)
- **Specification-based judging.** Public examples, private edge, boundary, invalid-input, large and regression tests, plus seeded property tests whose expected values come from running the trusted reference on generated inputs. Any correct approach passes; there is no source comparison.
- **Configurable rubric** per challenge (default correctness 60, edge 20, understanding 15, quality 5). Components that were not assessed are left out and the total is rescaled; `assessedWeight` reports how much was measured. Code quality is "Not assessed" until a quality adapter (for example Ruff) is connected.
- **Explicit states:** `queued → running → graded | judge_error`. Infrastructure failures are retried with backoff and, if they persist, reported as a judging error — never as a candidate failure. Compile errors, runtime errors, time and output limits are candidate results.
- **Records and review:** idempotency keys, submission ids, an audit trail, rejudging, and staff score corrections with a required reason.
- **Permissions:** submission results are visible to the owner and to staff with `grades.review`.
- **Language adapters** (`judge/languages/python.ts`): the harness runs the candidate in its own namespace, reads inputs from stdin and prints results behind a per-run token. Expected values never enter the sandbox — the server compares — so printing fake result lines cannot produce a pass. Add JavaScript and other languages as further adapters.
- **Execution adapters:**
  - `judge/adapters/judge0.ts` is the production adapter. Every request asks for network disabled, a single process, CPU and wall-clock limits, a memory limit, a file-size limit and an output cap. `verifyJudge0Config()` refuses an instance that allows network access or has loose limits.
  - `judge/adapters/trustedLocal.ts` exists only so the test suite can run the repository's own reference and faulty solutions. It provides no isolation, refuses to start in production, and declares that it does not accept visitor code.

### Understanding check (`src/arena/understanding.ts`)
- Two versioned, auto-checked follow-ups per challenge: predict an output, then choose the change that handles a new requirement (or explain why the approach works).
- 18 of the 20 answer keys are verified by execution; the other 2 are conceptual and reviewed.
- Visitors choose **AI-assisted practice** or an **independent skill check**, and can openly declare AI use; that changes how the report reads, never the score.
- Nothing claims to detect AI authorship. Paste detection, typing speed and similarity scoring are not used.

### Server endpoints a backend should expose
`GET /judge/status`, `POST /judge/challenges/:id/samples`, `POST /judge/submissions` (`Idempotency-Key`), `POST /judge/submissions/:id/understanding`. Wrap `createGrader()` with authentication, `RateLimiter` (`judge/limits.ts`) per user and IP, and request-size limits.

## Roadmap
- `src/roadmap/frameworks.ts` (version `2026.10.1`) defines 14 skill nodes, each linked to a real programme module and a project, and five roles: Python, Backend, Full-Stack, Frontend and Software Engineer.
- The deterministic engine orders prerequisites first, then prioritises gaps from the skill test, skills mentioned in a job description and the visitor's stated interests.
- Self-reported skills are shown as unverified; only tested skills are marked as demonstrated.
- Pasted job descriptions are scanned in the browser against fixed keyword patterns only; instructions inside them are ignored, and a test feeds it a prompt-injection attempt.
- No salaries, placement odds or invented facts.
- Revocable share links need a server; the page offers print and copy instead.

## Leaderboard
`src/leaderboard/scoring.ts` (version `leaderboard-2026.10.1`):
- **Points:** 10, 20 or 30 by difficulty, multiplied by the share of tests passed, plus up to 25% for the understanding check.
- **Anti-farming:** only verified, server-graded results count, and only each learner's best attempt per challenge per period.
- **Tie-breaks:** more distinct challenges, then whoever reached the total first, then pseudonym.
- **Periods:** weekly (from Monday) and monthly (from the 1st), UTC.
- **Badges** come from stated rules. Participation is opt-in under a random pseudonym, and there are no labels for low scores.

Without `VITE_LEADERBOARD_API_URL` the page shows "No verified results yet" and the visitor's private, unverified practice history.

## Admin console (`/admin`)
- **Roles:** Owner, Administrator, Admissions/Counselor, Instructor, Analyst. The permission matrix is `src/admin-console/permissions.ts`; the grader enforces the same checks.
- **Access:** with `VITE_CONSOLE_API_URL`, the role comes from `GET /console/session`. Without it, the page runs in a **clearly labelled demo mode that is not a protected area**: the role is picked locally to preview what each role sees.
- **Data:** every figure is a count of consented events recorded in that browser. Revenue, paid enrollments and qualified leads show empty states because they need server-confirmed records.
- **Question bank manager:** creates validated new versions, retires old ones and keeps an audit log, all as local drafts; publishing means committing to `questionBank.ts`, where CI executes the answer keys.
- CSV export of aggregate tables.

## Privacy, consent and personalisation
- Nothing optional runs until the visitor chooses "Allow analytics". The banner never blocks the page.
- **Events:** first-party only, on the device. 14 event names, short primitive properties only (names, emails, messages and code are stripped), 90-day retention. `payment_confirmed` cannot be recorded by the browser.
- **Visitor id:** random, created only after consent. No fingerprinting.
- **Deletion:** `/privacy-choices` shows what is stored and deletes all of it.
- **Experiments:** stable hash-based assignment for consented visitors; everyone else sees the control. The console reports counts only and claims no significance.
- **Contextual prompts:** at most one per page (resume your test, open your roadmap, test your Python, compare packages). No urgency, scarcity or pop-ups.
- The draft privacy notice now describes all of this. Compliance with India's Digital Personal Data Protection Act still needs legal review.

## SEO
- `src/seo.ts` is the single source for titles, descriptions, robots, canonical URLs, JSON-LD (WebPage, BreadcrumbList, FAQPage only where the FAQ is visible), the sitemap and robots.txt.
- Private routes are never indexed, never listed and never carry structured data.
- All 39 routes are prerendered with full content.
- Indexing stays disabled until `VITE_SITE_URL`, `VITE_BRAND_APPROVED` and `VITE_LEGAL_APPROVED` are set. This is existing behaviour, kept on purpose.

## Environment variables
Public (build time):
- `VITE_ASSESSMENT_API_URL`, `VITE_JUDGE_API_URL`, `VITE_LEADERBOARD_API_URL`, `VITE_CONSOLE_API_URL`: leave empty for the front-end-only behaviour above.
- `VITE_ACADEMY_NAME` now defaults to `Aintrix Academy`.

Server only (never `VITE_`):
- `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `JUDGE0_PYTHON_LANGUAGE_ID` (71 = Python 3.8.1 on Judge0 CE 1.13).

See `.env.example`.

## Run and test

```powershell
npm ci
npm run dev            # http://127.0.0.1:5173
npm run typecheck
npm run lint
npm test               # unit + grader validation (needs Python 3 on PATH, or set PYTHON)
npm run build          # typecheck, client + SSR build, prerender
npm run test:e2e       # Playwright, needs Google Chrome
```

## Deploying the judging service (when you are ready)
1. Host **Judge0 CE** (GPL-3.0) on its own VM or container host, separate from the web server, with no access to application databases or secrets.
2. Configure it with `ENABLE_NETWORK=false`, `ALLOW_ENABLE_NETWORK=false`, `MAX_CPU_TIME_LIMIT=5`, `MAX_MEMORY_LIMIT=256000`, a low `MAX_MAX_PROCESSES_AND_OR_THREADS`, and `AUTHN_TOKEN` set.
3. Pin the image version.
4. Do not run Judge0 in Cloudflare Workers, Vercel functions or other serverless runtimes.
5. Run a small API (any Node host) that wraps `createGrader()` with `createJudge0Adapter()`, your sign-in service, `RateLimiter`, and a persistent `SubmissionStore` (for example PostgreSQL).
6. Call `verifyJudge0Config()` at start-up and refuse to serve if it reports issues.
7. Set `VITE_JUDGE_API_URL` to that API and rebuild.

Hosting Judge0 is not free: budget for a dedicated small VM (about 2 vCPU and 4 GB RAM to start) plus database storage and backups.

## Validation results (21 Oct 2026, this machine)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 241 tests passed (15 files), including all 30 executed skill-test answer keys, all 18 executed understanding-check keys, 10 reference solutions passing every test, and all 28 faulty solutions failing |
| `npm run build` | Passed; 39 routes prerendered; production bundle contains no hidden tests, faulty solutions or judging credentials |
| Playwright (`npm run test:e2e`) | 149 passed, 2 failed. All 18 new platform tests pass, including 6 axe scans and phone-width checks. The 2 failures are pre-existing booking tests for homepage features removed in commit 6df3568, before this work |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (all) | 33 findings (1 critical, 24 high, 8 moderate), all inside the existing `vercel` CLI devDependency; not shipped to browsers. Upgrading or removing that CLI is recommended |

## Not done in this pass (needs a backend or a decision)
- **Server:** assessment scoring, live judging, leaderboard API, console session and data, and verified payments.
- **Database:** no PostgreSQL schema or migrations; the scope excluded a database.
- **Code quality:** Ruff feedback and its rubric weight stay unassessed until a quality adapter runs on the server.
- **Roadmaps:** revocable share links.
- **Pending your input:**
  - Real instructor profiles, testimonials, sample lessons and project demonstrations; none were invented.
  - Legal review of the privacy notice (including DPDP obligations), and approval of the domain and brand before indexing is enabled.
- **Existing test failures:** the 2 pre-existing booking tests need a product decision. Either restore the removed features or rewrite the tests.
