export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "danger";
  title: string;
  message: string;
}

export type ManagerNavTab =
  | "dashboard"
  | "leads"
  | "admissions"
  | "cohorts"
  | "schedule"
  | "attendance"
  | "fees"
  | "counsellors"
  | "announcements"
  | "reports";

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  track: string;
  date: string;
  status: "New Lead" | "Counselling Scheduled" | "Offer Extended" | "Admitted" | "Lost";
  assignedCounsellor: string;
  notes: string[];
  source: string;
  score: number;
}

export interface Admission {
  id: string;
  studentName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  course: string;
  batch: string;
  feeStatus: "1st Installment Paid" | "Full Payment Verified" | "Installment Due";
  agreementSigned: boolean;
  enrolledDate: string;
  status: "APPROVED" | "PENDING_VERIFICATION" | "DRAFT";
}

export interface CohortSeat {
  id: string;
  name: string;
  code: string;
  courseTitle: string;
  facultyName: string;
  enrolledCount: number;
  maxSeats: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "UPCOMING" | "COMPLETED";
  attendanceAverage: number;
  progress: number;
}

export interface AttendanceAlert {
  id: string;
  studentId: string;
  studentName: string;
  email: string;
  phone: string;
  batchCode: string;
  batchName: string;
  attendancePercentage: number;
  missedSessions: number;
  lastAttended: string;
  riskLevel: "HIGH" | "MEDIUM" | "CRITICAL";
  warningSent: boolean;
}

export interface FeePayment {
  id: string;
  invoiceId: string;
  studentName: string;
  course: string;
  amount: string;
  dueDate: string;
  paidDate?: string;
  status: "PAID" | "PENDING" | "OVERDUE";
  method?: string;
}

export interface Counsellor {
  id: string;
  name: string;
  email: string;
  phone: string;
  activeLeadsCount: number;
  convertedCount: number;
  targetCount: number;
  conversionRate: number;
  status: "ACTIVE" | "ON_LEAVE";
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  audience: string;
  createdAt: string;
  priority: "NORMAL" | "URGENT";
}

export interface ManagerStats {
  newEnquiries: number;
  pendingFollowUps: number;
  activeStudents: number;
  runningBatches: number;
  attendanceAlertsCount: number;
  pendingAdmissionsCount: number;
  totalRevenue: string;
}

export interface ManagerReportsData {
  monthlyAdmissions: { month: string; leads: number; admissions: number }[];
  trackBreakdown: { track: string; share: number; revenue: string }[];
}

export interface CohortSeat {
  id: string;
  name: string;
  code: string;
  courseTitle: string;
  facultyName: string;
  enrolledCount: number;
  maxSeats: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "UPCOMING" | "COMPLETED";
  attendanceAverage: number;
  progress: number;
}

export interface TrainerScheduleItem {
  id: string;
  batchCode: string;
  batchName: string;
  topic: string;
  date: string;
  time: string;
  duration: string;
  roomLink: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
}
