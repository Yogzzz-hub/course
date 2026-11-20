-- Migration 008: Enquiries, consultation bookings, and student commerce tables
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

INSERT INTO platform_migrations(version) VALUES (8) ON CONFLICT DO NOTHING;
