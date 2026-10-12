# Academy — Learn. Build. Evolve.

A complete responsive informational academy website built with React, TypeScript, Vite, Tailwind CSS, React Router, Motion and Lucide. Burgundy + Soft Silver identity, original SVG artwork and self-hosted Manrope/Space Grotesk fonts.

## Run locally

Requires Node 22.12+ (developed with Node 24).

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. `npm run dev` serves the frontend; Cloudflare Functions require the Cloudflare local runtime or deployment. An unconfigured frontend deliberately does not accept enquiries or invent appointment slots.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run preview
```

After a build, `node scripts/check-links.mjs` checks internal page and fragment destinations.

With the production preview running, `npm run audit:performance` records Lighthouse reports in `docs/audits`. That helper currently targets the standard Windows Chrome installation; adjust `chromePath` for another platform.

Playwright uses the installed Google Chrome channel. Install Chrome or change `channel` in `playwright.config.ts` to an installed browser. Browser tests run a production preview on port 4173. `test-results/screenshots` contains review captures; the generated HTML test report is in `playwright-report`.

If a managed Windows certificate store causes npm trust failures, use `$env:NODE_USE_SYSTEM_CA='1'` for that shell. Do not disable certificate verification.

## Routes

`/`, `/programmes`, `/programmes/python-full-stack`, `/learning-experience`, `/career-support`, `/about`, `/book-session`, `/contact`, `/privacy-policy`, `/terms-and-conditions`, and a useful 404.

All ten routes are prerendered at build time, including titles, descriptions and body content. Route code and animation features load separately. Vite retains React Router navigation after hydration. Cloudflare Pages serves each route's directory index directly; `404.html` supplies real static 404 behavior. Do not add a catch-all 200 rewrite that masks unknown URLs. Build output is `dist/`. The custom local production preview serves the same directory routing, 404s and compressed text assets; plain Vite preview would serve the homepage fallback for extensionless inner-page requests.

## Content and configuration

- `src/config/academy.ts`: brand, contact, provider configuration and unconfirmed business fields.
- `src/data/programmes.ts`: curriculum areas, exact listed fees and package descriptions.
- `src/data/faqs.ts`: brief-derived FAQs (original PDF not supplied).
- `src/data/routes.ts`: navigation and unique metadata.
- `src/components`: reusable navigation, programme/pricing, UI, original art and enquiry components.
- `src/pages`: all content routes; legal pages are clearly marked drafts.
- `functions/api/enquiry.ts`: Cloudflare serverless email endpoint.
- `scripts/prerender.mjs`: static routes, sitemap, robots and 404 generation.

Copy `.env.example` to `.env.local` for public build settings. Never place provider secrets in `VITE_` values. No analytics is enabled without an approved solution. No enquiry data is saved in browser storage.

Search indexing is disabled until a canonical domain, legal approval and brand approval are supplied. Canonicals and structured `WebPage` metadata use the confirmed domain only; no fabricated institutional or Course-offer claims are generated. Legal drafts stay out of the sitemap.

## Cloudflare Pages deployment

1. Push the complete source to your authorised repository and connect it to Cloudflare Pages.
2. Set build command `npm run build`, output directory `dist`, and Node version 24.
3. Set public build variables from `.env.example`. Supply the approved HTTPS custom domain in `VITE_SITE_URL` (no path).
4. Add the server secrets listed in `.env.example` to Pages settings. Bind KV as `ENQUIRY_LIMITS`. Production and preview settings are separate; keep preview collection disabled unless intentionally testing it.
5. Set an edge WAF rate rule on POST `/api/enquiry`. The code also enforces a best-effort five-attempt/hour hashed-IP KV limit and single-use Turnstile validation. KV is not an atomic global rate limiter.
6. Replace legal drafts, confirm provider processing, approve business details and then enable the legal/brand settings. Rebuild after changing any public Vite setting.
7. Deploy from the connected repository or use `npx wrangler pages deploy dist --project-name <your-approved-project>` from this repository root so the sibling `functions/` directory is included. Static file drag-and-drop alone does not deploy the enquiry function.
8. Attach your domain, verify HTTPS and security headers, direct route loading, 404 status, robots and sitemap. Confirm an authorised live email and booking flow.

For full local integration, use the Cloudflare runtime with a ignored `.dev.vars` file containing server values, for example `npx wrangler pages dev dist --kv ENQUIRY_LIMITS`. Configure the allowed local origin and provider test hostname as appropriate. Do not use production user data in tests.

The endpoint validates types and field lengths, caps body size, checks the exact origin, rejects honeypots, verifies Turnstile server-side (including hostname and action), rate-limits attempts, uses Resend idempotency keys, and reports success only after a provider receipt. Email contents are plain text. Enquiry bodies, keys and tokens are never logged by the endpoint. Provider acceptance is not proof that an email reached an inbox; operational monitoring belongs in the configured provider dashboard.

The Calendly iframe loads only after a visitor requests it. The direct provider link remains available if an embed is blocked. A scheduling click or iframe load never produces a booking-success claim in the academy UI. Provider confirmation is authoritative.

## Handover

- [Research and design decisions](docs/RESEARCH.md)
- [Business approvals and external launch setup](docs/CONTENT-AND-LAUNCH.md)
- [Executed QA and limitations](docs/QA.md)

`Academy!.pdf`, official identity/contact details, approved legal text and live credentials were not supplied. The build is prepared for deployment; it is not an approved or deployed production service.
