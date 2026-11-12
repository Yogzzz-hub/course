// src/data/trainerMock.ts
// Typed mock dataset for the Trainer Portal (used where backend API routes / Prisma queries are pending)

export interface TrainerBatch {
  id: string;
  name: string;
  code: string;
  track: string;
  studentsCount: number;
  progress: number;
  nextSession: string;
  module: string;
  schedule: string;
  students: {
    id: string;
    name: string;
    email: string;
    attendanceRate: number;
    lastPresent: boolean;
  }[];
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

export interface AttendanceStudent {
  studentId: string;
  name: string;
  rollNo: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  notes?: string;
}

export interface TrainerAssignmentSubmission {
  id: string;
  studentName: string;
  studentEmail: string;
  batchCode: string;
  assignmentTitle: string;
  submittedAt: string;
  status: "PENDING_REVIEW" | "GRADED";
  fileUrl?: string;
  score?: number;
  maxScore: number;
  feedback?: string;
}

export interface DoubtSession {
  id: string;
  studentName: string;
  batchCode: string;
  topic: string;
  urgency: "HIGH" | "MEDIUM" | "NORMAL";
  requestedAt: string;
  status: "WAITING" | "SCHEDULED" | "RESOLVED";
  meetingTime?: string;
}

export interface TrainerAnnouncement {
  id: string;
  title: string;
  body: string;
  batchCode: string;
  createdAt: string;
}

export interface TrainerStats {
  todayClasses: number;
  totalStudents: number;
  pendingReviews: number;
  openDoubts: number;
  nextClassTime: string;
  nextClassTitle: string;
  nextClassBatch: string;
  nextClassStudents: number;
}

export const initialTrainerStats: TrainerStats = {
  todayClasses: 2,
  totalStudents: 72,
  pendingReviews: 5,
  openDoubts: 3,
  nextClassTime: "Today, 10:00 AM",
  nextClassTitle: "Django REST Architecture & Token Authentication",
  nextClassBatch: "BATCH-PY-2026-A",
  nextClassStudents: 24,
};

export const initialTrainerBatches: TrainerBatch[] = [
  {
    id: "BATCH-PY-2026-A",
    name: "Python Full-Stack Cohort A",
    code: "BATCH-PY-2026-A",
    track: "Python Enterprise Architecture",
    studentsCount: 24,
    progress: 68,
    nextSession: "Today, 10:00 AM",
    module: "Django REST Architecture & Middleware",
    schedule: "Mon, Wed, Fri (10:00 AM - 12:00 PM)",
    students: [
      { id: "STU-101", name: "Rahul Sharma", email: "rahul.s@example.com", attendanceRate: 94, lastPresent: true },
      { id: "STU-102", name: "Karthik Subramanian", email: "karthik.sub@example.com", attendanceRate: 88, lastPresent: true },
      { id: "STU-103", name: "Sneha Patel", email: "sneha.patel@example.com", attendanceRate: 92, lastPresent: true },
      { id: "STU-104", name: "Aditya Roy", email: "aditya.roy@example.com", attendanceRate: 62.5, lastPresent: false },
    ],
  },
  {
    id: "BATCH-REACT-2026-B",
    name: "React Modern Frontend Track",
    code: "BATCH-REACT-2026-B",
    track: "React & Next.js Ecosystem",
    studentsCount: 18,
    progress: 85,
    nextSession: "Tomorrow, 2:00 PM",
    module: "Server Components & TanStack Query",
    schedule: "Tue, Thu, Sat (2:00 PM - 4:00 PM)",
    students: [
      { id: "STU-201", name: "Priya Nair", email: "priya.nair@example.com", attendanceRate: 96, lastPresent: true },
      { id: "STU-202", name: "Divya Krishnan", email: "divya.k@example.com", attendanceRate: 91, lastPresent: true },
      { id: "STU-203", name: "Ritu Singhal", email: "ritu.s@example.com", attendanceRate: 72, lastPresent: false },
    ],
  },
  {
    id: "BATCH-DSA-2026-C",
    name: "DSA & System Design Mastery",
    code: "BATCH-DSA-2026-C",
    track: "Algorithms & Distributed Systems",
    studentsCount: 30,
    progress: 42,
    nextSession: "Thursday, 6:00 PM",
    module: "Graph Traversal & Dynamic Programming",
    schedule: "Tue, Thu (6:00 PM - 8:30 PM)",
    students: [
      { id: "STU-301", name: "Anand Verma", email: "anand.v@example.com", attendanceRate: 95, lastPresent: true },
      { id: "STU-302", name: "Meera Sen", email: "meera.sen@example.com", attendanceRate: 68, lastPresent: false },
      { id: "STU-303", name: "Vikram Malhotra", email: "vikram.m@example.com", attendanceRate: 85, lastPresent: true },
    ],
  },
];

export const initialTrainerSchedule: TrainerScheduleItem[] = [
  {
    id: "SCH-01",
    batchCode: "BATCH-PY-2026-A",
    batchName: "Python Full-Stack Cohort A",
    topic: "Django REST Architecture & Middleware Security",
    date: "Today, 11 Nov",
    time: "10:00 AM - 12:00 PM",
    duration: "2 Hours",
    roomLink: "https://meet.aintrix.edu/room-py-a",
    status: "UPCOMING",
  },
  {
    id: "SCH-02",
    batchCode: "BATCH-REACT-2026-B",
    batchName: "React Modern Frontend Track",
    topic: "Optimistic Mutations with TanStack Query v5",
    date: "Tomorrow, 12 Nov",
    time: "2:00 PM - 4:00 PM",
    duration: "2 Hours",
    roomLink: "https://meet.aintrix.edu/room-react-b",
    status: "UPCOMING",
  },
  {
    id: "SCH-03",
    batchCode: "BATCH-DSA-2026-C",
    batchName: "DSA & System Design Mastery",
    topic: "Dijkstra Algorithm & Shortest Path Trees",
    date: "13 Nov 2026",
    time: "6:00 PM - 8:30 PM",
    duration: "2.5 Hours",
    roomLink: "https://meet.aintrix.edu/room-dsa-c",
    status: "UPCOMING",
  },
];

export const initialAttendanceRoster: Record<string, AttendanceStudent[]> = {
  "BATCH-PY-2026-A": [
    { studentId: "STU-101", name: "Rahul Sharma", rollNo: "PY-01", status: "PRESENT" },
    { studentId: "STU-102", name: "Karthik Subramanian", rollNo: "PY-02", status: "PRESENT" },
    { studentId: "STU-103", name: "Sneha Patel", rollNo: "PY-03", status: "PRESENT" },
    { studentId: "STU-104", name: "Aditya Roy", rollNo: "PY-04", status: "ABSENT" },
    { studentId: "STU-105", name: "Tanmay Bhatia", rollNo: "PY-05", status: "PRESENT" },
  ],
  "BATCH-REACT-2026-B": [
    { studentId: "STU-201", name: "Priya Nair", rollNo: "RE-01", status: "PRESENT" },
    { studentId: "STU-202", name: "Divya Krishnan", rollNo: "RE-02", status: "PRESENT" },
    { studentId: "STU-203", name: "Ritu Singhal", rollNo: "RE-03", status: "ABSENT" },
  ],
  "BATCH-DSA-2026-C": [
    { studentId: "STU-301", name: "Anand Verma", rollNo: "DS-01", status: "PRESENT" },
    { studentId: "STU-302", name: "Meera Sen", rollNo: "DS-02", status: "ABSENT" },
    { studentId: "STU-303", name: "Vikram Malhotra", rollNo: "DS-03", status: "PRESENT" },
  ],
};

export const initialAssignments: TrainerAssignmentSubmission[] = [
  {
    id: "SUB-01",
    studentName: "Rahul Sharma",
    studentEmail: "rahul.s@example.com",
    batchCode: "BATCH-PY-2026-A",
    assignmentTitle: "JWT Auth & Refresh Token Flow in Django",
    submittedAt: "Yesterday, 8:40 PM",
    status: "PENDING_REVIEW",
    maxScore: 100,
    fileUrl: "https://github.com/aintrix-student/jwt-django-assignment",
  },
  {
    id: "SUB-02",
    studentName: "Sneha Patel",
    studentEmail: "sneha.patel@example.com",
    batchCode: "BATCH-REACT-2026-B",
    assignmentTitle: "Infinite Scroll with Cursor Pagination",
    submittedAt: "09 Nov 2026",
    status: "PENDING_REVIEW",
    maxScore: 100,
    fileUrl: "https://github.com/aintrix-student/react-infinite-query",
  },
  {
    id: "SUB-03",
    studentName: "Karthik Subramanian",
    studentEmail: "karthik.sub@example.com",
    batchCode: "BATCH-PY-2026-A",
    assignmentTitle: "PostgreSQL Database Pooling & Index Tuning",
    submittedAt: "08 Nov 2026",
    status: "GRADED",
    score: 95,
    maxScore: 100,
    feedback: "Exceptional composite index strategy and connection timeout handling.",
  },
  {
    id: "SUB-04",
    studentName: "Anand Verma",
    studentEmail: "anand.v@example.com",
    batchCode: "BATCH-DSA-2026-C",
    assignmentTitle: "Trie Tree Prefix Search Implementation",
    submittedAt: "07 Nov 2026",
    status: "GRADED",
    score: 92,
    maxScore: 100,
    feedback: "Clean memory release and recursive traversal implementation.",
  },
];

export const initialDoubts: DoubtSession[] = [
  {
    id: "DBT-01",
    studentName: "Aditya Roy",
    batchCode: "BATCH-PY-2026-A",
    topic: "Django ORM select_related vs prefetch_related N+1 queries",
    urgency: "HIGH",
    requestedAt: "Today, 8:15 AM",
    status: "WAITING",
  },
  {
    id: "DBT-02",
    studentName: "Ritu Singhal",
    batchCode: "BATCH-REACT-2026-B",
    topic: "Race conditions in useEffect cleanup with AbortController",
    urgency: "MEDIUM",
    requestedAt: "Yesterday, 6:30 PM",
    status: "WAITING",
  },
  {
    id: "DBT-03",
    studentName: "Meera Sen",
    batchCode: "BATCH-DSA-2026-C",
    topic: "Dynamic Programming Memoization vs Tabulation on Knapsack",
    urgency: "HIGH",
    requestedAt: "Yesterday, 3:00 PM",
    status: "SCHEDULED",
    meetingTime: "Today, 4:30 PM",
  },
];

export const initialTrainerAnnouncements: TrainerAnnouncement[] = [
  {
    id: "TANN-01",
    title: "Docker Compose Practice Repositories Uploaded",
    body: "Please clone the multi-container compose repo before today's 10 AM session.",
    batchCode: "BATCH-PY-2026-A",
    createdAt: "Today, 7:00 AM",
  },
  {
    id: "TANN-02",
    title: "TanStack Query v5 Code Sandbox Links",
    body: "Sandbox examples for query cancellation and retry strategies are now in student LMS units.",
    batchCode: "BATCH-REACT-2026-B",
    createdAt: "09 Nov 2026",
  },
];

