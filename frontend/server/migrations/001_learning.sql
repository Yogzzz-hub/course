CREATE TABLE IF NOT EXISTS platform_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS enquiry_keys(key text PRIMARY KEY,value text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS learning_sessions (
 id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, csrf text NOT NULL,
 analytics boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE TABLE IF NOT EXISTS learning_questions (
 id text NOT NULL, version integer NOT NULL, content jsonb NOT NULL,
 status text NOT NULL CHECK(status IN ('draft','published','retired')),
 reviewed_at timestamptz, PRIMARY KEY(id,version)
);
CREATE TABLE IF NOT EXISTS learning_attempts (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 track integer NOT NULL CHECK(track BETWEEN 1 AND 3), bank jsonb NOT NULL,
 current_question jsonb, option_order jsonb, answers jsonb NOT NULL DEFAULT '[]', result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day'
);
CREATE INDEX IF NOT EXISTS learning_attempts_session ON learning_attempts(session_id,created_at DESC);
CREATE TABLE IF NOT EXISTS learning_events (
 id bigserial PRIMARY KEY, session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 name text NOT NULL, path text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_consents (
 id bigserial PRIMARY KEY,session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 analytics boolean NOT NULL,policy_version text NOT NULL DEFAULT 'learning-privacy-1',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_events_funnel ON learning_events(name,created_at,session_id);
CREATE TABLE IF NOT EXISTS learning_admins (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('owner','administrator','counselor','instructor','analyst')),
 disabled boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS learning_admin_sessions (
 token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES learning_admins(id),
 csrf text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE TABLE IF NOT EXISTS learning_audit (
 id bigserial PRIMARY KEY, admin_id uuid REFERENCES learning_admins(id), action text NOT NULL,
 target text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_limits (
 key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS learning_leads (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 email text NOT NULL, name text NOT NULL, interest text NOT NULL,
 consent_text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,email,interest)
);
INSERT INTO platform_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
