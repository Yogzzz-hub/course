export type ManagerNavTab =
  | "dashboard"
  | "leads"
  | "admissions"
  | "cohorts"
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

