-- ==============================================================================
-- Aintrix Academy - Complete Supabase Production Schema & Migrations
-- Compatible with Supabase SQL Editor, Supabase CLI, and PostgreSQL 15+
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Platform Migrations Tracking Table
CREATE TABLE IF NOT EXISTS platform_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Edge Rate Limiting & Ephemeral KV Storage
CREATE TABLE IF NOT EXISTS enquiry_keys (
  key text PRIMARY KEY,
  value text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enquiry_keys_expires ON enquiry_keys(expires_at);

-- 4. Learning Anonymous Sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  csrf text NOT NULL,
  analytics boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_token ON learning_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user ON learning_sessions(user_id);

-- 5. Versioned Question Bank
CREATE TABLE IF NOT EXISTS learning_questions (
  id text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('draft', 'published', 'retired')),
  reviewed_at timestamptz,
  PRIMARY KEY(id, version)
);
CREATE INDEX IF NOT EXISTS idx_learning_questions_published ON learning_questions(status, id, version DESC);

-- 6. Learning Attempts
CREATE TABLE IF NOT EXISTS learning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  track integer NOT NULL CHECK(track BETWEEN 1 AND 3),
  bank jsonb NOT NULL,
  current_question jsonb,
  option_order jsonb,
  answers jsonb NOT NULL DEFAULT '[]',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day'
);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_session ON learning_attempts(session_id, created_at DESC);

-- 7. Consented Analytics Events
CREATE TABLE IF NOT EXISTS learning_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL DEFAULT '',
  attribution jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_events_funnel ON learning_events(name, created_at, session_id);

-- 8. Privacy & Analytics Consents
CREATE TABLE IF NOT EXISTS learning_consents (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  analytics boolean NOT NULL,
  policy_version text NOT NULL DEFAULT 'learning-privacy-1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Administrators & RBAC
CREATE TABLE IF NOT EXISTS learning_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK(role IN ('owner', 'administrator', 'counselor', 'instructor', 'analyst')),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Admin Sessions
CREATE TABLE IF NOT EXISTS learning_admin_sessions (
  token_hash text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE CASCADE,
  csrf text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE INDEX IF NOT EXISTS idx_learning_admin_sessions_admin ON learning_admin_sessions(admin_id);

-- 11. Learning Audit Trail
CREATE TABLE IF NOT EXISTS learning_audit (
  id bigserial PRIMARY KEY,
  admin_id uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_audit_action ON learning_audit(action, created_at DESC);

-- 12. Rate Limits
CREATE TABLE IF NOT EXISTS learning_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

-- 13. Assessment Counselling Leads
CREATE TABLE IF NOT EXISTS learning_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  interest text NOT NULL,
  consent_text text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'closed')),
  assigned_to uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  preferred_contact text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, email, interest)
);
CREATE INDEX IF NOT EXISTS idx_learning_leads_status ON learning_leads(status, created_at DESC);

-- 14. Coding Submissions & Evaluation
CREATE TABLE IF NOT EXISTS learning_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  fingerprint text NOT NULL,
  challenge jsonb NOT NULL,
  code text,
  mode text NOT NULL CHECK(mode IN ('practice', 'independent')),
  assisted boolean NOT NULL,
  purpose text NOT NULL DEFAULT 'submit' CHECK(purpose IN ('sample', 'submit')),
  code_hash text,
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued', 'running', 'graded', 'system-error', 'cancelled')),
  retries integer NOT NULL DEFAULT 0,
  result jsonb,
  understanding_order jsonb NOT NULL,
  understanding_answer integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_submission_queue ON learning_submissions(state, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_submission_owner ON learning_submissions(session_id, created_at DESC);

-- 15. Judge Worker Health Heartbeat
CREATE TABLE IF NOT EXISTS learning_worker_health (
  id integer PRIMARY KEY,
  checked_at timestamptz NOT NULL
);

-- 16. Manual Reviewed Score Corrections
CREATE TABLE IF NOT EXISTS learning_score_corrections (
  id bigserial PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_corrections_submission ON learning_score_corrections(submission_id, id DESC);

-- 17. Learning Generated Roadmaps
CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES learning_attempts(id) ON DELETE CASCADE,
  profile jsonb NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, attempt_id)
);

-- 18. Shared Report Snapshots
CREATE TABLE IF NOT EXISTS learning_report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  report jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_share_owner ON learning_report_shares(roadmap_id, created_at DESC);

-- 19. Learner Accounts (Community / Leaderboard)
CREATE TABLE IF NOT EXISTS learning_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  public_name text NOT NULL,
  public_participation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled boolean NOT NULL DEFAULT false
);

-- Add foreign key from sessions to users if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'learning_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE learning_sessions ADD CONSTRAINT learning_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES learning_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 20. Learner Single-Use Invitations
CREATE TABLE IF NOT EXISTS learning_invites (
  token_hash text PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz
);

-- 21. Leaderboard Points
CREATE TABLE IF NOT EXISTS learning_points (
  user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  challenge_version integer NOT NULL,
  difficulty text NOT NULL,
  skill text NOT NULL,
  points integer NOT NULL CHECK(points BETWEEN 0 AND 300),
  total integer NOT NULL CHECK(total BETWEEN 0 AND 100),
  source_submission uuid REFERENCES learning_submissions(id) ON DELETE SET NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_points_ranking ON learning_points(difficulty, skill, achieved_at, user_id);

-- 22. Point Audit History
CREATE TABLE IF NOT EXISTS learning_point_history (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. Lead Counselor Follow-ups
CREATE TABLE IF NOT EXISTS learning_followups (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES learning_leads(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 24. A/B Testing Experiments
CREATE TABLE IF NOT EXISTS learning_experiments (
  id text PRIMARY KEY,
  version integer NOT NULL,
  active boolean NOT NULL DEFAULT false,
  variants jsonb NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 25. Experiment Assignments
CREATE TABLE IF NOT EXISTS learning_assignments (
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  experiment_id text NOT NULL REFERENCES learning_experiments(id) ON DELETE CASCADE,
  version integer NOT NULL,
  variant text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id, experiment_id, version)
);

-- 26. Candidate Rejudges
CREATE TABLE IF NOT EXISTS learning_rejudges (
  id bigserial PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  previous_result jsonb,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- NEW CRITICAL TABLES FOR SUPABASE: ENQUIRIES, CONSULTATIONS & STUDENT COMMERCE
-- ==============================================================================

-- 27. General Academy Website Enquiries (from /contact form)
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  programme text NOT NULL,
  contact_method text NOT NULL DEFAULT 'email' CHECK(contact_method IN ('email', 'phone')),
  message text,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(email);

-- 28. Student Consultation Bookings (from Student Panel & Mentorship modal)
CREATE TABLE IF NOT EXISTS consultation_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_email text NOT NULL,
  phone text,
  programme text NOT NULL,
  preferred_date date,
  preferred_time text,
  topics text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  assigned_counselor_id uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultation_enquiries_status ON consultation_enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_enquiries_email ON consultation_enquiries(student_email);

-- 29. Student Enrolments & Learning Plans (from Student Panel Checkout)
CREATE TABLE IF NOT EXISTS student_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES learning_users(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  phone text,
  programme text NOT NULL,
  package text NOT NULL,
  total_amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  billing_address jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('prospect', 'pending', 'enrolled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_enrolments_email ON student_enrolments(student_email);

-- 30. Student Payment Orders
CREATE TABLE IF NOT EXISTS student_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES student_enrolments(id) ON DELETE CASCADE,
  order_reference text UNIQUE NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_gateway text,
  gateway_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 31. Student Payment Instalments Schedule
CREATE TABLE IF NOT EXISTS student_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES student_enrolments(id) ON DELETE CASCADE,
  order_id uuid REFERENCES student_orders(id) ON DELETE SET NULL,
  label text NOT NULL,
  amount_minor integer NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'due' CHECK(status IN ('due', 'paid', 'overdue', 'waived')),
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 32. AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON learning_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_points_updated BEFORE UPDATE ON learning_points FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_consultation_updated BEFORE UPDATE ON consultation_enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enrolments_updated BEFORE UPDATE ON student_enrolments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 33. ROW LEVEL SECURITY (RLS) POLICIES
-- In Supabase, RLS protects every table from unauthorized API queries.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE platform_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_worker_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_score_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_rejudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_instalments ENABLE ROW LEVEL SECURITY;

-- Service Role (Full Backend Access) Policies for each table
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "service_role_all_%I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- Public / Anon Policies

-- Questions: anyone can view published questions
DROP POLICY IF EXISTS "public_read_published_questions" ON learning_questions;
CREATE POLICY "public_read_published_questions" ON learning_questions
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Public Leaderboard: view participating users and their point totals
DROP POLICY IF EXISTS "public_read_participating_users" ON learning_users;
CREATE POLICY "public_read_participating_users" ON learning_users
  FOR SELECT TO anon, authenticated
  USING (public_participation = true AND NOT disabled);

DROP POLICY IF EXISTS "public_read_public_points" ON learning_points;
CREATE POLICY "public_read_public_points" ON learning_points
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM learning_users u 
    WHERE u.id = learning_points.user_id 
      AND u.public_participation = true 
      AND NOT u.disabled
  ));

-- Experiments: public can view active experiments for client assignments
DROP POLICY IF EXISTS "public_read_active_experiments" ON learning_experiments;
CREATE POLICY "public_read_active_experiments" ON learning_experiments
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Report Shares: anyone with the valid shared report link can view until expired or revoked
DROP POLICY IF EXISTS "public_read_valid_shares" ON learning_report_shares;
CREATE POLICY "public_read_valid_shares" ON learning_report_shares
  FOR SELECT TO anon, authenticated
  USING (revoked_at IS NULL AND expires_at > now());

-- Enquiries: public can submit an enquiry from the website contact form
DROP POLICY IF EXISTS "public_insert_enquiries" ON enquiries;
CREATE POLICY "public_insert_enquiries" ON enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 0);

-- Consultation Bookings: public can request a consultation
DROP POLICY IF EXISTS "public_insert_consultations" ON consultation_enquiries;
CREATE POLICY "public_insert_consultations" ON consultation_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(student_name)) > 0 AND length(trim(student_email)) > 0);

-- Consents & Events: analytics tracking for consenting sessions
DROP POLICY IF EXISTS "public_insert_consents" ON learning_consents;
CREATE POLICY "public_insert_consents" ON learning_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_insert_events" ON learning_events;
CREATE POLICY "public_insert_events" ON learning_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_insert_leads" ON learning_leads;
CREATE POLICY "public_insert_leads" ON learning_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 0);

-- ==============================================================================
-- 34. SUPABASE REALTIME REPLICATION
-- Publish tables so frontend receives live updates
-- ==============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE learning_submissions;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE learning_worker_health;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE enquiries;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE consultation_enquiries;
EXCEPTION WHEN others THEN NULL; END $$;

-- 35. Seed Default A/B Experiments
INSERT INTO learning_experiments(id, version, active, variants, description) VALUES
  ('assessment-cta', 1, false, '["Take the Free Skill Test","Discover Your Developer Skills"]'::jsonb, 'Assessment entry text; optional consenting sessions only'),
  ('consultation-prompt', 1, false, '["Discuss this roadmap with a counselor","Talk through your learning goals"]'::jsonb, 'Roadmap counselling link text')
ON CONFLICT (id) DO NOTHING;

-- Record all 8 migration levels
INSERT INTO platform_migrations(version) VALUES (1), (2), (3), (4), (5), (6), (7), (8)
ON CONFLICT DO NOTHING;
