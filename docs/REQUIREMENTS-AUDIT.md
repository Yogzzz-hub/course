# Requirements audit — Academy Management Website

Checked against *Academy_Management_Website_Requirements_Combined_Session_Final.pdf* (Updated Master Requirements, developer reference) on 17 October 2026, at commit `48f78b6`.

**Updates:**
- The trainer's combined class-session workflow now exists as a front end at `/trainer-panel`, covering sections 2, 3 and part of 5. See `docs/TRAINER-PANEL.md`. Until `VITE_ACADEMY_API_URL` points at a backend, it runs on a clearly labelled in-browser demo store.
- The student panel now shows those sessions date by date, with both progress figures and the completion state (sections 1–3). See `docs/STUDENT-PANEL.md`. It reads `GET /api/student/class-progress`, which no backend serves yet.

**Status key:** **Done** — built and working in this repo. **Partial** — some of it exists, usually as a front end waiting for a backend. **Missing** — not started.

## Summary

This repository holds the public website, the counselling booking flow, and two front-end portals: a student panel and a sales/finance admin panel. Both portals call APIs (`/api/student/*`, `/api/admin/*`) and a sign-in service that do **not exist in this repo**. The only server code here is the booking programme list and the enquiry endpoint.

The document describes an academy-operations system with five roles (Student, Trainer, Manager, Admin, Financier), batches, a combined class-session entry, automatic progress, certificates, trainer payments and financier reporting. The trainer's class-session entry and the progress rules are now built as a front end with a typed API contract. **There is still no database or backend for any of the operations layer.**

| Area | Status |
| --- | --- |
| 1. Student dashboard | Partial (date-wise sessions, both progress figures and batch schedule built as a front end; login, profile, receipts and certificates missing) |
| 2. Combined class session entry | Partial (front end, rules and API contract done, and shown on the student dashboard; backend missing) |
| 3. Automatic attendance and syllabus progress | Partial (calculated in the trainer and student panels from the same rules; server-side calculation and admin approval missing) |
| 4. Student schedule preference | Partial (batch schedule type and student preference in the data model; no admission or allocation screens) |
| 5. Trainer dashboard | Partial (allocated batches, session entry, student progress; no sign-in, profile or transactions) |
| 6. Manager dashboard | Missing |
| 7. Admin dashboard — critical approvals | Partial (finance/discount approvals, audit, permissions; no academy approvals) |
| 8. Financier dashboard | Partial (ledger, proofs, refunds inside the admin panel; no financier role) |
| 9. Shared workflows | Missing (student payment partial) |
| 10. Reports, security and technical | Partial (front-end safeguards; backend absent) |

## 1. Student dashboard — Partial

| Requirement | Status | Evidence |
| --- | --- | --- |
| Login with registered phone or email plus OTP | Missing | `src/pages/SignIn.tsx` states the authentication service is not connected. OTP exists only for verifying an email during counselling booking (`src/components/public-booking/VerificationStep.tsx`). |
| View course, syllabus, duration, batch number, trainer, confirmed schedule, fee structure, payment history and receipts | Partial | Schedule's **Your batch** card shows the batch number, course, duration and confirmed schedule (class days, times, start and end dates) from `GET /class-progress` (`student-panel/ClassSessions.tsx`). Payments shows instalments (`paymentsSchema`); packages show fee lines. Still missing: the trainer, a full syllabus view (only covered subtopics are listed) and a receipt list. |
| Date-wise class sessions with attendance status, topics/subtopics, attendance progress and syllabus progress | Done (front end) | Schedule's **Class sessions** card lists every scheduled date and any extra class. Each shows the student's own Present/Absent/Leave, the session's start and end time, and the topics and subtopics covered. A date with no session shows "Attendance not submitted", never Absent. Home and Schedule show attendance progress and syllabus progress separately, with the completion state. Both reuse `scheduledDates`, `dayStatus`, `attendanceProgress`, `syllabusProgress` and `completionStatus`. The payload is Zod-validated (`classProgressSchema`) and rejects any response carrying another student's data. Backend missing. |
| Edit permitted personal details; registration no., batch, course allocation and fees read-only | Missing | No profile screen. |
| View/download e-certificate after trainer confirmation and admin approval | Missing | No certificate data or screen. |

## 2. Combined class session entry (attendance + topics) — Partial

| Requirement | Status | Evidence |
| --- | --- | --- |
| Assigned batches only; date and start/end time | Done (front end) | Batch tabs in `academy/TrainerPanel.tsx`; `validateClassSession` in `academy/rules.ts` checks the assignment and that the end is after the start. |
| Present / Absent / Leave for every student | Done (front end) | Segmented radio group per student and **Mark everyone present** in `academy/ClassSessionForm.tsx`; every student must be marked once. |
| Topic and multiple subtopics from the approved syllabus | Done (front end) | Subtopics grouped by module, from `course.syllabus` (`syllabusStatus: "approved"`); unknown subtopics are rejected. |
| Submit once; record locked | Done (front end) | A review step, then **Submit and lock**, with an idempotency key; stored sessions are `locked: true` and have no edit path. |
| Duplicate prevention (batch + date + time) | Done (front end) | Same batch, date and start time is refused (409); overlapping times are refused. |
| Today/yesterday only, authorised backdating, future locked | Done (front end) | `dateAccess` / `permittedDates`, read in Asia/Kolkata; a backdate grant is used up by one session. Grants are read from the workspace; there is no screen to issue them yet. |
| Missing class shows "Attendance Not Submitted", not Absent | Done (front end) | `dayStatus` / `missingAttendanceDates`; shown in the batch summary and the session record. |
| Sessions shown on the student dashboard | Done (front end) | Student panel Schedule tab, date by date, read from `GET /api/student/class-progress` (`docs/STUDENT-PANEL.md`). The server must narrow the trainer's records to the signed-in student. |
| Server-side enforcement and storage | Missing | No backend; the HTTP adapter and contract are ready (`academy/api.ts`, `contracts.ts`). |

## 3. Automatic attendance and syllabus progress — Partial

Done in the trainer and student panels, from the same rules (`academy/rules.ts`, covered by `tests/academy-rules.test.ts` and `tests/student-class-progress.test.ts`):
- attendance progress = Present ÷ all scheduled classes × 100;
- syllabus progress = approved subtopics recorded in submitted sessions ÷ total, unweighted;
- both are recalculated after each submission and shown separately for each student;
- students see both figures on their dashboard, with the completion state ("Awaiting admin approval" once a request exists);
- completion can be sent for admin approval only at 100% / 100%.

Still missing:
- server-side calculation;
- the admin approval of completion requests.

## 4. Student schedule preference — Missing

The booking form records weekly learning hours and a preferred start date (`public-booking/AboutYouStep.tsx`, `PreSessionBriefStep.tsx`), not a Weekdays/Weekends/Flexible preference. There are no batches, so no batch schedule type, class days, times, start/end dates, preference-aware assignment, allocation history, or "student cannot change batch" rule.

## 5. Trainer dashboard — Missing

No trainer login (username/password, temporary password, forced first-login change, OTP recovery), profile, specialisation, allocated batches/students, session submission, student progress view or own transactions.

## 6. Manager dashboard — Missing

No manager role: schedules, admission follow-ups, batch monitoring, missing-attendance alerts, backdated-access review, delegated allocation rights, or the limits on approvals.

## 7. Admin dashboard — critical approvals — Partial

| Requirement | Status | Evidence |
| --- | --- | --- |
| Create/disable accounts and manage permissions for all roles | Missing | Admin permissions come from the server session (`admin-panel/permissions.ts`); there is no account-management screen. |
| Approve course/syllabus structure and weights | Missing | Programme pricing versions can be drafted and published (`admin-panel/Programmes.tsx`), but there is no syllabus structure or approval. |
| Approve course/batch completion only at 100% attendance and syllabus | Missing | — |
| Authorise e-certificate generation (unique ID + PDF) | Missing | — |
| Approve trainer payment eligibility/amount; approve exceptional refunds and sensitive fee adjustments | Partial | Refund approval is separate from execution, and discounts need a reasoned review that excludes self-approval (`admin-panel/Finance.tsx`, `Offers.tsx`). No trainer payments. |
| Oversee records, audit logs, escalations, critical settings | Partial | Audit trail and timelines (`admin-panel/Audit.tsx`); two-factor admin sessions. No escalation queue or settings area. |

## 8. Financier dashboard — Partial

| Requirement | Status | Evidence |
| --- | --- | --- |
| Record full/partial fee payments, dates, methods, references, receipts; pending balances | Partial | Ledger, captured-payment reconciliation and offline proof review exist in the admin panel's Finance section. No separate financier role and no per-student balance view. |
| Process trainer payments after admin approval; "Paid" only when confirmed | Missing | — |
| Categorised income and expenses; refunds linked to a transaction | Partial | Refunds exist with approval; no income/expense categories. |
| Weekly, monthly and yearly reports exported to PDF or Excel | Partial | Reports with an expiring server-generated export (`admin-panel/Reports.tsx`); no period selection or PDF/Excel choice. |

## 9. Shared workflows

| Workflow | Status |
| --- | --- |
| Admission (create student → record preference → assign course/batch/trainer) | Missing |
| Class (select date/time → attendance → topics → submit once → lock → recalculate) | Partial — complete in the trainer panel's front end; no backend |
| Certificate (100%/100% → trainer confirms → admin approves → e-certificate) | Partial — the trainer can send an eligible student for approval; admin approval and certificates are missing |
| Trainer payment (admin approves → financier pays → shows in trainer dashboard) | Missing |
| Student payment (financier records → balance updates everywhere) | Partial — student payments and the admin ledger exist as front ends only |

## 10. Reports, security and technical requirements — Partial

**Already in place (front end):**
- Every API response is validated with Zod.
- Permissions are re-checked on each render and before each mutation, and financial operations use idempotency keys.
- The secure-cookie and CSRF contract is documented in `docs/ADMIN-PANEL.md`.
- Booking OTP has expiry and resend timing.
- The UI is responsive and covered by accessibility tests (Playwright and axe).

**Missing (backend, not in this repo):**
- the database and backend APIs;
- server-side role enforcement;
- password hashing;
- OTP attempt limits;
- session management;
- duplicate prevention for registrations, batches, sessions and certificates;
- historical allocation records;
- stored audit of session submissions, corrections, syllabus updates, approvals and role changes;
- backups and secure downloads;
- the operations reports (students, trainers, batches, schedules, attendance, syllabus, certificates, fees, trainer payments, income/expenses).

## What completing this needs

1. **A backend and database.** Decide on the stack first; everything below depends on it. A managed Postgres with built-in auth (for example Supabase: phone/email OTP, row-level security for role permissions, storage for receipts and certificates) would cover most of section 10.
2. **Data model:**
   - users and roles;
   - courses, syllabus topics and subtopics;
   - batches with schedules;
   - enrolments with allocation history;
   - class sessions with attendance and topics;
   - fee payments and balances;
   - trainer payments;
   - income and expenses;
   - certificates;
   - the audit log.
3. **Role dashboards:** Trainer (sign-in, profile and transactions; the class session entry is done), Manager, Financier, and the academy parts of Admin (accounts, syllabus approval, completion and certificate approval, trainer payment approval).
4. **Student dashboard additions:** OTP login, trainer, full syllabus view, profile editing, receipts, certificate download. Date-wise sessions, both progress figures and the batch schedule are done as a front end.
5. **Reports and exports:** weekly/monthly/yearly, PDF and Excel; certificate PDFs with unique IDs.
