# Aintrix Academy public website and direct booking

The React entry point is `src/components/public-booking/PublicWebsite.tsx`. It replaces `/` and `/book-session`; `/direct-booking` is an alias. Other academy pages remain available. The counselling route opens at the booking section, and existing `?package=premium` links populate the package field after hydration.

## Reusing the component

```tsx
import { PublicWebsite, createHttpBookingApi } from './components/public-booking';

// Keep the adapter stable across renders. Inject another BookingApi implementation
// when the CMS or booking service uses a different API shape.
const api = createHttpBookingApi('/api/booking');

export default function Website() {
  return <PublicWebsite api={api} academyName="Aintrix Academy" initialTimeZone="Asia/Kolkata" />;
}
```

Optional `initialProgrammes` supplies a CMS snapshot for server rendering. `getProgrammes` refreshes it after hydration. In this repository, `DirectBooking.tsx` supplies the existing brief-derived Python catalogue as a bootstrap snapshot. It is not a connected CMS. Failed refreshes preserve that snapshot with a notice; a successful empty response displays the empty state. The component itself has no hardcoded programme or fee data.

Set `VITE_BOOKING_API_URL` to your API base and rebuild, or replace the adapter. The default is `/api/booking`. No booking backend, OTP mail provider, or live calendar is deployed by this frontend change. Existing `/api/enquiry` handlers do not implement this booking API. Until a backend is connected, attempts fail with an unavailable-service message and cannot report successful verification or booking.

## HTTP contract

All responses use `application/json`, except successful hold release (`204`). Dates use ISO 8601 with `Z` or an explicit UTC offset. `serverNow` is generated when the response is created. IDs and tokens are opaque strings. Full TypeScript contracts are in `types.ts`.

| Method / endpoint | Request | Successful response |
| --- | --- | --- |
| GET `/programmes` | — | `{ programmes: Programme[] }` |
| POST `/otp/send` | `{ about: AboutYou }` | `EmailChallenge` |
| POST `/otp/verify` | `{ challengeId, code }` | `VerifiedEmail` |
| POST `/slots/search` | `{ programmeId, verificationToken }` | `{ slots: Slot[] }` |
| POST `/holds` | `{ slotId, programmeId, verificationToken }` | `SlotHold` |
| POST `/holds/release` | `{ holdId, verificationToken }` | `204` |
| POST `/confirm` | `BookingSubmission` | `BookingReceipt` |
| POST `/status` | `{ requestId, verificationToken }` | `BookingStatus` |

OTP send, hold creation, and confirmation include an `Idempotency-Key` header. Confirmation includes the same key as `requestId` in its body. Retries of unchanged input retain their key; an intentional OTP resend starts a new attempt after a successful send and the server's resend deadline.

Example programme payload:

```json
{
  "programmes": [{
    "id": "python-full-stack",
    "title": "Python Full-Stack Engineering",
    "summary": "Programming, interfaces, databases and deployment.",
    "duration": "7 months",
    "currency": "INR",
    "technologies": ["Python", "React", "PostgreSQL"],
    "feeDisclosure": "Replace with approved tax and package terms.",
    "packages": [{
      "id": "standard",
      "name": "Standard",
      "priceMinor": 5999900,
      "inclusions": [{ "label": "Programme projects", "included": true }]
    }],
    "addons": []
  }]
}
```

Fees use integer minor units: `5999900` is ₹59,999.00. The formatter follows the currency's standard fractional digits (JPY uses whole units). The calculator sums the selected package and published extras; it does not invent discounts or taxes. Omitted inclusions display “Not specified”; explicit `included: false` displays “Not included”. The server resolves final fees from IDs rather than trusting browser totals.

## Required server semantics

- Validate inputs again. Bind the OTP challenge to the submitted details and bind the verified token to that identity and programme. Use secure, hashed, expiring OTP records, bounded verification attempts, resend cooldowns, and delivery rate limits. Never return the code to the client.
- Return available future sessions. Availability is advisory: acquire holds atomically and prevent double booking. Enforce one active hold per verified session; switching a slot atomically replaces an earlier hold. Enforce hold expiry for abandoned requests and closed tabs too.
- Atomically consume an active hold on confirmation. Store idempotency records and booking outcomes durably. Reject changed payloads using an existing key. Success requires a committed booking and returns its actual slot, identity, and reference.
- Definitive `400`, `401`, `403`, `409`, `410`, `422`, or `429` confirmation responses mean no booking was committed. Network failures, malformed success responses, timeouts, and server errors are ambiguous. The client locks the brief and checks `/status` before allowing another booking.
- Status reads are authoritative. `confirmed` includes the receipt; `pending` means the request may still commit; `not-found` guarantees no booking exists and no in-flight attempt can later commit for that key. Permit a bound session to reconcile its existing attempt even if its verification token has expired. A lagging replica must not produce `not-found`.
- Enforce academy launch approval, provider configuration, origin/authentication checks, privacy rules and retention on the server. Tokens and personal details stay in request bodies, not URLs. The UI keeps them only in memory. Configure CORS and CSP `connect-src` if using an external API base.

The countdown uses server time and elapsed monotonic browser time; server validation remains authoritative. UTC slot instants are grouped and formatted in the selected IANA zone. The preferred start date is a programme preference, not another counselling appointment or enrolment confirmation.

## Components and state

- `ProgrammeShowcase`: CMS cards, package comparison and fee calculator.
- `AboutYouStep`, `VerificationStep`, `SlotPickerStep`, `PreSessionBriefStep`: accessible step views.
- `BookingJourney`: progress, selected-programme summary and confirmed receipt.
- `state.ts`: guarded reducer transitions, including unresolved confirmation locking.
- `useBookingJourney.ts`: cancellation, duplicate-click guards, OTP lifetimes, availability, hold expiry/release and reconciliation.
- `api.ts`: HTTP boundary, runtime schema checks, timeouts and error classification.
- `public-booking.css`: isolates Tailwind from legacy unlayered styles. Prerendering includes the route stylesheet so the no-JavaScript snapshot retains its design.

The UI uses labelled fields, first-error focus, keyboard OTP entry/paste/autofill, focused step headings, skeletons, error/empty states and reduced-motion styling. Confirmation requires a matching server receipt, including one recovered by the status endpoint.

## Validation

Run `npm run build`, `npm run lint`, `npm test`, and `npm run test:e2e -- --workers=1`. Unit tests cover reducer guards, unresolved outcomes, fee arithmetic, form validation, real dates, time-zone boundaries and the HTTP parser. Browser tests use intercepted providers; no real emails or bookings are made. Live CMS, email delivery, atomic scheduling, retention and provider behavior require backend integration before launch.
