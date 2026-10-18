CREATE TABLE IF NOT EXISTS learning_score_corrections (
 id bigserial PRIMARY KEY, submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
 admin_id uuid NOT NULL REFERENCES learning_admins(id), score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_corrections_latest ON learning_score_corrections(submission_id,id DESC);
INSERT INTO platform_migrations(version) VALUES (3) ON CONFLICT DO NOTHING;
