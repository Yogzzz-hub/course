CREATE TABLE IF NOT EXISTS learning_users(
 id uuid PRIMARY KEY, handle text UNIQUE NOT NULL, password_hash text NOT NULL,
 public_name text NOT NULL, public_participation boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), disabled boolean NOT NULL DEFAULT false
);
ALTER TABLE learning_sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES learning_users(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS learning_invites(
 token_hash text PRIMARY KEY, created_by uuid NOT NULL REFERENCES learning_admins(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days', used_at timestamptz
);
CREATE TABLE IF NOT EXISTS learning_points(
 user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
 challenge_id text NOT NULL, challenge_version integer NOT NULL, difficulty text NOT NULL, skill text NOT NULL,
 points integer NOT NULL CHECK(points BETWEEN 0 AND 300), total integer NOT NULL CHECK(total BETWEEN 0 AND 100),
 source_submission uuid REFERENCES learning_submissions(id) ON DELETE SET NULL,
 achieved_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,challenge_id)
);
CREATE INDEX IF NOT EXISTS learning_points_ranking ON learning_points(difficulty,skill,achieved_at,user_id);
CREATE TABLE IF NOT EXISTS learning_point_history(
 id bigserial PRIMARY KEY,user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
 challenge_id text NOT NULL,points integer NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_migrations(version) VALUES(5) ON CONFLICT DO NOTHING;
