export type TrainerNavTab =
  | "dashboard"
  | "batches"
  | "schedule"
  | "attendance"
  | "assignments"
  | "doubts"
  | "announcements";


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
