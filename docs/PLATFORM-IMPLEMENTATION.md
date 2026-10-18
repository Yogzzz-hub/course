# Learning platform implementation

## Audit and choices

The existing application is React 19, Vite, TypeScript, React Router and prerendered HTML. Retain it, the four palettes, programme catalogue, enquiry flows and student/admin integrations. No database or authentication backend exists. Existing payment and booking clients describe contracts, not working payment/OTP services. Prices and unconfirmed claims remain subject to the existing approval policy.

Add a separate Node API with PostgreSQL, parameterized SQL, migrations, opaque anonymous session cookies and server-authoritative assessments. Keep answer keys outside the client dependency graph. Reuse Zod, Vitest and Playwright. Do not introduce mandatory AI services. New private reports must remain noindex.

## Implementation sequence

1. Database, versioned question bank, authenticated anonymous attempts and deterministic grading.
2. Assessment UI, results, deterministic role roadmaps, existing-course recommendations and consented product events.
3. Coding editor and isolated execution integration, with execution disabled unless explicitly configured and verified.
4. Protected management, question review and measured reporting; extend only after the core flow passes checks.
5. SEO routes, accessibility, regression tests, dependency review and deployment documentation.

Infrastructure gates: PostgreSQL must be reachable; candidate code must never execute in this API. A separate reviewed execution environment is required. Missing integrations must produce explicit unavailable states. This document is a plan, not a claim that every module is implemented or production verified.
