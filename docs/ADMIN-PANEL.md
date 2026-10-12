# Admin Panel integration

The React/TypeScript panel is mounted at `/admin-panel`. It uses Tailwind, Lucide, TanStack Query 5 and TanStack Table **9** (the current `useTable`/feature API). The reusable entry point is `src/components/admin-panel/index.ts`; screens, HTTP service, permission policy, runtime schemas and financial request registry are separate modules.

```tsx
import { AdminPanel, createHttpAdminApi } from './components/admin-panel';

const api = createHttpAdminApi({ baseUrl: '/api/admin' });
export function Administration() {
  return <AdminPanel api={api} signInUrl="/auth/admin/sign-in?returnTo=%2Fadmin-panel" />;
}
```

Configure `VITE_ADMIN_API_URL` and `VITE_ADMIN_SIGN_IN_URL` in public build settings. Defaults use the same origin. These are URLs, never provider secrets. The authentication service and admin endpoints are **not implemented or connected** in this frontend task. Unconfigured visitors see a service error or sign-in gate, never fabricated leads or financial records. Test records exist only under `tests/`.

All admin screens and access gates share the four public website colour palettes. The default sign-in destination `/auth/admin/sign-in` explains the missing authentication integration rather than returning 404; configure the real provider URL for live sign-in. Local `/api/*` requests return JSON 503 until `VITE_DEV_API_PROXY_TARGET` connects a backend (or a configured HTTPS API URL is used).

## Authentication and authorization contract

`GET /session` returns one of the discriminated states in `adminSessionSchema`:

- `anonymous`.
- `two_factor_required`, with opaque `challengeId`, CSRF token, masked email and challenge expiry. The backend/auth provider issues the challenge; `POST /two-factor/verify` accepts `{challengeId, code}` and returns the new session. Code delivery, attempt limits, replay protection and first-factor authentication belong to that service.
- `authenticated`, with opaque `userId`, **session-specific** `cacheKey`, display name, CSRF token, exact permission list, `twoFactorVerified: true`, session and two-factor expiries, and `pendingFinancialOperations` (up to 50 opaque request IDs).

Use Secure/HttpOnly/SameSite cookies. Rotate `cacheKey` on sign-in, account change and privilege elevation; it must not be a reusable authentication credential. Never provide a client-controlled permission list or MFA claim. Return `Cache-Control: private, no-store`; do not put private API responses in a service-worker or shared CDN cache. Session reads refresh every 15 seconds, and the local expiry gate updates every second. A failed session read or any HTTP 401/403 closes the visible workspace until a successful explicit session refresh. Sign-out POST `/logout` returns 204, revokes the server session and clears private query data locally.

Navigation, screen mounts, action controls, search results and notifications check current permissions on every render. Read and mutation hooks check the latest query-cache session immediately before calling the adapter. Expired MFA blocks reads and actions. Permission removal hides the affected screens and removes their cached queries. Backend authentication, MFA freshness, resource-level authorization and permissions must also be checked **on every API request**, including downloads; browser checks are presentation safeguards.

Read permissions are `leads.read`, `offers.read`, `ledger.read`, `cms.read`, `reports.read`, `audit.read`, `search.read`, `notifications.read`, and `operations.read`. Write permissions are enumerated in `contracts.ts`; `permissions.ts` defines the exact command requirements. Financial writers additionally need `operations.read` for safe recovery. Timeline reads need both `leads.read` and `audit.read`; exporting needs `reports.read` and `reports.export`; publishing needs `cms.read`, `cms.publish` and `cms.rebuild`.

## Read endpoints and schemas

All adapter responses are checked by Zod. Money is safe integer minor units plus ISO currency; dates are ISO timestamps with offsets. Percentage offers use integer basis points, with half-up rounding to the currency's minor unit. Fee lines must exactly sum to a non-negative package total. Unsafe links, malformed versions, mismatched offer prices, missing primary proof reviewers and refunds without independent approval fail closed.

| GET endpoint | Response / purpose |
| --- | --- |
| `/leads` | `leadsSchema`: leads, owners and server clock; each lead has a version and server-authorized transitions |
| `/leads/:id/timeline` | `auditSchema`: authorized events for that lead |
| `/offers` | `offersSchema`: original, discount and final prices, requester, reason and decision state |
| `/finance` | `financeSchema`: ledger entries, offline proofs, refund pipeline and server clock |
| `/programmes` | `programmesSchema`: revisions, immutable package versions, published version and build status |
| `/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | `reportsSchema`: authoritative period, currency, revenue, funnel and counsellor metrics |
| `/audit` | `auditSchema`: server-generated actor, action, target, summary, timestamp and request ID |
| `/search?q=...` | `searchSchema`: results with section destinations; minimum two characters, client debounce |
| `/notifications` | `notificationsSchema`: scoped unread/read notices and section destinations |
| `/operations?ids=id1,id2` | `operationsSchema`: status for current administrator's authorized request IDs |
| `/exports/:id` | `exportSchema`: queued/running/ready/failed job and expiring HTTPS or same-origin download |

Collection endpoints return complete authorized collections for the server-selected workspace scope. The shared TanStack Table sorts, filters and paginates those returned records locally (10 per page). For very large datasets, extend this explicit contract with server cursors, filtering and total counts rather than silently truncating results. The current adapter does not implement infinite or server-side pagination. Server reports define cohort and revenue accounting rules; the UI never totals incomparable currencies or infers captured money from payment initiation.

Search and notification endpoints must restrict returned data to authorized resources before sending JSON; client filtering cannot prevent disclosure in a network response. Signed proof and report links must enforce identity, allowed storage origins, authorization and expiry. Send safe attachment content types and download disposition for untrusted evidence. Scrub audit summaries of credentials, OTPs and unnecessary personal details.

## Commands, concurrency and financial idempotency

`POST /commands` takes the `AdminCommand` discriminated union. All commands send `X-CSRF-Token`, `X-Admin-Session` (the opaque cache scope) and `Idempotency-Key`. Responses use `operationSchema`: `{requestId, status, resourceId, message}`. The receipt's request ID must equal the submitted key. Command responses may be `pending`, `succeeded` or `failed`; `not_found` is valid only for operation lookup. Return a concise safe message without stack traces. No query mutation optimistically creates an approval, capture, refund or published website.

| Command | Required server behavior |
| --- | --- |
| `lead.move` | Check `expectedVersion`, current allowed transition, assignment scope and actor permission; enrolment must remain tied to verified payment |
| `offer.decide` | Independent administrator, pending request, matching version, valid discount policy and recorded decision reason |
| `proof.review` | Primary reviewer differs from submitter; secondary reviewer differs from submitter **and** primary; atomic version/state check; only secondary success can verify/capture |
| `refund.request` | Captured payment, matching version, positive amount no greater than remaining refundable amount, no duplicate/reserved refund; reserve amount atomically |
| `refund.decide` | Different actor from requester, pending state and matching version |
| `refund.execute` | Independent approval already exists, correct version/state and processor idempotency; never execute an unapproved/refunded request |
| `ledger.reconcile` | Check reference with the processor/bank before matching; preserve original evidence and record the reason |
| `cms.save` | `expectedRevision` and base version check; create an immutable draft version rather than mutate historical pricing |
| `cms.publish` | Check draft/revision and publish permissions, archive prior version, switch published version atomically and enqueue rebuild |
| `cms.rebuild` | Enqueue an idempotent rebuild of the current published version; report queued/running/live/failed truthfully |
| `notification.read` | Update only a notification visible to the authenticated administrator |
| `reports.export` | Check period/export scope, enqueue a sanitized CSV job and return `succeeded` with job ID in `resourceId`; download readiness is separate |

Financial request keys are generated and persisted **before** HTTP submission. A SHA-256 fingerprint canonicalizes the command; retries reuse the key and the original in-memory payload. Session storage holds only opaque IDs and hashes, never reasons, prices, proof files, customer details or OTPs. The registry admits one unresolved financial action per browser scope. The backend must also enforce this per actor/session to cover multiple tabs and blocked browser storage, and return pending IDs in `/session` for recovery.

Unknown network/5xx/malformed outcomes remain pending, block a new financial request, and expose operation lookup. `not_found` does **not** prove that a request never committed; it does not clear the lock. Reload recovers keys, and the panel resolves only server-confirmed `succeeded` or `failed` operations. No automatic financial mutation retries run. Read polling updates finance, CMS builds, operation status and export jobs every five seconds while their authorized screen is active.

The server must implement durable uniqueness on `(actor, operation, idempotencyKey)`, store the canonical payload hash, reject key reuse with a changed payload, return the original receipt for duplicate submission, and transactionally save domain changes, audit events and the idempotency result. Propagate a stable provider idempotency key and use verified provider webhooks to finalize settlement. A `failed` operation is terminal and must seal its key against later execution.

HTTP 400/401/403/404/409/422/429 responses are treated as definitive rejections by the current client and release its local key. Consequently, the backend **must not** return a 4xx after applying or queuing the mutation: return the persisted `pending`/`succeeded` receipt instead. For any uncertain outcome, return 5xx or a `pending` receipt. Contract/receipt mismatches also remain unknown. Version conflicts must be rejected before execution and require a refreshed record. Never infer settlement from the browser's request completion.

## UI and operational notes

The Kanban board offers pointer dragging and labelled select/button controls for keyboard use. Owner filters and server-clock-anchored follow-up timers update the view. Finance separates ledger, primary/secondary proof verification and refunds. Pricing lets writers add/remove packages, fee lines and inclusions, and save new versions; readers see fee/inclusion previews. A changed programme revision preserves unsaved inputs and blocks saving until the writer reloads the draft or selects a new version. Currency parsing, fee totals and display formatting preserve exact minor units, including large safe integers. Export downloads expire visibly; CSV generation must escape formula-leading content (`=`, `+`, `-`, `@`, tabs and carriage returns) before offering a file. Every screen has loading, error and empty states; resettable error boundaries protect rendering. The sidebar scrolls on short desktops; mobile tabs and wide boards/tables scroll within their container. Wide tables provide a focusable, labelled scroll region for keyboard use.

The static admin route contains only a loading shell, always uses `noindex, nofollow`, has no public structured data, and is excluded from the sitemap. This is not an authentication mechanism: serve `/api/admin` behind the authenticated backend and disable shared caching. Cross-origin deployments need an explicit approved CORS allowlist, credentials, CSRF protection and a matching `connect-src` CSP entry in `public/_headers`. An embedded host must supply the same Tailwind/font styles and should keep the `api` prop stable across renders.

Run `npm test`, `npm run lint`, `npm run build`, and `npx playwright test tests/browser/admin-panel.spec.ts --workers=1`. Browser tests use synthetic fixtures and mocked services; production auth-provider, processor, storage, rebuild-worker and export-worker integration still require end-to-end verification after configuration. No live charge, refund, approval or publish was performed.
