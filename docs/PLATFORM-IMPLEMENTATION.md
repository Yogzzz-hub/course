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

## Continuation — 18 October 2026

Retain the implemented platform and existing integration boundaries. Expand the three-exercise Python bank with conditions, error handling, idempotent backend processing and stack-based algorithms. Add explicit boundary cases and multiple faulty implementations for each exercise. Repair challenge switching so an old submission cannot appear under a different problem, and preserve in-page drafts. Improve fixture-runner diagnostics without introducing an unsafe execution fallback. Run type/lint/unit/build/browser checks and distinguish unavailable PostgreSQL/Docker infrastructure from application failures in the delivery report.

## Continuation — 19 October 2026

Investigate disconnected assessment startup first; provide a combined local API/frontend command with database/migration preflight. Add per-challenge rubric configuration with backward-compatible defaults, authoritative snapshot-based understanding/ranking, and accurate UI denominators. Improve connection-loss messages without automatically retrying mutations. Validate these paths with unit, database and browser suites. Existing external payment, identity, booking and isolated-judge provisioning remain separate production gates.
