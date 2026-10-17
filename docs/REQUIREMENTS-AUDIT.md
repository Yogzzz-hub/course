# Requirements audit — Academy Management Website

Checked against *Academy_Management_Website_Requirements_Combined_Session_Final.pdf* (Updated Master Requirements, developer reference) on 17 October 2026, at commit `48f78b6`.

**Status key:** **Done** — built and working in this repo. **Partial** — some of it exists, usually as a front end waiting for a backend. **Missing** — not started.

## Summary

This repository holds the public website, the counselling booking flow, and two front-end portals: a student panel and a sales/finance admin panel. Both portals call APIs (`/api/student/*`, `/api/admin/*`) and a sign-in service that do **not exist in this repo**. The only server code here is the booking programme list and the enquiry endpoint.

The document describes an academy-operations system with five roles (Student, Trainer, Manager, Admin, Financier), batches, a combined class-session entry, automatic progress, certificates, trainer payments and financier reporting. **None of that operations layer is built yet, and there is no database or backend for it.**

| Area | Status |
| --- | --- |
| 1. Student dashboard | Partial (UI shell only; most fields missing) |
| 2. Combined class session entry | Missing |
| 3. Automatic attendance and syllabus progress | Missing |
| 4. Student schedule preference | Missing |
| 5. Trainer dashboard | Missing |
| 6. Manager dashboard | Missing |
| 7. Admin dashboard — critical approvals | Partial (finance/discount approvals, audit, permissions; no academy approvals) |
| 8. Financier dashboard | Partial (ledger, proofs, refunds inside the admin panel; no financier role) |
| 9. Shared workflows | Missing (student payment partial) |
| 10. Reports, security and technical | Partial (front-end safeguards; backend absent) |

## 1. Student dashboard — Partial

| Requirement | Status | Evidence |
| --- | --- | --- |
| Login with registered phone or email plus OTP | Missing | `src/pages/SignIn.tsx` states the authentication service is not connected. OTP exists only for verifying an email during counselling booking (`src/components/public-booking/VerificationStep.tsx`). |
| View course, syllabus, duration, batch number, trainer, confirmed schedule, fee structure, payment history and receipts | Partial | Enrolled dashboard shows classes, deadlines, module progress and onboarding (`student-panel/Enrolled.tsx`); payments shows instalments (`paymentsSchema`); packages show fee lines. No batch number, trainer, confirmed schedule, syllabus view or receipt list. |
| Date-wise class sessions with attendance status, topics/subtopics, attendance progress and syllabus progress | Missing | Only mentorship bookings carry per-class attendance (`mentorshipSchema.attendance`). No class-session records, topics or the two progress figures. |
| Edit permitted personal details; registration no., batch, course allocation and fees read-only | Missing | No profile screen. |
| View/download e-certificate after trainer confirmation and admin approval | Missing | No certificate data or screen. |

## 2. Combined class session entry (attendance + topics) — Missing

No trainer role, form, API or data model. None of these exist: batch/date selection limited to assigned batches and permitted dates, start/end time validation, Present/Absent/Leave per student, topic and multi-subtopic selection from the approved syllabus, single submit, record locking, duplicate prevention, today/yesterday-only entry with authorised backdating, future dates locked, "Attendance Not Submitted" state, sessions shown in the student dashboard.

## 3. Automatic attendance and syllabus progress — Missing

No calculation exists. The student dashboard displays a progress value supplied by the (absent) API. Missing: attendance progress = Present ÷ scheduled × 100; syllabus progress from topics recorded in submitted sessions; recalculation on submit; separate display of both values; completion eligibility only at 100% / 100%.

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
| Class (select date/time → attendance → topics → submit once → lock → recalculate) | Missing |
| Certificate (100%/100% → trainer confirms → admin approves → e-certificate) | Missing |
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
3. **Role dashboards:** Trainer (with the class session entry), Manager, Financier, and the academy parts of Admin (accounts, syllabus approval, completion and certificate approval, trainer payment approval).
4. **Student dashboard additions:** OTP login, batch/trainer/schedule, date-wise sessions, both progress figures, profile editing, receipts, certificate download.
5. **Reports and exports:** weekly/monthly/yearly, PDF and Excel; certificate PDFs with unique IDs.
