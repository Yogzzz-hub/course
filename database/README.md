# Aintrix Academy — Database Documentation & Schemas

This directory contains the database definitions, migration scripts, and seed data for the **Aintrix Academy** PostgreSQL database hosted on Supabase.

---

## 1. Schema Architecture: Dedicated `academy` Schema

All 20 Academy tables are created inside the **`academy`** PostgreSQL schema (`academy.*`).

```
📦 Supabase Project (PostgreSQL)
 ├── 📁 public.*    --> Reserved for production apps (e.g. Creo)
 └── 📁 academy.*   --> Isolated Aintrix Academy platform
```

### Why schema isolation?
* Guarantees zero naming collisions with any other tables in the same Supabase project (such as `users` or `tasks`).
* Allows multiple projects to coexist safely in the same PostgreSQL cluster without data leakage.

---

## 2. Directory Structure

* **`schemas/academy_schema.sql`**: The complete DDL (Data Definition Language) defining all 20 tables, primary keys, foreign key constraints, indexes, and schema creation.
* **`migrations/20261120_initial_academy_schema.sql`**: Versioned migration script with sequence resets and data load.
* **`seeds/csv/`**: Individual CSV data exports for each of the 20 tables.
* **`seeds/json/`**: Individual JSON data exports for each of the 20 tables.

---

## 3. Table Inventory (20 Tables)

| # | Table Name | Description | Key Relationships |
|---|---|---|---|
| 1 | `users` | User accounts (students, trainers, managers, admins) | Primary key: `id` |
| 2 | `user_roles` | Many-to-many user roles assignment | `user_id` -> `users.id` |
| 3 | `auth_sessions` | Secure HTTP-only session tokens | `user_id` -> `users.id` |
| 4 | `programmes` | Courses offered (fees, durations, details) | Primary key: `id` |
| 5 | `settings` | System-wide configuration rules | Key-value store |
| 6 | `batches` | Course cohort batches | `programme_id` -> `programmes.id` |
| 7 | `batch_trainers` | Trainers assigned to batches | `batch_id`, `trainer_id` |
| 8 | `enrolments` | Student course registrations | `student_id`, `batch_id` |
| 9 | `class_sessions` | Scheduled live class meetings | `batch_id` -> `batches.id` |
| 10 | `presence` | Live attendance tracking heartbeats | `class_id`, `user_id` |
| 11 | `payments` | Student tuition payments & installments | `enrolment_id` -> `enrolments.id` |
| 12 | `expenses` | Academy operating expenses | `logged_by` -> `users.id` |
| 13 | `assignments` | Course homework & assignments | `batch_id` -> `batches.id` |
| 14 | `submissions` | Student assignment work & grades | `assignment_id`, `student_id` |
| 15 | `quizzes` | Interactive multiple-choice tests | `batch_id` -> `batches.id` |
| 16 | `quiz_attempts` | Student quiz scores & answers | `quiz_id`, `student_id` |
| 17 | `tasks` | Practice tasks & action items | `batch_id` -> `batches.id` |
| 18 | `task_completions`| Student task completion checkmarks | `task_id`, `student_id` |
| 19 | `certificates` | Issued completion certificates | `enrolment_id`, `student_id` |
| 20 | `audit_logs` | Security & compliance audit trail | `actor_id` -> `users.id` |

---

## 4. How to Apply to Supabase

1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project and navigate to the **SQL Editor** (`/sql/new`).
3. Copy the contents of `database/schemas/academy_schema.sql` into the editor.
4. Click **Run**.
5. All 20 tables and constraints will be created in the `academy` schema.
