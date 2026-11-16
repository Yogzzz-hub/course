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
├── frontend/                     # Tier 1: Vite + React SPA (public site, booking, admin/student/financier panels)
│   ├── src/                      # App code: components, pages, data, utils, styles
│   ├── public/                   # Static assets served as-is (favicon, logo, headers)
│   ├── utils/supabase/           # Supabase client/server helpers
│   └── index.html                # SPA entry document
├── backend/                      # Tier 2: API servers, route handlers and domain services
│   ├── server/                   # Node API: app, db, security, judge, worker, manage, migrations/
│   ├── api/                      # Route handlers: booking, enquiry, notify, learning, admin, financier, manager, student, trainer
│   ├── functions/                # Pages-style edge handlers: booking, enquiry, notify
│   ├── worker/                   # Cloudflare Worker entry (wrangler.toml main)
│   └── services/                 # Domain services: auth, booking, finance, payroll, PDFs, Brevo mail, rate limiting
├── db/                           # Tier 3: Database schemas, seeds and local SQLite
│   ├── supabase/                 # Supabase schema with RLS policies
│   ├── schema.prisma             # Prisma schema
│   ├── prisma.ts                 # Prisma client singleton
│   ├── unified_production_schema.sql
│   ├── dev.db                    # Local SQLite database
│   └── seeds/                    # Seed scripts
├── crm/                          # Separate Next.js CRM app (own frontend/, backend/, db/, tests/)
├── tests/                        # Vitest unit/integration tests and Playwright browser suites
├── scripts/                      # Build, start, prerender, seed and maintenance scripts
├── docs/                         # Project documentation and audits
├── Dockerfile                    # Production container (build + start)
├── docker-compose.yml            # Local / VPS deployment
├── vercel.json, railway.json, render.yaml, wrangler.toml   # Platform deployment configs
└── package.json                  # Dependencies and build scripts
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
