# 🏛️ Apex Global Academy — Unified Full-Stack Academy & Enterprise CRM

A production-grade, unified full-stack web application combining the **Academy Public Course Website**, **1-on-1 Admissions Booking Engine**, and **Enterprise Academy Management CRM** into a single, high-performance hosting target.

---

## 📑 Architectural Highlights

- **Single-Hosting Architecture**: Both public-facing course pages and protected multi-role CRM portals run in a single Next.js 15 engine, eliminating cross-origin latency, dual-server maintenance, and CORS issues.
- **Clean 3-Tier Structuring**:
  - `frontend/` — UI components, design system tokens, responsive navigation, dashboard shells, and modals.
  - `backend/` — 58+ REST API routes, domain services (auth, Brevo email, booking, double-entry finance, attendance, payroll, certificate issuance, PDF generation).
  - `db/` — Relational Prisma ORM schema (86 models), embedded SQLite (WAL mode) / PostgreSQL ready, and automated seed scripts.
- **Sub-Millisecond Fast Redirections**: Instant server-level HTTP 307/308 redirects and Next.js Edge Middleware for role routing (`/crm` ➔ `/login`, authenticated users ➔ role dashboards, `/programmes` ➔ `/courses`).
- **1-Click Hosting Ready**: Native configurations for **Vercel**, **Docker / Docker Compose**, **Railway**, and **Render**.

---

## 📁 Repository Directory Structure

```text
.
├── frontend/                     # Tier 1: User Interfaces & Presentation
│   ├── components/
│   │   ├── layout/               # PublicNavbar, PublicFooter, DashboardShell, Sidebar
│   │   ├── ui/                   # Button, Modal, DataTable, MetricCard, Toast, CourseCard, etc.
│   │   └── public/               # Landing hero, enquiry banners, admissions modals
│   ├── hooks/                    # Client state hooks
│   └── styles/                   # Design system tokens (Burgundy #6D1A2B, Gold #C9A24B) & globals.css
│
├── backend/                      # Tier 2: Domain Services & Backend Business Logic
│   ├── services/
│   │   ├── auth.ts               # HS256 JWT tokens, bcrypt password hashing, session cookies
│   │   ├── brevo-mail.ts         # Brevo transactional API & SMTP mailer with executive email templates
│   │   ├── booking.ts            # 1-on-1 booking engine, OTP verification & lead ingestion
│   │   ├── finance.ts            # Double-entry ledger, tuition calculations & fee allocations
│   │   ├── payroll.ts            # Trainer compensation calculations & payout workflows
│   │   ├── attendance.ts         # Held-to-date attendance computation engine
│   │   ├── progress.ts           # Syllabus coverage & academic tracking
│   │   ├── certificate.ts        # SHA-256 cryptographic certificate issuance & public verification
│   │   ├── pdf-invoice.ts        # Vectorized PDF invoice generator (PDFKit)
│   │   ├── pdf-receipt.ts        # Vectorized PDF receipt generator (PDFKit)
│   │   ├── rate-limit.ts         # Sliding-window rate limiter
│   │   └── audit.ts              # Immutable security audit trail
│   ├── api/                      # Backend API route logic
│   └── middleware/               # Edge auth verification & route guards
│
├── db/                           # Tier 3: Persistence & Database Layer
│   ├── schema.prisma             # Unified Prisma Schema (SQLite + PostgreSQL ready)
│   ├── prisma.ts                 # Type-safe Prisma Client Singleton (WAL mode, cache_size = 10000)
│   ├── dev.db                    # Embedded SQLite Database (ready for 0-config local & single-server hosting)
│   └── seeds/
│       └── seed.mjs              # Automated database seeder (demo users, courses, batches)
│
├── src/                          # Next.js App Router (Single-Hosting Route Layer)
│   ├── app/
│   │   ├── (public)/             # /, /about, /contact, /courses, /courses/[slug], /book-session, /verify-certificate
│   │   ├── (auth)/               # /login
│   │   ├── admin/                # Executive Academy Administration (21 dashboards & APIs)
│   │   ├── manager/              # Operations & Batch Management (11 dashboards & APIs)
│   │   ├── trainer/              # Faculty & Classroom Attendance / Grading (16 dashboards & APIs)
│   │   ├── student/              # Student Portal, LMS, Quizzes, Fees (18 dashboards & APIs)
│   │   ├── financier/            # Tuition Fees, Invoices, Ledger, Payroll (14 dashboards & APIs)
│   │   └── api/                  # 58+ REST API Route Handlers
│   └── middleware.ts             # Edge Middleware for instantaneous role redirections
│
├── tests/                        # 180 Unit, Integration, and Acceptance Tests (Vitest)
├── Dockerfile                    # Production Multi-Stage Docker Container
├── docker-compose.yml            # 1-Command Local / VPS Deployment
├── vercel.json                   # 1-Click Vercel Deployment Configuration
├── railway.json                  # 1-Click Railway Deployment Configuration
├── render.yaml                   # 1-Click Render Deployment Blueprint
└── package.json                  # Unified Dependencies & Build Scripts
```

---

## ⚡ Fast Redirections Map

| Incoming Request | Redirect Destination | Mechanism | Latency |
| :--- | :--- | :--- | :--- |
| `/crm` | `/login` (or user's role portal if authenticated) | Edge Middleware | `< 1ms` |
| `/portal` | `/login` (or user's role portal if authenticated) | Edge Middleware | `< 1ms` |
| `/sign-in`, `/auth/sign-in` | `/login` | `next.config.mjs` (308 Permanent) | `< 1ms` |
| `/programmes` | `/courses` | `next.config.mjs` (308 Permanent) | `< 1ms` |
| `/programmes/:slug` | `/courses/:slug` | `next.config.mjs` (308 Permanent) | `< 1ms` |
| `/direct-booking` | `/book-session` | `next.config.mjs` (308 Permanent) | `< 1ms` |
| Logged-in user at `/` or `/login` | `/admin`, `/manager`, `/trainer`, `/student`, or `/financier` | Edge Middleware JWT verification | `< 3ms` |
| Unauthenticated user at protected portal | `/login?returnUrl=...` | Edge Middleware Guard | `< 2ms` |

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js `20.0.0+`
- npm `10.0.0+`

### 1. Install & Generate
```bash
npm install
npm run db:generate
```

### 2. Seed Database
```bash
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Run Test Suite & Typecheck
```bash
npm test          # Runs all 180 Vitest integration & acceptance tests
npm run typecheck # Strict TypeScript check
npm run build     # Full production build (110 static & dynamic routes)
```

---

## 🔐 Seeded Accounts & Credentials

| Role | Email | Default Password | Assigned Portal |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@apexacademy.edu` | `Admin@123456` | `/admin` |
| **Operations Manager** | `manager@apexacademy.edu` | `Manager@123456` | `/manager` |
| **Faculty / Trainer** | `trainer@apexacademy.edu` | `Trainer@123456` | `/trainer` |
| **Bursar / Financier** | `financier@apexacademy.edu` | `Financier@123456` | `/financier` |
| **Enrolled Student** | `student@apexacademy.edu` | `Student@123456` | `/student` |

---

## 🌐 1-Click Deployment Guide (Single Hosting)

### Option 1: Vercel (Recommended)
1. Push this repository to GitHub.
2. Sign in to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select this repository. Vercel automatically detects `vercel.json` and Next.js.
4. Add environment variables:
   - `JWT_SECRET`: Any random 64-character secret key.
   - `DATABASE_URL`: `file:./db/dev.db` (or a hosted PostgreSQL database from Supabase/Neon).
5. Click **Deploy**. Your unified app is live with automatic SSL!

### Option 2: Docker / VPS Self-Hosting
Run on any Ubuntu, Debian, or cloud VPS with 1 command:
```bash
docker compose up -d --build
```
The app runs on `http://your-server-ip:3000`.

### Option 3: Railway
1. Create a **New Project** on [railway.app](https://railway.app).
2. Choose **Deploy from GitHub Repo**.
3. Railway automatically detects `railway.json`, provisions the build, and deploys.

### Option 4: Render
1. Go to [render.com](https://render.com) and click **New ➔ Blueprint**.
2. Connect this repository; Render uses `render.yaml` to configure the service.

---

## 🛡️ License & Attribution
© 2026 Apex Global Academy. All rights reserved.
