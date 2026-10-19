# Interactive skill discovery — 19 October 2026

The free skill test now covers 12 curriculum-aligned areas: Python, problem solving, SQL, JavaScript, backend, debugging/testing, APIs, HTML/CSS, React, DevOps, AI-assisted development and full-stack integration. This interprets the requested “12 things” as assessment areas; they are not 12 executable programming runtimes.

## Visitor experience

- Explore a 12-card topic map with curiosity prompts, category filters and selectable topic cards.
- Start the recommended 12-question overview or a 3-question focused check in any area. A sticky start control keeps the selected check within reach on mobile. Starting difficulty remains selectable.
- See question progress, readable topic names, reasoning prompts and a clear selected-answer state. Answers are still scored on the server.
- Read a visual result summary and an expandable 12-skill map. Filter areas needing practice, correct answers and untested areas. Untested skills are never displayed as failures.
- Open a card to find a concrete project, try a focused check, or explore the relevant course. A next-experiment suggestion prioritizes observed gaps, then untested areas. It is educational guidance, not a validated career prediction.
- Generate a target-role roadmap with numbered project steps. React, deployment and full-stack integration now participate in relevant role paths; background controls support all 12 areas.
- Return to topic exploration and resume an earlier attempt through the existing saved-attempt controls.

The full check samples just one question per area. Correct answers are labelled as evidence in this sample, never mastery. Different question sets are not directly comparable. Focused results remain independent attempts; no combined proficiency score is fabricated.

## Implementation

Public topic metadata lives in `src/data/skillAreas.ts`; no answer keys enter that module. `SkillExplorer.tsx` contains discovery and results views, with responsive palette-aware styling in `assessment.css`. The existing assessment, roadmap, sharing, consent and contact flows are retained.

The server bank grows from 24 to 36 reviewed questions with beginner/intermediate/advanced coverage for React, DevOps, AI-assisted development and full-stack integration. Existing areas retain their content. `POST /api/learning/attempts` accepts an optional validated `skill`; invalid areas and client-supplied scores remain rejected. Attempt length derives from its immutable bank snapshot, so existing eight-area snapshots still finish at 10 answers. New full checks finish at 12; focused checks finish at 3. No database schema migration is needed. `npm run db:migrate` seeds new question IDs without replacing existing versions.

Vite ignores generated test artifacts, local database files and build outputs. These files were triggering page reloads during browser tests; the first run failed during report revocation while source/artifact changes were occurring. The stable rerun passed.

An unrelated unused `inputClass` import in the existing booking slot picker was removed to restore the lint check; other concurrent booking/layout edits were preserved.

## Validation

- 100 unit tests passed; 11 database integration tests passed separately, including successful focused checks in all 12 areas and full-check coverage.
- Five database-backed learning browser journeys passed, including mobile topic filtering, a deliberately imperfect React result, 11 untested areas, result filtering, expandable project guidance, accessibility scanning and return to saved results.
- TypeScript, lint and production build passed; 36 routes plus 404 prerendered.
- Internal-link check verified 466 links and 22 fragment destinations.
- Desktop and mobile review captures are in ignored `.local/skill-*.png` files.

No production deployment was performed. The standalone Python coding arena still requires the separate secure judge for executing candidate programs. The multi-topic skill checks use deterministic questions and do not depend on that judge. Existing payment, identity and hosted-service release gates remain documented in the operations guide.

## Run

With PostgreSQL running, apply `npm run db:migrate`, then run `npm run dev:learning`. Open `http://127.0.0.1:5173/assessment`. Hosted environments need the same question-bank seeding and a verified deployment before the new experience is available there.
