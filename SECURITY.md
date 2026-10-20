# Security Policy & Operational Guidelines

This document outlines the security architecture, policies, and operational controls enforced across the Aintrix Academy platform.

---

## 🌐 Environment & Configuration

- **Hide API keys**: Never hardcode keys in your repository. Use encrypted secrets or environmental configurations (`.env.local`, `.dev.vars`, Cloudflare / Vercel Secret Management).
- **Check env variables**: Ensure production environment variables are properly isolated from development or testing environments. Never commit production credentials into version control.
- **Debug mode off**: Disable verbose error messages and debugging modes in production to avoid leaking system paths, configurations, or framework data. Generic, opaque error IDs are surfaced to end users while detailed logs are confined to secure server sinks.

### Implementation in this Codebase:
- `.gitignore` strictly ignores `.env`, `.env.local`, `.env.*.local`, `.dev.vars`, `*.log`, and temporary credentials.
- In production, serverless functions (`api/learning.ts`, `api/enquiry.ts`, `api/notify.ts`) emit structured JSON logs with correlation IDs (`requestId`) without exposing stack traces or database errors to client responses.

---

## 🔑 Authentication & Access Control

- **Proper authentication**: Implement robust identity verification using strong protocols (like OAuth2, OpenID Connect, or managed session tokens).
- **Access control**: Enforce the Principle of Least Privilege (PoLP). Use Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC) to restrict user actions.
- **Protect admin routes**: Secure administrative panels and sensitive API routes behind strict IP whitelisting, multi-factor authentication (MFA), or advanced authorization checks.
- **Hash passwords**: Never store passwords in plain text. Always use strong, modern cryptographic hashing algorithms like Argon2id or bcrypt (or hardened scrypt with high work factors) with a unique salt per user.

### Implementation in this Codebase:
- **Password Hashing**: Implemented in [`server/security.ts`](file:///server/security.ts) using 16-byte cryptographically secure random salts per user, `scryptSync` (64-byte derivation), and `timingSafeEqual` to eliminate timing side-channel attacks.
- **Role-Based Access Control (RBAC)**: Defined in [`server/security.ts`](file:///server/security.ts#L13-L19) with roles (`owner`, `administrator`, `instructor`, `counselor`, `analyst`) and explicit permission gates (`metrics`, `questions`, `publish`, `leads`).
- **Session Security**: Admin and user sessions use isolated `__Host-` prefixed cookies with `HttpOnly; SameSite=Strict; Secure; Path=/` and cryptographic session tokens hashed via SHA-256 before database lookup.
- **Database Row Level Security (RLS)**: Enforced across 100% of tables in [`supabase/schema.sql`](file:///supabase/schema.sql), restricting anonymous public queries and restricting administrative mutations to verified roles.

---

## 🛡️ Network & Request Handling

- **Secure API endpoints**: Protect backend APIs from unauthorized access and enumeration attacks.
- **Rate limiting**: Implement throttling on endpoints (especially authentication, payment, or registration routes) to prevent Denial of Service (DoS) and brute-force attacks.
- **CORS settings**: Explicitly configure Cross-Origin Resource Sharing (CORS) policies to allow requests only from trusted domains instead of using wildcards (`*`).
- **Security headers**: Configure standard HTTP response headers (such as `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, and `Strict-Transport-Security`) to mitigate browser-side vulnerabilities.

### Implementation in this Codebase:
- **Rate Limiting**: Sliding window rate-limiting is enforced in [`server/app.ts`](file:///server/app.ts#L37-L41) using partitioned hash buckets in `learning_limits` table (with automated pruning).
- **CORS & Origin Validation**: Strict origin validation is enforced via `APP_ORIGIN` and `ALLOWED_ORIGIN`. Wildcards are banned.
- **Security Headers**: Enforced in [`vercel.json`](file:///vercel.json) across all routes:
  - `Content-Security-Policy`: Restricts scripts, styles, frames, and connect origins to approved endpoints (Cloudflare Turnstile, Supabase APIs).
  - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` (HSTS).
  - `X-Frame-Options`: `DENY` (clickjacking mitigation).
  - `X-Content-Type-Options`: `nosniff` (MIME sniffing mitigation).
  - `X-XSS-Protection`: `1; mode=block`.
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
  - `Permissions-Policy`: Restricts camera, microphone, and geolocation.

---

## 🧹 Input Validation & Data Safety

- **Sanitize forms**: Clean and normalize all incoming user input on the server side before handling it to prevent command injections.
- **XSS protection**: Sanitize and escape all dynamic user data before rendering it or parsing it in contexts that could trigger Cross-Site Scripting.
- **Secure database**: Protect the database layer against SQL Injection (SQLi) by utilizing parameterized queries or Object-Relational Mapping (ORM) frameworks. Ensure database connections use TLS.

### Implementation in this Codebase:
- **Schema Validation**: Server and client forms use strict Zod schemas with `.strict()` ([`server/app.ts`](file:///server/app.ts), [`src/data/bookingSchema.ts`](file:///src/data/bookingSchema.ts)) rejecting unknown keys and length overruns.
- **Payload Limits**: Ingestion endpoints enforce strict stream payload caps (e.g., 32KB max body) to prevent memory exhaustion attacks.
- **SQL Injection Prevention**: All queries in [`server/db.ts`](file:///server/db.ts), [`server/app.ts`](file:///server/app.ts), [`api/enquiry.ts`](file:///api/enquiry.ts), and [`api/notify.ts`](file:///api/notify.ts) exclusively use parameterized statements (`$1, $2, ...`). Dynamic raw string concatenation in SQL queries is prohibited.
- **Database TLS**: Database connections require SSL/TLS encrypted transport when connecting to remote PostgreSQL / Supabase hosts.

---

## 📦 Dependency & Code Management

- **Update dependencies**: Keep your core frameworks and language versions patched against known vulnerabilities.
- **Remove unused packages**: Reduce your application’s attack surface by deleting obsolete packages or dead code.
- **Check exposed files**: Ensure configuration files, logs, local backup files, and system directories (like `.git`) are not accessible publicly via the web server root.
- **Scan git for leaked secrets**: Use automated secret-scanning tools (e.g., GitGuardian, TruffleHog, Gitleaks) in your CI/CD pipeline to detect accidental commits containing API keys, private keys, or credentials.
- **Full security audit**: Regularly run software composition analysis (SCA) tools (like `npm audit`, Snyk, or OWASP Dependency-Check) alongside periodic automated vulnerability testing.

### Implementation in this Codebase:
- **CI/CD Security Workflow**: Configured in [`.github/workflows/security.yml`](file:///.github/workflows/security.yml) with:
  - Automated high-severity dependency vulnerability audit (`npm audit --audit-level=high`).
  - Automated secret scanning (Gitleaks).
  - TypeScript strict type verification (`npm run typecheck`).
  - ESLint code quality & security checks (`npm run lint`).
  - Unit & integration test execution (`npm test`).
- **Pruning & Exposure Defense**: Web root exposes only pre-rendered static assets in `dist/`. No server source code, git directories, or configuration dotfiles are served.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it privately:
- **Security Contact**: `aintrixacademy2026@gmail.com`
- **Response SLA**: Initial triage within 24–48 hours.
- Please do not open public issues regarding undisclosed security vulnerabilities.
