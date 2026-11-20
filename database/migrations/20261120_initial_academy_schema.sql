-- ============================================================
-- Aintrix Academy Schema & Data Migration for Supabase PostgreSQL
-- Target Schema: academy
-- Project Ref: qoppatwubfhudpbrhtib
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS academy;

SET search_path TO academy;

CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(190) NOT NULL, 
	phone VARCHAR(30) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	is_dev_account BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_roles (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	role VARCHAR(30) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (user_id, role), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_sessions (
	id SERIAL NOT NULL, 
	token_hash VARCHAR(64) NOT NULL, 
	user_id INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS programmes (
	id SERIAL NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	fee_inr INTEGER NOT NULL, 
	duration_weeks INTEGER NOT NULL, 
	description TEXT NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS settings (
	key VARCHAR(80) NOT NULL, 
	value TEXT NOT NULL, 
	PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS batches (
	id SERIAL NOT NULL, 
	programme_id INTEGER NOT NULL, 
	name VARCHAR(160) NOT NULL, 
	start_date DATE NOT NULL, 
	days VARCHAR(40) NOT NULL, 
	start_time VARCHAR(5) NOT NULL, 
	duration_minutes INTEGER NOT NULL, 
	classes_total INTEGER NOT NULL, 
	capacity INTEGER NOT NULL, 
	created_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(programme_id) REFERENCES programmes (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS batch_trainers (
	id SERIAL NOT NULL, 
	batch_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (batch_id, user_id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrolments (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	batch_id INTEGER NOT NULL, 
	programme_id INTEGER NOT NULL, 
	fee_total_inr INTEGER NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	enrolled_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (user_id, batch_id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE, 
	FOREIGN KEY(programme_id) REFERENCES programmes (id), 
	FOREIGN KEY(enrolled_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS class_sessions (
	id SERIAL NOT NULL, 
	batch_id INTEGER NOT NULL, 
	sequence INTEGER NOT NULL, 
	starts_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	ends_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	meeting_url VARCHAR(500) NOT NULL, 
	recording_url VARCHAR(500) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	started_at TIMESTAMP WITHOUT TIME ZONE, 
	ended_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS presence (
	id SERIAL NOT NULL, 
	class_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	first_seen TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	last_seen TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	seconds INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (class_id, user_id), 
	FOREIGN KEY(class_id) REFERENCES class_sessions (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
	id SERIAL NOT NULL, 
	enrolment_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	amount_inr INTEGER NOT NULL, 
	method VARCHAR(40) NOT NULL, 
	reference VARCHAR(120) NOT NULL, 
	paid_on DATE NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	note TEXT NOT NULL, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	decided_by INTEGER, 
	decided_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(enrolment_id) REFERENCES enrolments (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(decided_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS expenses (
	id SERIAL NOT NULL, 
	category VARCHAR(80) NOT NULL, 
	description TEXT NOT NULL, 
	amount_inr INTEGER NOT NULL, 
	spent_on DATE NOT NULL, 
	recorded_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(recorded_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS assignments (
	id SERIAL NOT NULL, 
	batch_id INTEGER NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	brief TEXT NOT NULL, 
	due_at TIMESTAMP WITHOUT TIME ZONE, 
	created_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS submissions (
	id SERIAL NOT NULL, 
	assignment_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	kind VARCHAR(10) NOT NULL, 
	link VARCHAR(500) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	file_path VARCHAR(500) NOT NULL, 
	note TEXT NOT NULL, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	score INTEGER, 
	feedback TEXT NOT NULL, 
	graded_by INTEGER, 
	graded_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	UNIQUE (assignment_id, user_id), 
	FOREIGN KEY(assignment_id) REFERENCES assignments (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(graded_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS quizzes (
	id SERIAL NOT NULL, 
	batch_id INTEGER NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	questions JSON NOT NULL, 
	due_at TIMESTAMP WITHOUT TIME ZONE, 
	created_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
	id SERIAL NOT NULL, 
	quiz_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	answers JSON NOT NULL, 
	score INTEGER NOT NULL, 
	total INTEGER NOT NULL, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (quiz_id, user_id), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
	id SERIAL NOT NULL, 
	batch_id INTEGER NOT NULL, 
	user_id INTEGER, 
	title VARCHAR(200) NOT NULL, 
	detail TEXT NOT NULL, 
	due_at TIMESTAMP WITHOUT TIME ZONE, 
	created_by INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(batch_id) REFERENCES batches (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS task_completions (
	id SERIAL NOT NULL, 
	task_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	done_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (task_id, user_id), 
	FOREIGN KEY(task_id) REFERENCES tasks (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certificates (
	id SERIAL NOT NULL, 
	enrolment_id INTEGER NOT NULL, 
	number VARCHAR(40) NOT NULL, 
	issued_by INTEGER NOT NULL, 
	issued_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	revoked BOOLEAN NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(enrolment_id) REFERENCES enrolments (id) ON DELETE CASCADE, 
	UNIQUE (number), 
	FOREIGN KEY(issued_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL NOT NULL, 
	actor_id INTEGER, 
	action VARCHAR(80) NOT NULL, 
	entity VARCHAR(60) NOT NULL, 
	entity_id VARCHAR(60) NOT NULL, 
	detail JSON NOT NULL, 
	at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

COMMIT;
