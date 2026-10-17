# Trainer Panel — combined class session entry

The trainer workspace at `/trainer-panel` covers sections 2, 3 and part of 5 of the academy requirements:

- allocated batches;
- one combined class-session entry (attendance and topics together, submitted once and locked);
- the two progress figures that entry drives;
- the request that sends a completed course to admin for approval.

It is front end only. There is no backend in this repository yet.

## Running modes

| `VITE_ACADEMY_API_URL` | What `/trainer-panel` uses |
| --- | --- |
| Set (for example `https://api.example.com/academy`) | `createHttpTrainerApi`: real requests with cookies (`credentials: "include"`); every response is validated with Zod. |
| Not set (current state) | `createDemoTrainerApi`: an in-browser store with two sample batches. A **Demo workspace** notice is always shown, submissions stay in the browser tab (`sessionStorage`), and **Reset demo data** restores the seed. |

The demo ships in the production build so the workflow can be reviewed before a backend exists. The page is `noindex`, disallowed in `robots.txt` and left out of the sitemap. Once the API is connected, setting the variable removes the demo from use.

## The workflow

1. **Pick a batch.** The tabs show each allocated batch's schedule and how many past classes have no submitted session.
2. **Pick the class date.**
   - The list only offers dates the trainer may enter: today, yesterday, and earlier dates with a live, unused backdate grant.
   - It opens on the latest scheduled class still waiting for entry. A date that isn't a class day is labelled "extra class".
   - Future dates are never offered.
3. **Set start and end time.** These default to the batch times; the end must be after the start.
4. **Mark attendance.** Each student gets one of Present, Absent or Leave. **Mark everyone present** fills the list in one step, and a live line counts each status.
5. **Select subtopics.**
   - Subtopics come from the course's approved syllabus and can span several modules.
   - Each subtopic shows the date it was first taught.
   - The next untaught module opens by default.
6. **Notes** are optional, up to 1000 characters.
7. **Review class session** checks everything:
   - On failure it shows an error summary, marks each field and moves focus to the first problem.
   - On success it shows a summary.
8. **Submit and lock** saves one record that cannot be edited. Progress is recalculated and focus moves to the confirmation.

## Rules (`src/components/academy/rules.ts`)

These are plain functions. The demo store applies them, and a backend **must enforce the same rules on the server**:

| Rule | Function |
| --- | --- |
| "Today" is read in `Asia/Kolkata`, not the browser's zone | `todayIn` |
| Scheduled dates come from the batch's class days between its start and expected end | `scheduledDates` |
| A past scheduled date with no session is **Attendance not submitted**. It never counts as an absence. | `dayStatus`, `missingAttendanceDates` |
| Attendance % = Present classes ÷ all scheduled classes × 100 (rounded down). Absent and Leave count as not present. | `attendanceProgress` |
| Syllabus % = distinct approved subtopics taught ÷ all subtopics × 100, unweighted | `syllabusProgress` |
| Completion can be requested only at 100% attendance **and** 100% syllabus | `completionStatus` |
| Today and yesterday are open; earlier dates need a live grant, which is used up by one session; future dates are locked | `dateAccess`, `permittedDates` |
| Assigned batch only; one session per batch, date and start time; no overlapping times; every student marked exactly once; at least one approved subtopic; notes ≤ 1000 characters | `validateClassSession` |

## API contract (`src/components/academy/api.ts`, `contracts.ts`)

| Call | Request | Success |
| --- | --- | --- |
| `GET /trainer/workspace` | — | `TrainerWorkspace`: trainer, `today`, batches with students, courses with approved syllabus, sessions, backdate grants, completion requests |
| `POST /trainer/class-sessions` | `ClassSessionInput` body, `Idempotency-Key` header | The stored `ClassSession` (`locked: true`). Repeating the same key returns the same record. |
| `POST /trainer/completion-requests` | `{ batchId, studentId }` | `CompletionRequest` with `status: "pending_admin"` |

Errors are JSON `{ message, fieldErrors? }`, where `fieldErrors` keys are `form`, `classDate`, `startTime`, `endTime`, `attendance`, `subtopics` and `notes`. The panel shows them next to the fields.

| Status | Meaning |
| --- | --- |
| `401` | Signed out. The panel asks the trainer to sign in again. |
| `403` | Not the trainer's batch or student. |
| `409` | A session for this batch, date and start time already exists, or completion was already requested. |
| `422` | Validation failed, or the student is not yet eligible for completion. |

## Files

- `src/components/academy/contracts.ts`: Zod schemas and types.
- `src/components/academy/rules.ts`: date, progress and validation rules.
- `src/components/academy/api.ts`: the `TrainerApi` interface and the HTTP adapter.
- `src/components/academy/demo.ts`: the in-browser demo store. Its seed is built from the programme catalogue.
- `src/components/academy/ClassSessionForm.tsx`: the combined entry form.
- `src/components/academy/TrainerPanel.tsx`: the workspace (batches, summary, entry, student progress, session record).
- `src/components/academy/academy.css`: the scoped reset. The shared portal look comes from `src/styles/portal.css` (`.ss-trainer`).
- `src/pages/TrainerPanel.tsx`: chooses the HTTP or demo adapter.

## Tests

- `tests/academy-rules.test.ts` (Vitest) covers:
  - the calendar and time zone;
  - "not submitted" versus absent;
  - both progress formulas;
  - completion eligibility and the date-access matrix;
  - every validation message;
  - the demo store (idempotency, duplicate rejection, grant use, completion requests, reset).
- `tests/browser/trainer-panel.spec.ts` (Playwright, with the clock fixed to Saturday 17 October 2026) covers:
  - the batch tabs, including the arrow keys;
  - validation and focus, the review step, submit and lock;
  - the record surviving a reload, and duplicate rejection;
  - the completion request;
  - axe scans before and during review.

## Not built yet

- Trainer sign-in.
- Manager and admin approval of backdate grants (grants arrive in the workspace data).
- Admin approval of completion requests and certificates.
- Correcting a locked session.

All of these need the backend. Students already see these sessions and both progress figures on their dashboard; see [STUDENT-PANEL.md](STUDENT-PANEL.md#class-sessions-and-progress).
