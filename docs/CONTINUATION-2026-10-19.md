# Continuation delivery — 19 October 2026

## Implemented

Read the supplied project brief, repository inventory, prior continuation and implementation/operations notes, then inspected the assessment/API/deployment, grading, ranking, worker, administration, consent and test paths relevant to this continuation. Existing branding, framework, courses, public routes and integration boundaries are retained. This is not a claim that every requirement in the larger brief is complete.

- Restored local learning API availability using the existing project PostgreSQL configuration. The frontend proxy health endpoint responds with `status: ok`; judging remains explicitly unavailable.
- Added `npm run dev:learning`: load the existing ignored environment file, check database access and migrations, start the API, wait for health, then start Vite on the configured local origin. Ctrl+C shuts down the two Node services. Database lifecycle and migrations remain explicit operator commands; no credentials or schema are replaced.
- Added validated per-challenge scoring weights. Integer sample, edge-case and understanding weights must total 100. Existing challenge snapshots retain 60/20/20 when no rubric is present. Grader version is now `python-stdio-1.1.0`.
- Updated grading, understanding reports, ranked points and worker rejudges to use the stored challenge rubric. The arena displays the returned denominators and supports older results without rubric metadata. Hidden fixtures and answer keys remain server-only.
- Improved client errors for network failure, non-JSON proxy outages and invalid null responses. Network-loss messages acknowledge that an answer may already be saved. Mutations are not automatically retried.
- Checked the live Vercel health/session endpoints: both returned HTTP 500 `FUNCTION_INVOCATION_FAILED`. The precise hosted exception is unavailable without deployment logs. Hardened the adapter with exact HTTPS origin validation and lazy backend initialization inside a JSON error boundary; initialization failures now have payload-free correlation logs when the handler can load. Runtime/module entrypoint failures still require Vercel logs and a verified redeployment.

## Changed modules

- Startup: `package.json`, `scripts/dev-learning.mjs`.
- Hosted adapter: `api/learning.ts`.
- Grading: `server/rubric.ts`, `server/challenges.ts`, `server/judge.ts`, `server/app.ts`, `server/ranking.ts`, `server/worker.ts`.
- Client: `src/components/learning/client.ts`, `src/pages/CodingArena.tsx`.
- Tests: `tests/learning-adapter.test.ts`, `tests/learning-client.test.ts`, `tests/judge.test.ts`, `tests/learning-integration.test.ts`.
- Browser harness: `tests/browser/site.spec.ts` splits the 22-route screenshot loop into individually timed route tests with the same mobile/desktop captures.
- Documentation: `README.md`, `docs/PLATFORM-IMPLEMENTATION.md`, `docs/LEARNING-OPERATIONS.md`, this report.

No dependency, license, migration, route or API endpoint was added. Rubrics use the existing JSON challenge snapshots. Existing library licenses and the complete route/API inventory remain in [LEARNING-DELIVERY.md](./LEARNING-DELIVERY.md). No paid service was added.

## Actual validation

- Lint, TypeScript check and production build passed; 36 routes plus 404 prerendered.
- Unit tests: 99 passed. The 10 database cases skipped in this command passed separately with `npm run test:integration`.
- Database integration: 10 passed, including custom rubric report/ranking consistency and legacy defaults.
- Trusted checked-in Python fixtures: 126 case checks passed; all seven references accepted and all fourteen faulty implementations rejected. This is not sandbox verification.
- Database-backed learning browser journeys: 4 passed, covering result/roadmap/sharing, mobile resume/deletion, unavailable execution and unauthorized administration.
- Internal links: 466 links and 22 fragment destinations verified.
- Dependency audit: zero reported vulnerabilities.
- Startup failure checks: invalid local origin and unreachable database each exit with status 1 and actionable messages before opening the frontend.
- Full browser regression: 116 passed, 2 timed out (the aggregate screenshot capture and Dusty Lavender theme journey). Screenshot capture was split into per-route tests. A serial targeted run passed 21 route captures and timed out on the privacy capture and theme journey. Review captures now use reduced motion and a 60-second per-route budget; motion behavior retains its separate tests. The final focused privacy/theme rerun passed both cases in 27.4 seconds. All final browser cases have passed across these runs, but there was no clean single full-suite run. An attempted concurrent screenshot rerun was stopped after two capture timeouts and is not counted as a passing run.

Final focused recovery command:

```powershell
npm run test:e2e -- tests/browser/site.spec.ts tests/browser/themes.spec.ts --grep 'capture review screenshots: /privacy-policy$|Burgundy \+ Dusty Lavender:' --workers=1 --reporter=line --output=.local/recovery-browser-results
```

The first full-browser attempt overlapped the last production build, causing a transient static-preview `Bad request`. That run was stopped; the suite was restarted against completed build artifacts. This was an orchestration mistake, not evidence of a passing first run.

## Local use and deployment

From the repository directory, with the existing PostgreSQL database running:

```powershell
npm run dev:learning
```

Open `http://127.0.0.1:5173/assessment`. The frontend and API were left running for local review. On a fresh setup, configure server-only `DATABASE_URL` and exact local `APP_ORIGIN`, then run `npm run db:migrate` first. The combined command supplies the development learning proxy itself. No new environment variables are required.

Production deployment remains the existing Node/PostgreSQL or Vercel adapter path in [LEARNING-OPERATIONS.md](./LEARNING-OPERATIONS.md). Use server-only credentials, HTTPS origin, migrations, same-origin routing, scheduled pruning, backups and reviewed identity protection. No hosted deployment was performed. Local recovery does not establish that the live Vercel site's database configuration works.

## Unfinished scope and production verification

Docker and a reviewed, isolated Judge0 deployment remain unavailable here. Live candidate execution, sandbox escape/network/resource tests, deployment load tests and backup restoration have not been validated. Execution remains disabled; no unsafe local fallback is provided.

Existing payment, enrollment, email OTP and booking clients still need real authenticated provider backends and credentials. Native learning-admin MFA/password recovery and learner email verification remain unimplemented. The original admin/student panel fixtures do not establish those services work live.

The broader brief also still includes additional language adapters, randomized code modification/debugging follow-ups, richer course/challenge content management, and expanded management reporting. The current understanding check remains a deterministic concept question with shuffled options. Configurable rubrics are now implemented, but the existing reviewed challenge weights are unchanged.

Business approval of claims, fees, contact details, domain, privacy/legal text and indexing remains required. Production release must verify actual hosted API paths/cookies, database TLS/pooling, external providers, sandbox isolation, role access/MFA, retention scheduling and backup restoration. These are not represented as completed or legally compliant.
