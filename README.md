# Aintrix Academy — Full-Stack Educational Platform

Aintrix Academy is a production-grade full-stack platform featuring public course catalogues, interactive coding assessments, and six dedicated, authenticated role portals (Student, Trainer, Manager, Financier, Admin, Super Admin).

---

## 1. Project Directory Structure

```text
D:\intern\course\
│
├── backend/                       # Python FastAPI Backend API
│   ├── app/
│   │   ├── routers/               # API routes (student, trainer, manager, finance, admin, auth)
│   │   ├── models.py              # SQLAlchemy 2.0 database models (20 tables)
│   │   ├── services.py            # Core business logic (attendance rules, finances, batches)
│   │   ├── db.py                  # Database engine & search_path hooks for schema isolation
│   │   ├── config.py              # Environment variable parser
│   │   ├── deps.py                # Authentication, CSRF guards & session dependencies
│   │   ├── security.py            # Argon2 password hashing & token handling
│   │   └── main.py                # FastAPI application entrypoint
│   ├── tests/                     # Automated pytest test suites
│   ├── Dockerfile                 # Dedicated production container
│   ├── requirements.txt           # Pinned Python package dependencies
│   ├── start-backend.bat          # Windows batch runner for backend
│   └── .env.example               # Example backend environment variables
│
├── src/                           # Frontend Client Application (React 19 + Vite)
│   ├── pages/                     # Public marketing, course & booking pages
│   ├── panels/                    # 6 Authenticated Role Portals:
│   │   ├── student/               # Student panel (classes, recordings, payments, certificates)
│   │   ├── trainer/               # Trainer panel (live timetable, attendance, grading)
│   │   ├── manager/               # Manager panel (programmes, batches, enrollments)
│   │   ├── finance/               # Finance panel (ledger, expense tracking, fee verification)
│   │   ├── admin/                 # Admin panel (user accounts & system audit log)
│   │   ├── superadmin/            # Super admin panel (roles, settings, global override)
│   │   ├── auth/                  # Login page & development role chooser
│   │   ├── PanelShell.tsx         # Unified responsive shell with sidebar & mobile menu
│   │   └── ui.tsx                 # Shared UI components (tables, stat cards, notices)
│   ├── components/                # Reusable design system components
│   ├── config/                    # Academy settings & public URLs
│   ├── data/                      # Route maps & static program catalogues
│   ├── styles/                    # Global CSS & Tailwind stylesheets
│   ├── App.tsx                    # Client-side router & route security guards
│   └── main.tsx                   # React DOM root entrypoint
│
├── database/                      # Database Schemas, Migrations & Seeds
│   ├── schemas/                   # Complete PostgreSQL DDL (academy_schema.sql)
│   ├── migrations/                # Versioned SQL migrations & sequence resets
│   ├── seeds/                     # Baseline seed data (CSV & JSON exports of 20 tables)
│   └── README.md                  # Database documentation & relationship mapping
│
├── lib/                           # Shared Types & Contracts
│   ├── types/                     # Shared TypeScript data models
│   ├── contracts/                 # Formal REST API endpoint definitions
│   └── README.md                  # Library documentation
│
├── deploy/                        # Production Deployment Configurations
│   ├── render.yaml                # Render Web Service config (FastAPI Backend)
│   ├── vercel.json                # Vercel SPA config (Vite Frontend)
│   ├── wrangler.toml              # Cloudflare Pages / Worker config
│   ├── Dockerfile.backend         # Dockerfile for Python backend
│   ├── Dockerfile.frontend        # Dockerfile for React frontend
│   └── README.md                  # Step-by-step cloud deployment runbook
│
├── public/                        # Static browser assets (favicons, robots.txt)
├── start-academy.bat              # One-click launcher for both Frontend & Backend
├── package.json                   # Node.js dependencies & npm scripts
├── vite.config.ts                 # Vite bundler & development proxy settings
└── tsconfig.json                  # TypeScript compiler options
```

---

## 2. Packages & Libraries Used

### Backend (Python 3.11+)
| Package | Version | Purpose / What it Does |
|---|---|---|
| `fastapi` | `0.115.*` | High-performance async web framework for REST API endpoints. |
| `uvicorn[standard]` | `0.32.*` | Lightning-fast ASGI web server hosting the FastAPI application. |
| `sqlalchemy` | `2.0.*` | Modern Python SQL toolkit and Object Relational Mapper (ORM). |
| `pydantic` | `2.14.4` | Data validation and type enforcement for API payloads. |
| `argon2-cffi` | `23.*` | Next-generation cryptographic password hashing algorithm. |
| `python-multipart` | `0.0.*` | Multipart/form-data parser for assignment file uploads. |
| `psycopg[binary]` | `3.*` | Native PostgreSQL driver for direct TCP connections. |
| `psycopg2-binary`| `>=2.9.9`| Standard PostgreSQL adapter for SQLAlchemy connection pooling. |
| `python-dotenv` | `1.0.*` | Loads environment variables from `.env` files automatically. |
| `pytest` | `8.*` | Automated testing framework for unit and integration tests. |
| `httpx` | `0.27.*` | Asynchronous HTTP client for testing API endpoints. |

### Frontend (Node.js 22+)
| Package | Purpose / What it Does |
|---|---|
| `react` & `react-dom` (`^19.0.0`)| Modern React UI library utilizing the latest concurrent features. |
| `react-router-dom` (`^7.0.0`) | Client-side routing for public pages and portal routes. |
| `vite` (`^6.0.0`) | Fast frontend bundler and local development server. |
| `motion` (`^12.0.0`) | Hardware-accelerated UI animations and page transitions. |
| `lucide-react` | Clean, modern SVG icons used across all portals. |
| `@tanstack/react-table` | Headless, accessible table engine for financial and student data. |
| `tailwindcss` | Utility-first CSS framework for responsive layout styling. |
| `typescript` | Static type-checking across all components and API calls. |

---

## 3. How to Install All Dependencies

### Prerequisites
* **Git:** Installed on your computer.
* **Node.js:** Version 22 or newer (`node -v`).
* **Python:** Version 3.11 or newer (`python --version`).

### Step 1: Clone or Fork the Repository
```bash
git clone https://github.com/mkcsboy/course.git
cd course
```

### Step 2: Download Frontend Dependencies
Run this in the project root:
```bash
npm install
```
*This reads `package.json` and downloads all 410 packages into `node_modules/`.*

### Step 3: Download Backend Dependencies
Open your terminal in the `backend/` directory:
```bash
cd backend

# Create a virtual environment (recommended)
python -m venv .venv

# Activate the virtual environment:
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.venv\Scripts\activate.bat
# On macOS / Linux:
source .venv/bin/activate

# Install all backend packages:
pip install -r requirements.txt

# Return to root
cd ..
```

---

## 4. Environment Variables Setup

### Backend Environment ([backend/.env](file:///D:/intern/course/backend/.env))
Create a file named `.env` inside the `backend/` folder (you can copy [backend/.env.example](file:///D:/intern/course/backend/.env.example)):
```ini
APP_ENV=development
# Supabase PostgreSQL Pooler connection string:
DATABASE_URL=postgresql+psycopg2://postgres.<project_ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
COOKIE_SECURE=false
UPLOAD_DIR=./data/uploads
SESSION_HOURS=12
ATTENDANCE_THRESHOLD_PERCENT=60
```

### Frontend Environment ([.env](file:///D:/intern/course/.env))
Create a file named `.env` in the root folder:
```ini
VITE_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

---

## 5. How to Run the Whole Project

### Option A: The One-Click Launcher (Windows)
Double-click [start-academy.bat](file:///D:/intern/course/start-academy.bat) in the project root.
* It launches the FastAPI backend on `http://127.0.0.1:8000`.
* It launches the Vite frontend on `http://127.0.0.1:5173`.

---

### Option B: Using the Terminal (Any Operating System)

#### Terminal 1 — Start the Backend API:
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The API is now running at `http://127.0.0.1:8000` (Interactive Swagger docs: `http://127.0.0.1:8000/docs`).*

#### Terminal 2 — Start the Frontend Website:
```bash
npm run dev
```
*The website is now running at `http://127.0.0.1:5173`.*

---

## 6. Accessing the Portals

Visit `http://127.0.0.1:5173/login` in your browser.  
In development mode (`APP_ENV=development`), click any role button to sign in instantly without needing a password:

| Role | Landing Route | Features |
|---|---|---|
| **Student** | `/app` | Timetable, class links, recordings, payments, assignments, quizzes, certificate. |
| **Trainer** | `/trainer` | Live class host controls, attendance rosters, assignment grading, quiz creation. |
| **Manager** | `/manager` | Course programmes, cohort batches, trainer scheduling, student enrollment. |
| **Financier**| `/finance` | Payment verification, expense logging, unified accounting ledger. |
| **Admin** | `/admin/overview` | User account provisioning and security audit trail logs. |
| **Super Admin** | `/superadmin` | Global multi-role assignment, system rule settings, audit monitoring. |

---

## 7. Running Quality Checks & Tests

```bash
# 1. Run Backend Python Tests
pytest backend/tests

# 2. Run Frontend Production Build
npx vite build
```
