ALTER TABLE learning_submissions ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'submit' CHECK(purpose IN ('sample','submit'));
ALTER TABLE learning_submissions ADD COLUMN IF NOT EXISTS code_hash text;
CREATE TABLE IF NOT EXISTS learning_rejudges(
 id bigserial PRIMARY KEY,submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
 requested_by uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 previous_result jsonb,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_migrations(version) VALUES(7) ON CONFLICT DO NOTHING;
