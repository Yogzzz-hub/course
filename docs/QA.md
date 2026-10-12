# Executed QA and release status

Tested 10?11 October 2026, Windows, Node 24, installed Google Chrome. Results below describe the local production build, not a deployed service.

## Final executed checks

| Check | Result |
| --- | --- |
| TypeScript | Passed as part of `npm run build` |
| ESLint | `npm run lint` passed without warnings |
| Production build | Passed; ten prerendered routes plus a static 404 |
| Unit / endpoint tests | `npm test`: 13 passed |
| Browser tests | `npm run test:e2e -- --workers=1`: 34 passed in 1.0 minute, zero failures or skips (including nine motion checks) |
| Internal links | `node scripts/check-links.mjs`: 319 links and 35 fragment destinations verified |
| Dependency install audit | 0 reported vulnerabilities at installation time; this is a point-in-time dependency check, not a security certification |
| Screenshots | 40 captures: viewport and full-page images for all ten routes at 390px and 1440px |
| Accessibility | Axe WCAG A/AA scans passed on home, programme details, learning experience, contact and booking pages |

The HTML Playwright report is `playwright-report/index.html`. Screenshots are under `test-results/screenshots/`; both directories are generated and ignored by Git.

## Browser coverage

- All ten routes: direct navigation, refresh, unique title/description, one main heading, no browser JavaScript errors, valid internal destinations and no empty/hash-only links.
- All ten requested widths on every route: **320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920px**. No horizontal page overflow detected.
- Mobile drawer: open/close, focus containment, initial close-button focus, Escape, focus restoration, scroll lock and automatic close after navigation.
- Curriculum: expand/collapse and readable topics. Individual-course pricing: expand and verify ₹1,57,000 total. Package CTA: selected package preserved in the counselling URL. Browser back navigation verified.
- Enquiry: empty/invalid fields, focus on the first error, consent, unconfigured state, mocked provider error, retry, disabled in-flight submission, verified mocked acceptance and form reset. No real emails were sent.
- 404 response and recovery, active route, keyboard skip link and focus target.
- Reduced motion; landscape/reflow at 844×390, 640×450 and 320×225; emulated phone touch menu and FAQ interaction.
- Static content remains readable with JavaScript disabled. Trailing-slash URLs retain the correct page and metadata.

The narrower reflow checks exercise the viewport widths associated with desktop zoom. They do **not** substitute for a manual native-browser 200%/400% zoom test. Physical devices, Firefox, Safari, screen-reader speech output and live provider flows remain prelaunch checks.

## Local Lighthouse measurements (before the text/SVG follow-up)

Lighthouse 13.5.0. Mobile runs used the tool's default simulated mobile throttling; desktop used 1440×1000, 1× CPU and the desktop throttling configuration in `scripts/audit.mjs`. The static preview served compressed HTML/CSS/JS. Raw JSON reports are retained in `docs/audits/`.

| Page / mode | Performance | Accessibility | Best practices | LCP | CLS | Total blocking time |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home / mobile | 98 | 100 | 100 | 2.022 s | 0.0000 | 4 ms |
| Programme / mobile | 98 | 100 | 100 | 2.119 s | 0.0000 | 4 ms |
| Home / desktop | 100 | 100 | 100 | 0.516 s | 0.0000 | 0 ms |

The audited pages meet the 2.5-second LCP target in this local run. Lighthouse uses its standard audit environment; active animation behavior was checked separately in the browser suite. Total blocking time is a lab metric, **not INP**; real-user INP and hosted Core Web Vitals have not been measured.

All three SEO scores are 63 because the unapproved build deliberately blocks indexing with robots/noindex. Unique metadata, static body content and route generation are implemented. A confirmed canonical domain, approved brand and reviewed legal text are required before enabling indexing and generating public sitemap entries.

## Refinements made after inspection

- Increased mobile body, form, technology-tag, pricing and supporting-text sizes.
- Preserved the hero's actions above the illustration and added immediate curriculum/counselling access to the programme hero.
- Corrected extensionless local preview routing: each deep link receives its own prerendered HTML, with a real 404 response for unknown routes.
- Preserved the first keyboard Tab for the skip link while focusing headings on client-side route changes.
- Split routes, use the lightweight Motion animation API, preload local fonts and initial route modules, and inline the compact production stylesheet to reduce blocking requests.
- Resolve the initial route before hydration, removing the large transient layout shift caught during the first code-splitting audit. Static rendering now also resolves the route before synchronous rendering, eliminating deferred duplicate page fragments; all ten generated pages were verified.
- Confirmed no final hydration errors in route checks. Earlier Chrome navigation/teardown failures prompted a single-worker run with GPU disabled; the final 34-test report passed without failures or retries.

## Motion enhancement

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
- Calendly scheduler loaded by visitor action, with a direct-provider fallback and no fabricated booking confirmation.
- Environment template, Cloudflare security headers, deployment instructions and indexing controls.

These integrations are not claimed to have delivered a real email, shown live appointment availability or completed a real appointment. The endpoint was exercised with mocked provider responses; the live Cloudflare runtime and configured provider accounts still require verification.

## Awaiting academy approval

The missing `Academy!.pdf`, official brand/contact details, legal text, prerequisites, delivery format, schedule, internship conditions, taxes and payment/refund terms are listed in [CONTENT-AND-LAUNCH.md](CONTENT-AND-LAUNCH.md). The site has not been deployed and is not approved for public launch.
