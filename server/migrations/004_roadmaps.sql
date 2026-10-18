CREATE TABLE IF NOT EXISTS learning_roadmaps (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 attempt_id uuid NOT NULL REFERENCES learning_attempts(id) ON DELETE CASCADE,
 profile jsonb NOT NULL, report jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,attempt_id)
);
CREATE TABLE IF NOT EXISTS learning_report_shares (
 id uuid PRIMARY KEY, roadmap_id uuid NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL, report jsonb NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day',
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_share_owner ON learning_report_shares(roadmap_id,created_at DESC);
INSERT INTO platform_migrations(version) VALUES(4) ON CONFLICT DO NOTHING;
