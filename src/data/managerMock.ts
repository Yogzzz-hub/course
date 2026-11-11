// src/data/managerMock.ts
// Typed mock dataset for the Manager Portal (used where backend API routes / Prisma queries are pending)

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

export const initialManagerStats: ManagerStats = {
  newEnquiries: 14,
  pendingFollowUps: 8,
  activeStudents: 142,
  runningBatches: 6,
  attendanceAlertsCount: 4,
  pendingAdmissionsCount: 3,
  totalRevenue: "₹ 48,50,000",
};

export const initialLeads: Lead[] = [
  {
    id: "ENQ-801",
    name: "Rahul Sharma",
    email: "rahul.s@example.com",
    phone: "+91 98765 43210",
    track: "Python Full-Stack",
    date: "10 Nov 2026",
    status: "New Lead",
    assignedCounsellor: "Ananya Deshmukh",
    notes: ["Interested in weekend cohort", "Background in MCA"],
    source: "Website Form",
    score: 85,
  },
  {
    id: "ENQ-802",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    phone: "+91 98765 12345",
    track: "React Frontend Mastery",
    date: "09 Nov 2026",
    status: "Counselling Scheduled",
    assignedCounsellor: "Rohan Sen",
    notes: ["Demo session scheduled for 12 Nov 4 PM"],
    source: "Google Search",
    score: 92,
  },
  {
    id: "ENQ-803",
    name: "Anand Verma",
    email: "anand.v@example.com",
    phone: "+91 91234 56789",
    track: "DSA & System Design",
    date: "08 Nov 2026",
    status: "Offer Extended",
    assignedCounsellor: "Ananya Deshmukh",
    notes: ["Early-bird scholarship applied (15%)"],
    source: "LinkedIn Referral",
    score: 96,
  },
  {
    id: "ENQ-804",
    name: "Divya Krishnan",
    email: "divya.k@example.com",
    phone: "+91 98451 22334",
    track: "AI & Machine Learning",
    date: "07 Nov 2026",
    status: "Admitted",
    assignedCounsellor: "Rohan Sen",
    notes: ["Seat confirmed in BATCH-AI-2026-A"],
    source: "Direct Booking",
    score: 98,
  },
  {
    id: "ENQ-805",
    name: "Saurabh Mishra",
    email: "saurabh.m@example.com",
    phone: "+91 99887 76655",
    track: "DevOps & Cloud Engineering",
    date: "06 Nov 2026",
    status: "Lost",
    assignedCounsellor: "Kavita Rao",
    notes: ["Fee structure beyond current budget; followup in Q1"],
    source: "Instagram Campaign",
    score: 40,
  },
];

export const initialAdmissions: Admission[] = [
  {
    id: "ADM-501",
    studentName: "Karthik Subramanian",
    email: "karthik.sub@example.com",
    phone: "+91 98765 00011",
    registrationNumber: "REG-2026-PY-014",
    course: "Python Full-Stack Enterprise",
    batch: "BATCH-PY-2026-A",
    feeStatus: "1st Installment Paid",
    agreementSigned: true,
    enrolledDate: "05 Nov 2026",
    status: "APPROVED",
  },
  {
    id: "ADM-502",
    studentName: "Sneha Patel",
    email: "sneha.patel@example.com",
    phone: "+91 98765 00022",
    registrationNumber: "REG-2026-RE-009",
    course: "React Modern Frontend Track",
    batch: "BATCH-REACT-2026-B",
    feeStatus: "Full Payment Verified",
    agreementSigned: true,
    enrolledDate: "06 Nov 2026",
    status: "APPROVED",
  },
  {
    id: "ADM-503",
    studentName: "Vikram Malhotra",
    email: "vikram.m@example.com",
    phone: "+91 98765 00033",
    registrationNumber: "REG-2026-DS-021",
    course: "DSA & System Design Mastery",
    batch: "BATCH-DSA-2026-C",
    feeStatus: "Installment Due",
    agreementSigned: false,
    enrolledDate: "08 Nov 2026",
    status: "PENDING_VERIFICATION",
  },
];

export const initialCohorts: CohortSeat[] = [
  {
    id: "COH-01",
    name: "Python Full-Stack Cohort A",
    code: "BATCH-PY-2026-A",
    courseTitle: "Python Enterprise Architecture",
    facultyName: "Dr. Vikram Joshi",
    enrolledCount: 24,
    maxSeats: 30,
    startDate: "15 Oct 2026",
    endDate: "15 Jan 2027",
    status: "ACTIVE",
    attendanceAverage: 88,
    progress: 68,
  },
  {
    id: "COH-02",
    name: "React Modern Frontend Track",
    code: "BATCH-REACT-2026-B",
    courseTitle: "React & Next.js Ecosystem",
    facultyName: "Neha Kapoor",
    enrolledCount: 18,
    maxSeats: 25,
    startDate: "01 Nov 2026",
    endDate: "01 Feb 2027",
    status: "ACTIVE",
    attendanceAverage: 92,
    progress: 85,
  },
  {
    id: "COH-03",
    name: "DSA & System Design Cohort",
    code: "BATCH-DSA-2026-C",
    courseTitle: "Algorithms, Graphs & Microservices",
    facultyName: "Arjun Reddy",
    enrolledCount: 30,
    maxSeats: 30,
    startDate: "20 Oct 2026",
    endDate: "20 Jan 2027",
    status: "ACTIVE",
    attendanceAverage: 81,
    progress: 42,
  },
  {
    id: "COH-04",
    name: "AI & Machine Learning Winter Cohort",
    code: "BATCH-AI-2026-D",
    courseTitle: "Machine Learning, LLMs & MLOps",
    facultyName: "Dr. Vikram Joshi",
    enrolledCount: 12,
    maxSeats: 25,
    startDate: "01 Dec 2026",
    endDate: "01 Mar 2027",
    status: "UPCOMING",
    attendanceAverage: 0,
    progress: 0,
  },
];

export const initialAttendanceAlerts: AttendanceAlert[] = [
  {
    id: "ALT-01",
    studentId: "STU-104",
    studentName: "Aditya Roy",
    email: "aditya.roy@example.com",
    phone: "+91 98111 22334",
    batchCode: "BATCH-PY-2026-A",
    batchName: "Python Full-Stack Cohort A",
    attendancePercentage: 62.5,
    missedSessions: 6,
    lastAttended: "02 Nov 2026",
    riskLevel: "CRITICAL",
    warningSent: false,
  },
  {
    id: "ALT-02",
    studentId: "STU-119",
    studentName: "Meera Sen",
    email: "meera.sen@example.com",
    phone: "+91 98222 33445",
    batchCode: "BATCH-DSA-2026-C",
    batchName: "DSA & System Design Cohort",
    attendancePercentage: 68.0,
    missedSessions: 4,
    lastAttended: "04 Nov 2026",
    riskLevel: "HIGH",
    warningSent: true,
  },
  {
    id: "ALT-03",
    studentId: "STU-205",
    studentName: "Tanmay Bhatia",
    email: "tanmay.b@example.com",
    phone: "+91 98333 44556",
    batchCode: "BATCH-PY-2026-A",
    batchName: "Python Full-Stack Cohort A",
    attendancePercentage: 70.8,
    missedSessions: 3,
    lastAttended: "06 Nov 2026",
    riskLevel: "MEDIUM",
    warningSent: false,
  },
  {
    id: "ALT-04",
    studentId: "STU-312",
    studentName: "Ritu Singhal",
    email: "ritu.s@example.com",
    phone: "+91 98444 55667",
    batchCode: "BATCH-REACT-2026-B",
    batchName: "React Modern Frontend Track",
    attendancePercentage: 72.0,
    missedSessions: 3,
    lastAttended: "05 Nov 2026",
    riskLevel: "MEDIUM",
    warningSent: false,
  },
];

export const initialFeePayments: FeePayment[] = [
  {
    id: "FEE-901",
    invoiceId: "INV-2026-001",
    studentName: "Karthik Subramanian",
    course: "Python Full-Stack",
    amount: "₹ 35,000",
    dueDate: "01 Nov 2026",
    paidDate: "05 Nov 2026",
    status: "PAID",
    method: "UPI (HDFC)",
  },
  {
    id: "FEE-902",
    invoiceId: "INV-2026-002",
    studentName: "Sneha Patel",
    course: "React Modern Frontend",
    amount: "₹ 65,000",
    dueDate: "05 Nov 2026",
    paidDate: "06 Nov 2026",
    status: "PAID",
    method: "Net Banking (ICICI)",
  },
  {
    id: "FEE-903",
    invoiceId: "INV-2026-003",
    studentName: "Vikram Malhotra",
    course: "DSA & System Design",
    amount: "₹ 25,000",
    dueDate: "10 Nov 2026",
    status: "OVERDUE",
  },
  {
    id: "FEE-904",
    invoiceId: "INV-2026-004",
    studentName: "Aman Gupta",
    course: "Python Full-Stack",
    amount: "₹ 30,000",
    dueDate: "20 Nov 2026",
    status: "PENDING",
  },
];

export const initialCounsellors: Counsellor[] = [
  {
    id: "CNS-01",
    name: "Ananya Deshmukh",
    email: "ananya.d@aintrixacademy.edu",
    phone: "+91 99000 11223",
    activeLeadsCount: 18,
    convertedCount: 42,
    targetCount: 50,
    conversionRate: 84.0,
    status: "ACTIVE",
  },
  {
    id: "CNS-02",
    name: "Rohan Sen",
    email: "rohan.s@aintrixacademy.edu",
    phone: "+91 99000 22334",
    activeLeadsCount: 14,
    convertedCount: 38,
    targetCount: 45,
    conversionRate: 84.4,
    status: "ACTIVE",
  },
  {
    id: "CNS-03",
    name: "Kavita Rao",
    email: "kavita.r@aintrixacademy.edu",
    phone: "+91 99000 33445",
    activeLeadsCount: 9,
    convertedCount: 29,
    targetCount: 40,
    conversionRate: 72.5,
    status: "ACTIVE",
  },
];

export const initialAnnouncements: Announcement[] = [
  {
    id: "ANN-101",
    title: "Mid-Term Evaluation Schedule Released",
    body: "Mid-term coding assessments for all active cohorts will commence on 25 Nov 2026. Hall tickets and slot allocations are visible in student portals.",
    author: "Operations Manager",
    audience: "All Active Batches",
    createdAt: "10 Nov 2026",
    priority: "URGENT",
  },
  {
    id: "ANN-102",
    title: "Guest Masterclass: Microservices & Event Architecture",
    body: "Join us this Saturday at 5 PM IST for an industry session with Principal Engineer from AWS on scalable Kafka event streams.",
    author: "Academic Coordinator",
    audience: "Python & DSA Batches",
    createdAt: "08 Nov 2026",
    priority: "NORMAL",
  },
];

export const initialReportsData = {
  monthlyAdmissions: [
    { month: "Jul", leads: 45, admissions: 28 },
    { month: "Aug", leads: 62, admissions: 39 },
    { month: "Sep", leads: 78, admissions: 48 },
    { month: "Oct", leads: 85, admissions: 54 },
    { month: "Nov", leads: 94, admissions: 62 },
  ],
  trackBreakdown: [
    { track: "Python Full-Stack", share: 38, revenue: "₹ 18,40,000" },
    { track: "React Frontend", share: 26, revenue: "₹ 12,60,000" },
    { track: "DSA & System Design", share: 22, revenue: "₹ 10,80,000" },
    { track: "AI & Cloud DevOps", share: 14, revenue: "₹ 6,70,000" },
  ],
};

