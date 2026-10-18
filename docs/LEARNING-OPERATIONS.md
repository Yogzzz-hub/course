# Learning platform operations

## Local development (PowerShell)

Use Node 24.15+ (the backend uses native TypeScript stripping), npm and Docker Desktop. The frontend's older minimum Node version alone is insufficient for this backend.

```powershell
npm ci
$env:POSTGRES_PASSWORD = '<generate a unique local password>'
docker compose up -d database
Copy-Item .env.example .env.learning.local
```

Edit the ignored `.env.learning.local`: put that password in `DATABASE_URL` (URL-encode reserved characters), keep the PostgreSQL port at 55432, set `APP_ORIGIN=http://127.0.0.1:5173`, and keep judging disabled. Never overwrite an existing local configuration or volume while following these first-time setup instructions. This workspace already has a configured database and ignored environment file.

```powershell
npm run db:migrate
npm run api:dev
# In another terminal:
npm run dev
```

Open http://127.0.0.1:5173. Vite reads the learning proxy target from `.env.learning.local`. `npm run preview` serves static HTML only; it does not start APIs.

Provision an administrator from a trusted operator terminal:

```powershell
$env:ADMIN_EMAIL = 'operator@example.com'
$env:ADMIN_PASSWORD = '<unique password of 16–200 characters>'
$env:ADMIN_ROLE = 'owner'
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

This resets an existing administrator's password/role and revokes their sessions. Supported roles: owner, administrator, instructor, counselor, analyst. The new `/admin` learning dashboard and original `/admin-panel` integration are separate systems; configuring one does not authenticate the other.

## Environment contract

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-only PostgreSQL connection; production TLS with certificate verification |
| `APP_ORIGIN` | Exact browser origin, no trailing slash; HTTPS required in production |
| `NODE_ENV` | `production` enables Secure `__Host-` cookies |
| `API_HOST`, `PORT` | Listener; local defaults 127.0.0.1:8787; container binds 0.0.0.0 |
| `VITE_LEARNING_PROXY_TARGET` | Development-only API proxy; default example 127.0.0.1:8787 |
| `LEGAL_APPROVED` | Explicit `true` required before storing learning counselling enquiries |
| `LEARNING_JUDGING_ENABLED` | Opt-in switch, false by default; healthy worker also required |
| `JUDGE0_URL` | HTTPS endpoint of a separately reviewed isolated execution service |
| `JUDGE0_AUTH_TOKEN` | Server/worker credential, never public |
| `JUDGE0_PYTHON_LANGUAGE_ID` | Operator-reviewed pinned Python runtime ID |
| `JUDGE0_SANDBOX_REVIEWED` | Explicit operator attestation; not a substitute for a security review |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE` | One-time administrator CLI provisioning |
| `TEST_DATABASE_URL` | Explicit disposable integration-test target outside default local DB |

Only variables prefixed `VITE_` belong in the browser build. Existing booking, student, email, CAPTCHA, domain, brand and legal approval variables remain documented in `.env.example`. Domain, brand and legal gates deliberately keep indexing off until approved.

## Deployment path

1. Back up PostgreSQL and verify restoration. Apply `npm run db:migrate` once with a migration role. Migrations run under a transaction/advisory lock and record versions. Give runtime credentials only necessary table/sequence privileges; runtime does not need schema creation privileges.
2. Build the frontend with approved public variables using `npm run build`. Publish `dist` to the chosen static host with clean route handling, security headers and a same-origin `/api/learning/*` reverse proxy to the Node service. Do not serve repository files or `.env` files. Do not rebuild `dist` while running preview-based browser tests.
3. Build the API container with `docker build -f Dockerfile.learning -t academy-learning-api .`. Run it with runtime secret injection, a read-only filesystem, no added Linux capabilities, `no-new-privileges`, resource limits and an internal-only port. It executes application code only; it is **not** a candidate-code sandbox. Set `NODE_ENV=production` and the exact public HTTPS `APP_ORIGIN`.
4. Terminate TLS at the same-origin proxy; preserve URL paths, cookies and Origin. Limit request bodies to 32 KiB and enforce per-client edge limits. The standalone API uses the socket peer for IP limits and intentionally does not trust arbitrary forwarded headers. Behind a proxy, edge per-client limits are necessary; API peer limits otherwise apply to the whole proxy.
5. Schedule `npm run data:prune` hourly. Monitor failures. Configure backups, database and external-judge retention separately; SQL deletion cannot remove backups or third-party records. Add service restart policies and health checks at `/api/learning/health`.
6. Provision administrators, restrict the administration route/API through your identity gateway with MFA, and verify each role on staging. The learning password login does not implement native MFA or password recovery. Do not confuse the original admin panel's MFA contract with this new backend.
7. Configure the optional isolated judge and worker only after the checks below. Keep it disabled otherwise. Run `node server/worker.ts` as a separate long-lived process with the same database and judge credentials; never as a serverless request handler. One advisory lock intentionally limits concurrency to one worker.
8. Complete staging smoke tests before routing real users. No production deployment or hosted smoke test has been performed by this change.

The repository also includes a Vercel API adapter and rewrite. Hosted rewrite-path behavior, regional database access, connection pooling and runtime packaging must be verified in staging. Use Node 24 for the native TypeScript backend. Cloudflare static hosting can serve the frontend, but this Node/pg worker is not a Cloudflare Worker deployment.

## Isolated execution requirements

Judge0 is an integration, not bundled infrastructure. Deploy a patched, reviewed release on separate hosts/account boundaries; pin its runtime image and language ID, with no academy database or cloud credentials accessible to submissions. Deny outbound network at the host/network boundary and set both Judge0 `enable_network=false` and `allow_enable_network=false`. The adapter checks these settings before worker execution and sends explicit limits: 2 seconds CPU, 4 seconds wall time, 64 MiB memory, one process/thread, 32 KiB files/output, one run.

Verify filesystem isolation, escape resistance, fork/resource bombs, excessive output, blocked networking, concurrency, queue saturation, cancellation, worker crash recovery, credential rotation and deletion against the actual infrastructure. An API flag cannot prove sandbox isolation. Confirm the language ID is the intended pinned Python version. Do not expose Judge0 publicly without authentication, quotas and network controls. Do not run visitor submissions in the API, browser, or local fixture runner.

The adapter submits each case independently, parses JSON stdout and compares data structures; equivalent dictionary key order is accepted. Expected outputs stay on the grading service side of the application, not in submitted code. Candidate runtime/compile/resource failures are graded failures; service failures retry up to twice and then become `system-error`, without assigning a zero grade. Polling and HTTP requests have finite timeouts. Cancellation prevents further cases; an already submitted isolated case can run until its resource limit. Sample runs exclude hidden tests and ranking. Rejudges require the exact original code hash and retain the old result/reason.

Scores are 60 sample correctness + 20 hidden cases + 20 deterministic understanding. Code quality is explicitly not scored. There are three reviewed exercise fixtures, not a comprehensive interview bank. No unsupported language, LLM grading, AI-authorship detection or supervised-exam claim is provided.

## Tests and retention

```powershell
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:challenge-fixtures
npm run build
npm run test:e2e -- --workers=1
npm run test:learning:e2e
npm audit
```

The fixture runner executes only checked-in trusted reference/faulty solutions inside constrained Docker containers. Integration tests create and drop their own random schema; they require database permission to create that schema. The learning browser suite uses ports 5174/8788 and the configured local DB, creates temporary learning sessions, and expects disabled judging. Original browser tests use fixture-backed booking/student/admin APIs and do not prove live payment or identity integrations.

Anonymous sessions expire after seven days, assessment/report access after 24 hours, optional events at most 30 days (usually sooner through session cascade), administrator sessions one hour, security audit records 180 days. Code is cleared on final grading/failure/cancellation or stale-job pruning. Persistent learner points/history last until account deletion. Reports require explicit sharing consent and expire or revoke. Leaderboards require a single-use invitation and separate public opt-in; accounts have no public email field. A public pseudonym is still personal data if the learner chooses an identifying name.

## Remaining scope and release gates

- Real payment/enrollment/booking/OTP backends remain external existing contracts. Their funnel stages are visibly unavailable; fixture tests are not proof of money movement. Learning leads are saved in PostgreSQL; this does not send email or book an appointment.
- No production Judge0 endpoint, authenticated hosted smoke test, load test, sandbox penetration test or backup restoration has been completed.
- Native administrator MFA, automated password recovery, learner email verification/SSO, live notifications and a production identity provider are not implemented. Invitation issuance relies on operator identity checks; it is not bot-proof or exam proctoring.
- Roadmaps are deterministic curriculum suggestions using measured gaps, target roles, interests, experience and optional job keywords. Education and declared skills are context, not verified competence. There is no validated hiring-readiness percentile or guaranteed timeline.
- Experiments are off by default and consent-gated. Outcomes are descriptive counts, not significance tests. Personalization consists of contextual links, saved progress and these experiment variants, not behavioral profiling or predictive lead scoring.
- Question management supports versioned JSON drafts, review/publication/retirement; challenge authoring remains code-reviewed. Rich course CMS, bulk learner operations and revenue reconciliation need the existing external systems connected.
- Course claims, prices, instructor credentials, legal text, contact details and domain ownership require academy approval. No testimonials, scarcity, outcomes or revenue numbers were invented.
