# Executed QA and release status

**Latest continuation: 18 October 2026.** See [continuation results](./CONTINUATION-2026-10-18.md) for the current learning-platform checks, challenge validation and infrastructure limitations. The 12 October results below are historical; their route counts and dependency findings do not describe the latest build.

Tested 12 October 2026, Windows, Node 24, installed Google Chrome. These historical checks cover the Aintrix Academy v2 public website, booking journey, dual-mode Student Panel, Admin Panel and retained pages. Results describe the local production build, not a deployed service. The Lighthouse measurements and older design notes below are historical and predate v2.

## Final executed checks

| Check | Result |
| --- | --- |
| TypeScript | Passed as part of `npm run build` |
| ESLint | `npm run lint` passed without warnings |
| Production build | Passed; fifteen prerendered routes plus a static 404; student and admin routes contain only private loading shells; local demo modules and sample data are excluded |
| Unit / endpoint tests | `npm test`: 57 passed, including supplied course fees, exact package savings, safe integer formatting, invalid/empty pricing, checkout intent, Admin Panel contracts/security and local demo read-only checks |
| Browser tests | Final `npx playwright test --workers=1`: 102 passed in 2.9 minutes, zero failures or skips (including seven course-fee/checkout checks and seven shared-palette/local-demo checks) |
| Shared palettes | All four palettes passed accessibility checks on the homepage, Contact, authenticated Student Panel and Admin Panel; selections persist across navigation and reloads, and survive component remounts with storage blocked |
| Local demo | Explicit opt-in on the development Student Panel, Prospect/Enrolled mode controls, sample-data banner, rejected writes without network traffic, exit to real session service, and no production demo entry verified |
| Sign-in routes | Student and admin sign-in destination pages render successfully, remain noindex, and explain the missing authentication integration; unknown routes retain a genuine 404 |
| Course fees module | All eleven course fees, ₹1,57,000 total, three package prices/inclusions, exact savings, keyboard tabs, retained selection, server-priced checkout, unavailable-package review, sign-in return intent, async retry and duplicate-click protection passed; all three views passed accessibility checks in all four palettes at 320–1440px |
| Admin Panel | Two-factor gate and expiry, permission revocation, Kanban dragging/keyboard moves, owner filtering, timeline, independent offer/proof/refund approvals, reconciliation, frozen financial retries and reload recovery, blocked storage, TanStack Table sorting/pagination/filtering, CMS revision conflicts and rebuilds, reports/export, search/notifications, sign-out and render-boundary recovery passed |
| Final Student Panel regression | All 21 existing Student Panel browser checks passed within the final complete run |
| Short-screen sidebar follow-up | Build and lint passed; both modes verified at 1280×400 with keyboard access to collapse/expand and enrolled mentorship, then at 390×640 with five mobile tabs and no horizontal overflow |
| Internal links | `node scripts/check-links.mjs`: 273 links and 41 fragment destinations verified |
| Dependency audit | `npm audit --omit=dev`: 0 reported vulnerabilities. Full audit: 33 development-tooling issues (8 moderate, 24 high, 1 critical); critical package `tar`. Toolchain upgrades remain outstanding and were not force-applied in this UI change |
| Screenshots | Final full run generated 44 public-route captures and two admin captures; visual inspection corrected cramped mobile table columns and search layout |
| Accessibility | Axe scans passed on public routes, Student Panel checkout/dashboard/mentorship and the mobile Admin Panel financial ledger; admin navigation also verified at 390×640 and 1280×400 |

The HTML Playwright report is `playwright-report/index.html`. Screenshots are under `test-results/screenshots/`; both directories are generated and ignored by Git.

## Aintrix Academy v2 checks

Admin Panel checks use synthetic fixtures and mocked services, with no live approvals, captures, refunds or website publishes. Runtime validation checks verified sessions, consistent prices, independent refund approval and safe links; monetary parsing and formatting preserve exact minor units up to the safe integer limit. Financial recovery persists only opaque request IDs and hashes; unresolved or `not_found` outcomes block new financial actions. The server must enforce MFA, current permissions, independent reviewers, durable idempotency and atomic record-version checks. Backend and worker integration remains outstanding; see [ADMIN-PANEL.md](ADMIN-PANEL.md).

Student Panel checks cover authenticated/anonymous shells; all prospect statuses through contract tests; package comparison, exact fees and consent; ambiguous checkout and submission retries; server-verified enrolment with gateway return flags ignored; enrolled classes, progress, deadlines, onboarding and instalments; multipart attachment submission and attempt history; entitlement updates, slot conflicts, uncertain mentor booking recovery and attendance; session expiry and sign-out; private prerendering; resettable render boundaries; mobile/desktop navigation at 320, 390, 768 and 1440px; and accessibility. Providers and student APIs are mocked; no live charges, uploads or appointments were made. The integration contract is in [STUDENT-PANEL.md](STUDENT-PANEL.md).

- Homepage and counselling replacement; preserved package deep links; CMS comparison and extras calculation.
- Personal-field validation and first-error focus; invalid OTP and resend handling; availability loading and empty/unavailable states.
- Full booking; server-clock hold expiry; slot conflicts and hold release; selected time zone passed to the server.
- A failed confirmation remains locked through hold expiry and resolves through status without another booking request.
- Axe accessibility across all four steps, phone/desktop reflow, and a readable no-JavaScript snapshot with booking fields disabled until hydration.
- Shared legacy controls now synchronise themes, tolerate blocked browser storage, honor reduced motion and fit desktop headers. Preference initialization uses a CSP-compatible external script.

## Browser coverage

- All eleven routes: direct navigation, refresh, unique title/description, one main heading, no browser JavaScript errors, valid internal destinations and no empty/hash-only links.
- All ten requested widths on every route: **320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920px**. No horizontal page overflow detected.
- Mobile drawer: open/close, focus containment, initial close-button focus, Escape, focus restoration, scroll lock and automatic close after navigation.
- Curriculum: expand/collapse and readable topics. Individual-course pricing: expand and verify ₹1,57,000 total. Package CTA: selected package preserved in the counselling URL. Browser back navigation verified.
- Enquiry: empty/invalid fields, focus on the first error, consent, unconfigured state, mocked provider error, retry, disabled in-flight submission, verified mocked acceptance and form reset. No real emails were sent.
- 404 response and recovery, active route, keyboard skip link and focus target.
- Reduced motion; landscape/reflow at 844×390, 640×450 and 320×225; emulated phone touch menu and FAQ interaction.
- Static content remains readable with JavaScript disabled. Trailing-slash URLs retain the correct page and metadata.

The narrower reflow checks exercise the viewport widths associated with desktop zoom. They do **not** substitute for a manual native-browser 200%/400% zoom test. Physical devices, Firefox, Safari, screen-reader speech output and live provider flows remain prelaunch checks.

## Historical Lighthouse measurements (before the text/SVG follow-up and v2 replacement)

Lighthouse 13.5.0. Mobile runs used the tool's default simulated mobile throttling; desktop used 1440×1000, 1× CPU and the desktop throttling configuration in `scripts/audit.mjs`. The static preview served compressed HTML/CSS/JS. Raw JSON reports are retained in `docs/audits/`.

| Page / mode | Performance | Accessibility | Best practices | LCP | CLS | Total blocking time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home / mobile | 98 | 100 | 100 | 2.022 s | 0.0000 | 4 ms |
| Programme / mobile | 98 | 100 | 100 | 2.119 s | 0.0000 | 4 ms |
| Home / desktop | 100 | 100 | 100 | 0.516 s | 0.0000 | 0 ms |

The audited pages meet the 2.5-second LCP target in this local run. Lighthouse uses its standard audit environment; active animation behavior was checked separately in the browser suite. Total blocking time is a lab metric, **not INP**; real-user INP and hosted Core Web Vitals have not been measured.

All three SEO scores are 63 because the unapproved build deliberately blocks indexing with robots/noindex. Unique metadata, static body content and route generation are implemented. A confirmed canonical domain, approved brand and reviewed legal text are required before enabling indexing and generating public sitemap entries.

## Earlier refinements made after inspection (historical notes)

- Increased mobile body, form, technology-tag, pricing and supporting-text sizes.
- Preserved the hero's actions above the illustration and added immediate curriculum/counselling access to the programme hero.
- Corrected extensionless local preview routing: each deep link receives its own prerendered HTML, with a real 404 response for unknown routes.
- Preserved the first keyboard Tab for the skip link while focusing headings on client-side route changes.
- Split routes, use the lightweight Motion animation API, preload local fonts and initial route modules, and inline the compact production stylesheet to reduce blocking requests.
- Resolve the initial route before hydration, removing the large transient layout shift caught during the first code-splitting audit. Static rendering now also resolves the route before synchronous rendering, eliminating deferred duplicate page fragments; all ten generated pages were verified.
- Confirmed no final hydration errors in route checks. Earlier Chrome navigation/teardown failures prompted a single-worker run with GPU disabled; the final 34-test report passed without failures or retries.

## Legacy motion enhancement notes

The programme-motion pass adds a four-node SVG signal map, sequential learning-area highlights, seven drawn course-duration arcs, a rotating outer dial, in-view CTA contours and cascading pricing-list hover feedback. All loops are gated by viewport visibility and the shared motion preference. Course duration and prices remain static text.

The text/SVG follow-up adds real-text staggered heading reveals across pages, drawn hero emphasis, SVG plate outlines, orbiting circuit signals, pulsing beacons, and an animated idea/build/iterate process illustration. Two additional browser checks verify text preservation, timing, SVG motion, offscreen suspension and reduced-motion behavior. These enhancements add no media downloads or dependencies. The Lighthouse table above describes the preceding motion build; it has not been rerun for this follow-up.


- Independent floating engineering layers, pointer-driven illustration tilt, drawn connector traces, staggered section entrances and learning-path progression.
- Page entrance transitions, header reading progress, card elevation, button sheen, directional arrows and animated mobile navigation.
- Smooth native details/summary height transitions for curriculum, FAQs and the individual-course fee table. Rapid keyboard toggles preserve the correct state.
- A shared pause/resume control persists across navigation. Device reduced-motion preferences disable decorative motion and respond to setting changes during the visit; server hydration preserves matching initial markup.
- Text entrance effects preserve full opacity for readable contrast during motion. Content remains available without JavaScript; offscreen hero motion pauses.
- Nine dedicated browser checks cover text preservation, SVG signals, programme-map sequencing, duration accuracy, movement, pause/resume, scroll reveals, accordion interruption, reduced-motion loading and live preference changes, drawer focus, and page navigation. Existing accessibility and responsive checks remain enabled.

## Implemented but awaiting external configuration

- Cloudflare enquiry function with validation, origin check, bounded request body, honeypot, Turnstile server verification, best-effort KV rate limits, provider idempotency and success tied to email API acceptance.
- Aintrix Academy direct booking UI with a configurable typed API: email OTP, session holds, pre-session brief, authoritative confirmation and ambiguous-outcome recovery. CMS, OTP delivery and booking endpoints are not connected; see DIRECT-BOOKING.md.
- Dual-mode Student Panel with a configurable authenticated API, hosted payment adapter and server-verified enrolment gate. Sign-in, private storage, student endpoints and provider webhooks are not connected; see STUDENT-PANEL.md.
- Admin Panel with typed HTTP contracts, current permission/MFA gates, independent financial approvals, idempotent recovery, versioned pricing and rebuild hooks, audit and report exports. Auth-provider, admin services, payment processor, private proof storage and build/export workers are not connected; see ADMIN-PANEL.md.
- Environment template, Cloudflare security headers, deployment instructions and indexing controls.

These integrations are not claimed to have delivered a real email, shown live appointment availability or completed a real appointment. The endpoint was exercised with mocked provider responses; the live Cloudflare runtime and configured provider accounts still require verification.

## Awaiting academy approval

The missing `Academy!.pdf`, official brand/contact details, legal text, prerequisites, delivery format, schedule, internship conditions, taxes and payment/refund terms are listed in [CONTENT-AND-LAUNCH.md](CONTENT-AND-LAUNCH.md). The site has not been deployed and is not approved for public launch.
