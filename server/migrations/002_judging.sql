CREATE TABLE IF NOT EXISTS learning_submissions (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, fingerprint text NOT NULL, challenge jsonb NOT NULL, code text,
 mode text NOT NULL CHECK(mode IN ('practice','independent')), assisted boolean NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','graded','system-error','cancelled')),
 retries integer NOT NULL DEFAULT 0, result jsonb, understanding_order jsonb NOT NULL,
 understanding_answer integer, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,request_id)
);
CREATE INDEX IF NOT EXISTS learning_submission_queue ON learning_submissions(state,created_at);
CREATE INDEX IF NOT EXISTS learning_submission_owner ON learning_submissions(session_id,created_at DESC);
CREATE TABLE IF NOT EXISTS learning_worker_health(id integer PRIMARY KEY, checked_at timestamptz NOT NULL);
INSERT INTO platform_migrations(version) VALUES (2) ON CONFLICT DO NOTHING;
