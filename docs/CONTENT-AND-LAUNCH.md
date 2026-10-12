# Content provenance and launch requirements

The primary PDF `Academy!.pdf` was **not attached**. All programme facts below are transcribed from the user's detailed text brief and have not been independently compared with the PDF. The brief is retained in the user's attachments, not duplicated into public assets.

## Supplied facts implemented

- One flagship Python Full-Stack Software Engineering programme; seven months.
- Eleven course fee entries totaling ₹1,57,000; Standard ₹59,999, Premium ₹79,999, Elite ₹99,999.
- Package inclusions copied in meaning, with the “free internship” and “paid internship” ambiguity disclosed next to the prices.
- Five-step learning method: Understand, Practise, Build, Refine, Prepare.
- Technical learning areas, practical exercises, programme projects, mentorship and career-preparation topics from the brief.
- No invented class times, weekly schedule, contact hours, projects, teachers, partners, testimonials, outcome statistics, accreditation, guarantees or other programmes.

## Business approval required

| Item | Current behavior | Required input |
| --- | --- | --- |
| PDF verification | Text brief is the source | Supply and reconcile the original PDF, including FAQs and precise sequence |
| Brand | “Academy” working title and original A-mark; footer identifies pending approval | Official name, logo approval, legal entity |
| Contact | Unprovided contact channels omitted | Approved email, phone, address if applicable, optional official social profiles |
| Programme | Duration and learning areas shown | Delivery mode, timetable, prerequisites, outcomes and approved assignments |
| Packages | Listed inclusions and fees, no recommended tier | Actual package scope, tax treatment, payment schedules, refund and cancellation terms |
| Internships | Conditional wording adjacent to claims | Eligibility, duration, availability, fees, stipend, employer arrangements |
| Support | Brief-derived services with package caveat | Which services each tier includes and the actual support format |
| Counselling | Unconfigured scheduling state | Event URL, duration, fee if any, capacity, time zones, confirmation and cancellation workflows |
| Legal | Explicit review drafts | Reviewed privacy and terms documents, entity, jurisdiction, retention and rights contact |
| Analytics | None loaded or sent | Approved provider, lawful consent model and event requirements if desired |
| Domain | No invented canonical; indexing disabled | Canonical HTTPS domain and launch approval |

Central unconfirmed values are in `src/config/academy.ts`. Pricing is in `src/data/programmes.ts`. Approved legal text must replace the draft pages before setting legal flags. Do not merely flip flags to remove launch blockers.

## External configuration required

The Student Panel additionally requires authenticated student endpoints, a sign-in route, private upload storage and a payment gateway with verified webhook reconciliation. Follow [STUDENT-PANEL.md](STUDENT-PANEL.md) for the typed API, CSRF, quote/terms versions, idempotency, hosted checkout origins and atomic mentorship entitlement rules. No live student backend or gateway is configured by this build.

1. Implement or connect the CMS and direct-booking endpoints in [DIRECT-BOOKING.md](DIRECT-BOOKING.md). Configure approved email OTP delivery, verification sessions, atomic slot holds, booking confirmation and status recovery. Set `VITE_BOOKING_API_URL` if the base differs from `/api/booking`. Confirm session duration, fees, time zones, cancellations and rescheduling in the actual service. The v2 journey replaces the earlier Calendly embed.
2. Authorise a receiving mailbox, verify a sender domain in Resend and configure its API key and sender/recipient server secrets.
3. Create a Turnstile widget restricted to the production hostname; configure its public site key and private server secret.
4. Bind `ENQUIRY_LIMITS` to a Cloudflare KV namespace. Set a random `RATE_LIMIT_SALT`. The code keeps only hashed abuse/idempotency identifiers with a 24-hour technical TTL, not enquiry bodies. KV is eventually consistent; configure an edge WAF rate rule for strict burst limits.
5. Set an exact `ALLOWED_ORIGIN` (HTTPS origin without trailing slash). After replacing and approving legal text, set server `LEGAL_APPROVED=true` and public `VITE_LEGAL_APPROVED=true`. Set `VITE_BRAND_APPROVED=true` only after brand approval.
6. Deploy to an authorised Cloudflare Pages account; verify live provider behavior. No deployment or live provider transaction has been performed by this build.

## Prelaunch acceptance

- Reconcile the PDF and approve factual copy.
- Replace the legal drafts and confirm provider processing, mailbox retention/access, cancellation and refund terms.
- Verify real appointment availability and a genuine confirmation/reschedule/cancellation flow on a phone and desktop.
- Verify student authentication, account isolation, provider sandbox payment and enrolment transitions, instalment recovery, private uploads and mentor booking conflicts against the live backend.
- Send one authorised enquiry, confirm mailbox receipt, provider failure handling, Turnstile and edge rate policy.
- Run automated checks against the release build, then check physical iOS Safari, Android Chrome and desktop Firefox/Safari, including native zoom and assistive technology.
- Verify the HTTPS custom domain, static direct routes, 404 status, security headers, public canonical, sitemap and indexing configuration.
- Measure hosted performance and real-user CWV. Local lab scores are not field INP or a performance guarantee.
