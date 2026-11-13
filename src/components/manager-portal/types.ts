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

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "warning" | "danger";
  title: string;
  message: string;
}

