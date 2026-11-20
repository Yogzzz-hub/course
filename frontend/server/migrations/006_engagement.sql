ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}';
ALTER TABLE learning_leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','closed'));
ALTER TABLE learning_leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES learning_admins(id);
ALTER TABLE learning_leads ADD COLUMN IF NOT EXISTS preferred_contact text NOT NULL DEFAULT 'email';
CREATE TABLE IF NOT EXISTS learning_followups(
 id bigserial PRIMARY KEY,lead_id uuid NOT NULL REFERENCES learning_leads(id) ON DELETE CASCADE,
 admin_id uuid NOT NULL REFERENCES learning_admins(id),note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_experiments(
 id text PRIMARY KEY,version integer NOT NULL,active boolean NOT NULL DEFAULT false,
 variants jsonb NOT NULL,description text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_assignments(
 session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
 experiment_id text NOT NULL REFERENCES learning_experiments(id),version integer NOT NULL,
 variant text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(session_id,experiment_id,version)
);
INSERT INTO learning_experiments(id,version,variants,description) VALUES
 ('assessment-cta',1,'["Take the Free Skill Test","Discover Your Developer Skills"]','Assessment entry text; optional consenting sessions only'),
 ('consultation-prompt',1,'["Discuss this roadmap with a counselor","Talk through your learning goals"]','Roadmap counselling link text') ON CONFLICT DO NOTHING;
INSERT INTO platform_migrations(version) VALUES(6) ON CONFLICT DO NOTHING;
