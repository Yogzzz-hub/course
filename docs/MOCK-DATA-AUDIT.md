# Mock data removal - what changed

## Panel status after this change

| Panel | Before | After |
|---|---|---|
| Admin | Real (`/api/admin`) | unchanged |
| Student | Real (`/api/student`) | unchanged |
| Manager | 100% mock (`src/data/managerMock.ts`) | **Postgres via `/api/manager`** |
| Trainer | 100% mock (`src/data/trainerMock.ts`) | **Postgres via `/api/trainer`** |
| Financier | `/financier` page was mock; real DB-backed workspace existed but was unrouted | **Postgres via `/api/financier`** |

## Files added
- `db/manager_trainer_additions.sql` - two new tables (`Announcement`, `DoubtThread`). Already applied to the local `academy` DB.
- `backend/services/manager/pgStore.ts` - all Manager queries + first-run seed.
- `backend/services/trainer/pgStore.ts` - all Trainer queries + first-run seed.
- `api/manager/index.ts`, `api/trainer/index.ts` - HTTP handlers.
- `src/components/manager-portal/api.ts`, `src/components/trainer-portal/api.ts` - fetch clients.

## Files deleted
- `src/data/managerMock.ts`
- `src/data/trainerMock.ts`

## Files changed
- `src/pages/ManagerPanel.tsx`, `src/pages/TrainerPanel.tsx` - fetch on mount, loading/error/retry states, writes POST to the API.
- `src/components/manager-portal/types.ts`, `src/components/trainer-portal/types.ts` - data interfaces moved here from the mock files.
- 16 view components - type imports repointed from `../../data/*Mock` to `./types`.
- `src/components/manager-portal/ReportsView.tsx` - takes real `reports` data as a prop; the hardcoded "65.9% Avg" and "Rs 48,50,000 Total" are now computed.
- `vite.config.ts` - dev server routes `/api/manager` and `/api/trainer`.
- `backend/services/financier/pgStore.ts`, `scripts/seed-financier-db.ts` - **removed hardcoded DB password**; `DATABASE_URL` is now required.

## Where each Manager/Trainer screen gets its data
Existing unified-schema tables, no duplicates:
- Leads -> `Lead` + `LeadActivity` (notes)
- Admissions -> `Admission` + `StudentProfile` + `Course` + `Batch` + `FeeAgreement`
- Cohorts/Batches -> `Batch` + `Course` + `StudentBatchEnrollment` + `TrainerBatchAllocation` + `AttendanceEntry`
- Attendance alerts -> `AcademicAlert` (extra figures in its `evidenceJson` column)
- Fees -> `FeeInstallment` + `StudentPayment`
- Counsellors -> `ManagerProfile` + `User`, with live lead counts
- Reports -> computed from `Lead` / `Admission` / `Course` / `FeeAgreement`
- Trainer schedule -> `SessionOccurrence`; assignments -> `Assignment` + `AssignmentSubmission` + `AssignmentGrade`
- Announcements, doubts -> the two new tables

## Known gaps
1. **Not executed against the database.** The SQL in the new store files was verified by schema reading and a strict `tsc` pass, not by running. First `npm run dev` is the real test.
2. **`SessionOccurrence` and `AssignmentSubmission` are empty (0 rows)**, so the Trainer schedule and assignments tabs will show empty states until real sessions/assignments exist.
3. **No auth on `/api/manager` and `/api/trainer`.** These panels had no server-side auth before either, so this is not a regression, but it should be added.
4. **Trainer panel uses the first `TrainerProfile` row** as the logged-in trainer. Per-trainer login still needs wiring.
5. **Lead "score"** is derived from status (the schema has no scoring column).
6. **Financier `/financier` is still mock** - see below.

## Financier (done)
`src/pages/FinancierPanel.tsx` was a 1,146-line page built on `src/data/financierMock.ts`, whose
"add transaction" modal only changed React state. It has been replaced by a thin route host that
renders `FinancierWorkspace` - the already-built, Postgres-backed financier UI (dashboard, fees and
invoices, payments, ledger, payroll, collections, reports, audit) that was never routed. The routing
for `/financier/*` sub-paths already existed in `src/App.tsx`, so every sub-page now works.

Mock paths removed from the financier stack:
- `api/financier/index.ts` no longer falls back to an in-memory mock store when Postgres is down; it
  surfaces the error instead. `getSharedFinancierStore()` and `resetSharedFinancierStore()` no longer
  build mock state.
- `src/components/financier/api.ts` no longer has a preview mock store; an unreachable API raises a
  clear "service unavailable" error.
- `src/data/financierMock.ts` renamed to `src/data/financierSeedData.ts`. It is now only a seed
  dataset (`scripts/seed-financier-db.ts`) and test fixture, never read by the running UI.

The old mock page is recoverable from git history if you want anything from it.

## Environment fix (important)
Removing the hardcoded password exposed a latent bug: `.env.local` holds `DATABASE_URL`, but Vite's
`loadEnv` never puts it into `process.env`, which is what the `/api/*` handlers read. `vite.config.ts`
now copies non-`VITE_` keys from the env files into `process.env`, so the local API can reach Postgres.
Without this, every panel would have failed to connect.

`scripts/start.mjs` (the `npm start` server) now also routes `/api/manager` and `/api/trainer`,
which it previously did not.

## Admin and Student - not done, and why
- **Student**: the panel has no mock data in its default path. It calls `/api/student`, which nothing
  in this repo implements, so it shows "service unavailable" locally. The DEV-only `LocalPreview` is
  opt-in behind a button, not the default view.
- **Admin**: `src/pages/AdminPanel.tsx` wraps the HTTP client in `createDevFallbackAdminApi` whenever
  `import.meta.env.DEV`, so `npm run dev` serves 697 lines of synthetic data from
  `src/dev/admin-preview-api.ts`. Production builds strip it and call `/api/admin`, which nothing
  implements.

Both need a backend built against `src/components/*/contracts.ts`, which are strict zod specs
(~800 lines combined) including arithmetic invariants enforced by `.refine()`. Writing that blind,
with no way to run it here, would likely produce contract errors across the panels.

## Security: authentication is not real on any panel API
`api/financier/auth.ts` establishes identity from an `X-CRM-Session` header that the browser sends
containing its own claimed role. There is no server-side verification - no password check, no signed
token. Anyone who can reach the server can send `{"role":"ADMIN"}` and read finance, refunds and audit
data. The `/api/manager` and `/api/trainer` endpoints added here have no auth either.

This predates the current work, but it must be fixed before anything is exposed beyond localhost, and
it should be settled before building `/api/admin` - the admin contract has a two-factor flow
(`two_factor_required`, `twoFactorVerified`) that would be pure theatre on top of a client-asserted
session.

## Final status: all five panels use the local PostgreSQL database

- **Admin**: `src/pages/AdminPanel.tsx` always uses the HTTP API (`/api/admin`). The dev synthetic-data fallback and `src/dev/admin-preview-api.ts` are removed. The API is served by `api/admin/index.ts` and `backend/services/admin/pgStore.ts`, and is wired into both `vite.config.ts` and `scripts/start.mjs`.
- **Student**: `src/pages/StudentPanel.tsx` always uses the HTTP API (`/api/student`). The "Open local demo" preview, `src/dev/StudentPreview.tsx`, `src/dev/student-preview-api.ts` and `src/dev/student-preview.css` are removed. Served by `api/student/index.ts` and `backend/services/student/pgStore.ts`.
- **Manager, Trainer, Financier**: as described above; mock data files removed.
- **Preview tests** (`tests/admin-preview.test.ts`, `tests/student-preview.test.ts`) removed with the files they tested.

Known gaps (not mock data, but unsupported):
- No server-side authentication: sessions are client-asserted via the `crm_session` cookie.
- Admin: refunds, CMS, report export and two-factor verification return "failed"/501.
- Student: checkout, mentorship booking and file upload return 501; learning plan is null.
- Trainer schedule and assignment tabs are empty until session occurrences and submissions exist in the DB.
