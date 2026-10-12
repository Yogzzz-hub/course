# Shadow Sphere v2 Student Panel

The reusable `StudentPanel` component is integrated at `/student-panel`. It uses React, strict TypeScript, Tailwind, Lucide and TanStack Query v5. The HTTP adapter validates every response with Zod. No student records, enrolments, payments or uploads are simulated in the production visitor build. A development-only, explicitly selected local demo uses synthetic data in `src/dev/`; every mutation rejects locally and its gateway cannot open a payment page. It is excluded from production bundles. Test fixtures remain separate.

## Integration

```tsx
import {
  StudentPanel,
  createHttpStudentApi,
  createHostedPaymentGateway,
} from "./components/student-panel";

// Keep these adapters stable across renders.
const api = createHttpStudentApi({ baseUrl: "/api/student" });
const gateway = createHostedPaymentGateway(["https://your-provider.example"]);

export function StudentWorkspace() {
  return (
    <StudentPanel
      api={api}
      gateway={gateway}
      signInUrl="/auth/sign-in?returnTo=%2Fstudent-panel"
      supportUrl="/contact"
      academyName="Shadow Sphere"
    />
  );
}
```

The route accepts `VITE_STUDENT_API_URL`, `VITE_STUDENT_SIGN_IN_URL` and comma-separated `VITE_PAYMENT_GATEWAY_ORIGINS`. The default API is `/api/student`; the default sign-in URL is `/auth/sign-in?returnTo=%2Fstudent-panel`. The built-in sign-in page explains that authentication must be connected; it does not collect credentials. Set the sign-in URL to your backend or identity provider's login entry point. This repository does not implement login or a student backend. For local development, `VITE_DEV_API_PROXY_TARGET` forwards `/api/*` to your backend; without it, Vite returns an explicit JSON 503. Payment origins must be approved HTTPS provider origins. An empty allowlist blocks checkout redirects and shows a recoverable configuration message.

All panel screens and session states use the same four palettes as the public website. Palette selection is global and persists in `academy-theme` when browser storage is available.

The gateway adapter redirects to a server-created hosted checkout. It never collects card details or asserts payment success. A different integration can implement `PaymentGateway.open(order)`, while retaining server order verification. Provider secrets and webhook credentials belong exclusively on the server.

For a cross-origin API, explicitly configure its origin in the deployed CSP `connect-src`, enable credentialed CORS for the exact frontend origin, and configure the cookie policy. The supplied CSP permits same-origin APIs. Hosted top-level checkout redirects need no provider script or iframe permissions.

## HTTP contract

The authoritative DTO schemas and TypeScript interfaces are in `src/components/student-panel/contracts.ts`. All endpoints below are relative to the configured base. Successful responses are JSON except logout, which returns HTTP 204. Every protected response must use `Cache-Control: no-store`. Money uses safe integer minor units and a three-letter currency; formatting follows the currency's decimal exponent. All timestamps are ISO 8601 with an explicit offset.

| Method | Endpoint                       | Response                                                                 |
| ------ | ------------------------------ | ------------------------------------------------------------------------ |
| GET    | `/session`                     | `{ session: StudentSession \| null }`                                    |
| GET    | `/learning-plan`               | `LearningPlan \| null`                                                   |
| GET    | `/sessions`                    | `{ sessions: CounsellingSession[] }`                                     |
| GET    | `/dashboard`                   | `Dashboard` with next class, schedule, deadlines, modules and onboarding |
| GET    | `/assignments`                 | `{ assignments: Assignment[] }`, including rubric and attempt history    |
| GET    | `/mentorship`                  | `Mentorship` with entitlement, bookings and attendance                   |
| GET    | `/mentorship/slots?timeZone=…` | `{ slots: MentorshipSlot[] }`                                            |
| GET    | `/payments`                    | `Payments` with currency and instalment schedule                         |
| GET    | `/orders/:id`                  | `PaymentOrder`                                                           |
| POST   | `/checkout`                    | `PaymentOrder`                                                           |
| POST   | `/instalments/:id/checkout`    | `PaymentOrder`                                                           |
| POST   | `/assignments/:id/submissions` | Updated `Assignment`                                                     |
| POST   | `/mentorship/bookings`         | Updated `Mentorship`                                                     |
| POST   | `/onboarding/:id/complete`     | Updated `Dashboard`                                                      |
| POST   | `/logout`                      | HTTP 204                                                                 |

Reads pass TanStack's `AbortSignal` to fetch and have a bounded timeout. Transient read failures retry once; contract, permission, validation and conflict failures do not retry automatically. Mutations never retry automatically. Mutations use cookie authentication, `X-CSRF-Token` from the authenticated session, and an `Idempotency-Key` UUID.

`StudentSession` is a discriminated union. A prospect includes `leadStatus` (`new`, `counselling_booked`, `counselling_complete`, `plan_ready`, `payment_pending`) and nullable `pendingOrderId`. An enrolled session includes `enrolmentId`, `programme`, and `payment: { status: 'verified', orderId, verifiedAt }`. Both modes include `userId`, `cacheKey`, `name`, `email` and `csrfToken`. Rotate `cacheKey` between login sessions and account changes. Never return enrolled mode without authoritative verified payment and a committed enrolment.

The lead status drives the next-step card. Prospect navigation provides counselling sessions, personalised learning plan and checkout. Enrolled queries are enabled only after an enrolled session is returned. The component owns an isolated QueryClient, scopes private queries by session and mode, evicts a previous account's data and clears private views on HTTP 401 or sign-out. No sensitive query data is persisted to browser storage. Session queries refresh on focus and every 30 seconds. An active payment status is checked every four seconds; terminal status refreshes the session and payment history.

### Checkout and verified enrolment

`POST /checkout` receives:

```ts
{
  planId, planVersion, packageId, termsVersion,
  consent: true,
  expectedAmountMinor, currency,
  billing: { name, email, address, city, postalCode, country }
}
```

Look up the authenticated student's immutable quote and terms version on the server. Recompute fees from that quote, validate expiry and consent, and reject stale versions or mismatched expected amounts with HTTP 409. Client prices are comparison guards, never the source of the charged amount. Fee lines must add to the total; `dueNowMinor` cannot exceed it. The adapter rejects an order whose amount or currency differs from the reviewed quote.

Return an order with `id`, `status` (`pending`, `verified`, `failed`, `cancelled`), `amountMinor`, `currency`, nullable `checkoutUrl`, `expiresAt` and nullable `receiptUrl`. A pending hosted link must be an unexpired HTTPS URL on the configured allowlist. The server must return the owned order on `/orders/:id` and include an active enrolment order in `session.pendingOrderId`, allowing recovery after reload or returning from the provider. Clear a prospect's pending order reference after a terminal failed/cancelled order so a new order can be reviewed. For instalments, return `pendingOrderId` (nullable, omitted values default to null) alongside the payment row so the student can resume or inspect a pending checkout after reload. Processing instalments refresh every four seconds and must reconcile to `paid` or `due`; clear the pending reference when terminal and do not create a second active order for an instalment.

Verify the provider's signed webhook or server-to-server payment result. Check merchant, order, amount, currency and paid/captured state. Commit payment and enrolment atomically, handle duplicate/out-of-order events idempotently, and only then return an enrolled session. Neither URL flags nor a browser gateway callback unlock the panel. A verified order with a delayed enrolment leaves the prospect in a waiting state until the session becomes enrolled.

Idempotency must be scoped to the authenticated user and endpoint. Return the stored result for an identical key and payload before checking current quote expiry, attempt limits or entitlement. Reject reuse with a different payload. Ambiguous checkout, upload and mentor booking responses keep their original key and freeze edited inputs for a safe retry. Also enforce one active order per purchase/instalment and one active booking per user/slot, since local component state may be lost during navigation, reload or a browser crash. Authoritative status endpoints and session references must recover those outcomes without another charge.

### Assignments, mentorship and attendance

Submissions use `multipart/form-data`: `repositoryUrl`, `liveUrl` and optional `attachment`. At least one is required. URLs must be HTTPS without embedded credentials. The UI permits non-empty PDF, ZIP, PNG and JPEG files up to 10 MiB. Validate bytes, real file type, size, ownership, deadline and attempt entitlement on the server, scan uploads, and store them privately. Never execute attachments or fetch user URLs without server-side network restrictions. The mutation returns the updated assignment; the list is then refreshed. Attempt history shows submission date, status, links, attachment name, rubric scores and mentor feedback. Server permissions remain authoritative for `canSubmit` and `maxAttempts`.

`POST /mentorship/bookings` receives `{ slotId }`. Atomically check slot availability and `total - used - reserved`, reserve one entitlement and create the booking. Return HTTP 409 for a conflict and the updated aggregate on success. No optimistic decrement is applied. Slot dates and times are grouped in the selected IANA timezone. Attendance is a per-class read-only server record (`present`, `absent`, `excused`, `pending`); students cannot mark themselves present through this UI.

Onboarding completion receives an empty JSON body; the item ID is in the URL. Return the updated dashboard only after recording the change. Class links, terms and receipts accept safe local paths or HTTPS URLs; the UI cannot verify the ownership of a destination, so the backend must only supply approved links.

## Route and validation

The panel uses its own responsive shell, with a collapsible desktop sidebar and five mobile tabs. Query failures offer retry controls, pending queries have accessible skeletons, and empty content has explanatory states. Each screen has a resettable render-error boundary inside the shell, with a root boundary for session/shell failures. Form errors focus the first invalid billing field. Status messages, labelled progress elements and keyboard focus styles support accessible operation.

The prerender contains only a loading shell; it makes no private server requests and embeds no student records. `/student-panel` always uses `noindex, nofollow`, is omitted from the sitemap and is disallowed in production robots. These indexing controls are not authentication: backend endpoint authorization must protect all private reads and writes.

Tests use controlled HTTP fixtures and provider redirects. No real payment, upload or mentorship booking is performed. Run `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e -- --workers=1`. Live authentication, webhook reconciliation, provider sandbox checkout and private upload storage must be connected and verified before release.
