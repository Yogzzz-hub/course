# Production Deployment Runbook (`deploy/`)

This directory documents how to deploy the **Aintrix Academy** platform into production.

---

## 1. Architecture Overview

* **Database:** **Supabase Cloud** (`qoppatwubfhudpbrhtib`) — Schema: `academy`
* **Backend API:** **Render** (FastAPI / Python 3.12 Web Service)
* **Frontend Client:** **Vercel** / **Cloudflare Pages** (React 19 + Vite SPA)

---

## 2. Deploying the Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository (`mkcsboy/course`).
3. Set the following build and runtime settings:
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In the **Environment** tab, add the environment variables:
   * `DATABASE_URL`: `postgresql+psycopg2://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`
   * `APP_ENV`: `production`
   * `SESSION_SECRET`: `<generated 32+ character random string>`
   * `COOKIE_SECURE`: `true`
   * `SESSION_HOURS`: `12`
   * `ATTENDANCE_THRESHOLD_PERCENT`: `60`
5. Click **Create Web Service**.
6. Once deployed, copy your service URL (e.g., `https://academy-backend.onrender.com`).

---

## 3. Deploying the Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New...** &rarr; **Project**.
2. Select the repository (`mkcsboy/course`).
3. Framework Preset: **Vite**.
4. In the **Environment Variables** section, add:
   * `VITE_SUPABASE_URL`: `https://qoppatwubfhudpbrhtib.supabase.co`
   * `NEXT_PUBLIC_SUPABASE_URL`: `https://qoppatwubfhudpbrhtib.supabase.co`
   * `VITE_SUPABASE_ANON_KEY`: `sb_publishable_fNru58QSK3p6P2g75cUoLg_C0gEt_VQ`
   * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_fNru58QSK3p6P2g75cUoLg_C0gEt_VQ`
   * `BACKEND_URL`: `https://<your-render-backend-url>`
5. Click **Deploy**.
