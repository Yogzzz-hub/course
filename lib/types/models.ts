/**
 * Core User & Session Types
 */
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'financier' | 'trainer' | 'student';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended' | 'pending';
  roles: UserRole[];
  created_at: string;
}

export interface Me {
  id: number;
  name: string;
  email: string;
  roles: UserRole[];
}

/**
 * Course & Batch Types
 */
export interface Programme {
  id: number;
  name: string;
  fee_inr: number;
  duration_weeks: number;
  description: string;
}

export interface Batch {
  id: number;
  programme_id: number;
  name: string;
  start_date: string;
  days: string;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  seats_taken: number;
  status: 'upcoming' | 'running' | 'completed';
}

/**
 * Class & Attendance Types
 */
export interface ClassSession {
  id: number;
  batch_id: number;
  batch: string;
  sequence: number;
  starts_at: string;
  ends_at: string;
  status: 'upcoming' | 'live' | 'ended';
  meeting_url: string;
  recording_url: string;
}

export interface AttendanceRecord {
  class_id: number;
  user_id: number;
  minutes_connected: number;
  percent: number;
  attended: boolean;
}

/**
 * Finance & Payments
 */
export interface Payment {
  id: number;
  enrolment_id: number;
  name: string;
  email: string;
  batch: string;
  amount_inr: number;
  method: 'UPI' | 'NEFT' | 'IMPS' | 'Bank transfer' | 'Card' | 'Cash';
  reference: string;
  paid_on: string;
  status: 'submitted' | 'verified' | 'rejected';
  note?: string;
  balance_inr?: number;
}

export interface Expense {
  id: number;
  category: string;
  amount_inr: number;
  description: string;
  spent_on: string;
  logged_by: number;
}

/**
 * Academic Work & Certificates
 */
export interface Assignment {
  id: number;
  batch_id: number;
  title: string;
  brief: string;
  due_at: string | null;
  submissions_count?: number;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  link?: string;
  file_name?: string;
  note?: string;
  submitted_at: string;
  score: number | null;
  feedback?: string;
}

export interface Certificate {
  id: number;
  number: string;
  student_id: number;
  student_name: string;
  programme: string;
  batch: string;
  issued_on: string;
  revoked: boolean;
}
