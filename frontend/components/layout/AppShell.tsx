"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileText,
  DollarSign,
  User,
  Users,
  Settings,
  ShieldCheck,
  ClipboardList,
  Clock,
  Menu,
  X,
  LogOut,
  GraduationCap,
  Layers,
  AlertCircle,
  Award,
  Bell,
  CreditCard,
  RotateCcw,
  FileCheck,
  Database,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/ui/Toast";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: "STUDENT" | "TRAINER" | "MANAGER" | "ADMIN" | "FINANCIER";
    registrationNumber?: string;
  };
  children: React.ReactNode;
}

interface NotificationItem {
  id: string;
  subject?: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export const AppShellContext = React.createContext<boolean>(false);

export function AppShell({ user, children }: AppShellProps) {
  const isInsideShell = React.useContext(AppShellContext);
  if (isInsideShell) {
    return <>{children}</>;
  }
  return (
    <ToastProvider>
      <AppShellInner user={user}>{children}</AppShellInner>
    </ToastProvider>
  );
}

function AppShellInner({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // In-App Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setNotifOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Synchronize session details
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email || prev.email,
            role: data.user.role || prev.role,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, markAll: !id }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      setCurrentUser((prev) => ({
        ...prev,
        ...user,
      }));
    }
  }, [user]);

  // Define nav links by role
  const getNavItems = (): NavItem[] => {
    switch (currentUser.role) {
      case "STUDENT":
        return [
          { title: "Overview", href: "/student", icon: <LayoutDashboard className="w-4 h-4" /> },
          { title: "Learning & Lessons", href: "/student/learning", icon: <BookOpen className="w-4 h-4" /> },
          { title: "Assignments", href: "/student/assignments", icon: <FileText className="w-4 h-4" /> },
          { title: "Quizzes & Tests", href: "/student/quizzes", icon: <ClipboardList className="w-4 h-4" /> },
          { title: "Projects & Labs", href: "/student/projects", icon: <Layers className="w-4 h-4" /> },
          { title: "Academic Performance", href: "/student/performance", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Course Feedback", href: "/student/feedback", icon: <MessageSquare className="w-4 h-4" /> },
          { title: "Calendar", href: "/student/calendar", icon: <Calendar className="w-4 h-4" /> },
          { title: "Class History", href: "/student/classes", icon: <Clock className="w-4 h-4" /> },
          { title: "Attendance", href: "/student/attendance", icon: <CheckCircle2 className="w-4 h-4" /> },
          { title: "Tuition & Receipts", href: "/student/fees", icon: <DollarSign className="w-4 h-4" /> },
          { title: "Certificates", href: "/student/certificates", icon: <Award className="w-4 h-4" /> },
          { title: "Communication", href: "/student/communication-preferences", icon: <Bell className="w-4 h-4" /> },
          { title: "Requests", href: "/student/requests", icon: <ClipboardList className="w-4 h-4" /> },
          { title: "Profile", href: "/student/profile", icon: <User className="w-4 h-4" /> },
        ];
      case "TRAINER":
        return [
          { title: "Overview", href: "/trainer", icon: <LayoutDashboard className="w-4 h-4" /> },
          { title: "Curriculum Materials", href: "/trainer/learning", icon: <BookOpen className="w-4 h-4" /> },
          { title: "Assignments & Rubrics", href: "/trainer/assignments", icon: <FileText className="w-4 h-4" /> },
          { title: "Question Bank", href: "/trainer/question-bank", icon: <Database className="w-4 h-4" /> },
          { title: "Quizzes & Exams", href: "/trainer/quizzes", icon: <ClipboardList className="w-4 h-4" /> },
          { title: "Projects & Labs", href: "/trainer/projects", icon: <Layers className="w-4 h-4" /> },
          { title: "Academic Analytics", href: "/trainer/analytics", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Assigned Batches", href: "/trainer/batches", icon: <Layers className="w-4 h-4" /> },
          { title: "Schedule Calendar", href: "/trainer/calendar", icon: <Calendar className="w-4 h-4" /> },
          { title: "Session Entry", href: "/trainer/session-entry", icon: <CheckCircle2 className="w-4 h-4" /> },
          { title: "Class History", href: "/trainer/class-history", icon: <Clock className="w-4 h-4" /> },
          { title: "Syllabus Coverage", href: "/trainer/progress", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Earnings & Payroll", href: "/trainer/earnings", icon: <DollarSign className="w-4 h-4" /> },
          { title: "Corrections", href: "/trainer/corrections", icon: <AlertCircle className="w-4 h-4" /> },
          { title: "Profile", href: "/trainer/profile", icon: <User className="w-4 h-4" /> },
        ];
      case "MANAGER":
        return [
          { title: "Overview", href: "/manager", icon: <LayoutDashboard className="w-4 h-4" /> },
          { title: "Academic Analytics", href: "/manager/academic-analytics", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Enquiries & CRM", href: "/manager/enquiries", icon: <Users className="w-4 h-4" /> },
          { title: "Follow-ups", href: "/manager/follow-ups", icon: <Clock className="w-4 h-4" /> },
          { title: "Admissions", href: "/manager/admissions", icon: <FileText className="w-4 h-4" /> },
          { title: "Students", href: "/manager/students", icon: <GraduationCap className="w-4 h-4" /> },
          { title: "Batches", href: "/manager/batches", icon: <Layers className="w-4 h-4" /> },
          { title: "Master Calendar", href: "/manager/calendar", icon: <Calendar className="w-4 h-4" /> },
          { title: "Attendance Alerts", href: "/manager/attendance-alerts", icon: <AlertCircle className="w-4 h-4" /> },
          { title: "Student Requests", href: "/manager/requests", icon: <ClipboardList className="w-4 h-4" /> },
          { title: "Reports", href: "/manager/reports", icon: <TrendingUp className="w-4 h-4" /> },
        ];
      case "ADMIN":
        return [
          { title: "Overview", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
          { title: "Academic Policies", href: "/admin/academic-policies", icon: <GraduationCap className="w-4 h-4" /> },
          { title: "Financial Approvals", href: "/admin/financial-approvals", icon: <ShieldCheck className="w-4 h-4" /> },
          { title: "Certificates", href: "/admin/certificates", icon: <Award className="w-4 h-4" /> },
          { title: "Trainer Compensation", href: "/admin/trainer-compensation", icon: <DollarSign className="w-4 h-4" /> },
          { title: "Notifications Engine", href: "/admin/notifications", icon: <Bell className="w-4 h-4" /> },
          { title: "User Management", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
          { title: "Courses", href: "/admin/courses", icon: <BookOpen className="w-4 h-4" /> },
          { title: "Syllabus Versions", href: "/admin/syllabus", icon: <Layers className="w-4 h-4" /> },
          { title: "Batches & Timetable", href: "/admin/batches", icon: <Calendar className="w-4 h-4" /> },
          { title: "Admissions", href: "/admin/admissions", icon: <FileText className="w-4 h-4" /> },
          { title: "Approvals Queue", href: "/admin/approvals", icon: <ShieldCheck className="w-4 h-4" /> },
          { title: "Academic Progress", href: "/admin/progress", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Operational Reports", href: "/admin/reports", icon: <ClipboardList className="w-4 h-4" /> },
          { title: "Audit Logs", href: "/admin/audit-logs", icon: <FileText className="w-4 h-4" /> },
          { title: "Academy Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
        ];
      case "FINANCIER":
        return [
          { title: "Overview", href: "/financier", icon: <LayoutDashboard className="w-4 h-4" /> },
          { title: "Payments Ledger", href: "/financier/payments", icon: <CreditCard className="w-4 h-4" /> },
          { title: "Installment Aging", href: "/financier/installments", icon: <Calendar className="w-4 h-4" /> },
          { title: "Refunds & Adjustments", href: "/financier/refunds", icon: <RotateCcw className="w-4 h-4" /> },
          { title: "Trainer Payroll", href: "/financier/trainer-payments", icon: <Users className="w-4 h-4" /> },
          { title: "Operational Expenses", href: "/financier/expenses", icon: <DollarSign className="w-4 h-4" /> },
          { title: "Bank Reconciliation", href: "/financier/reconciliation", icon: <FileCheck className="w-4 h-4" /> },
          { title: "Financial Reports", href: "/financier/reports", icon: <TrendingUp className="w-4 h-4" /> },
          { title: "Fee Agreements", href: "/financier/fee-agreements", icon: <FileText className="w-4 h-4" /> },
          { title: "Enrolled Students", href: "/financier/students", icon: <GraduationCap className="w-4 h-4" /> },
          { title: "Profile", href: "/financier/profile", icon: <User className="w-4 h-4" /> },
        ];
    }
  };

  const navItems = getNavItems();

  // Primary mobile navigation shortcuts (4 items per role)
  const getMobileBottomNavItems = (
    role?: "STUDENT" | "TRAINER" | "MANAGER" | "ADMIN" | "FINANCIER"
  ): { title: string; href: string; icon: React.ReactNode }[] => {
    const targetRole = role || currentUser.role;
    switch (targetRole) {
      case "STUDENT":
        return [
          { title: "Home", href: "/student", icon: <LayoutDashboard className="w-5 h-5" /> },
          { title: "Lessons", href: "/student/learning", icon: <BookOpen className="w-5 h-5" /> },
          { title: "Fees", href: "/student/fees", icon: <DollarSign className="w-5 h-5" /> },
          { title: "Tasks", href: "/student/assignments", icon: <FileText className="w-5 h-5" /> },
        ];
      case "TRAINER":
        return [
          { title: "Home", href: "/trainer", icon: <LayoutDashboard className="w-5 h-5" /> },
          { title: "Sessions", href: "/trainer/session-entry", icon: <CheckCircle2 className="w-5 h-5" /> },
          { title: "Batches", href: "/trainer/batches", icon: <Layers className="w-5 h-5" /> },
          { title: "Grading", href: "/trainer/assignments", icon: <FileText className="w-5 h-5" /> },
        ];
      case "MANAGER":
        return [
          { title: "Home", href: "/manager", icon: <LayoutDashboard className="w-5 h-5" /> },
          { title: "Leads", href: "/manager/enquiries", icon: <Users className="w-5 h-5" /> },
          { title: "Students", href: "/manager/students", icon: <GraduationCap className="w-5 h-5" /> },
          { title: "Batches", href: "/manager/batches", icon: <Layers className="w-5 h-5" /> },
        ];
      case "FINANCIER":
        return [
          { title: "Home", href: "/financier", icon: <LayoutDashboard className="w-5 h-5" /> },
          { title: "Payments", href: "/financier/payments", icon: <CreditCard className="w-5 h-5" /> },
          { title: "Aging", href: "/financier/installments", icon: <Calendar className="w-5 h-5" /> },
          { title: "Expenses", href: "/financier/expenses", icon: <DollarSign className="w-5 h-5" /> },
        ];
      case "ADMIN":
        return [
          { title: "Home", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
          { title: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
          { title: "Approvals", href: "/admin/approvals", icon: <ShieldCheck className="w-5 h-5" /> },
          { title: "Courses", href: "/admin/courses", icon: <BookOpen className="w-5 h-5" /> },
        ];
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <AppShellContext.Provider value={true}>
      <div className="h-screen w-full flex overflow-hidden bg-[#FBF9F5]">
        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar (Desktop Persistent & Mobile Drawer) */}
        <aside
          aria-label="Sidebar Navigation"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E9E0D8] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:static lg:h-full lg:shrink-0 lg:translate-x-0 shadow-xs",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Brand Header */}
          <div className="p-4 border-b border-[#E9E0D8] flex items-center justify-between shrink-0 bg-[#FBF9F5]">
            <Link href={`/${currentUser.role.toLowerCase()}`} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-[#4E0F1E] transition-colors">
                A
              </div>
              <div>
                <span className="font-serif font-bold text-sm tracking-tight text-[#251923] block leading-tight">
                  Apex Academy
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#C9A24B]">
                  {currentUser.role} Portal
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#6B6268] hover:bg-[#E9E0D8]/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/${currentUser.role.toLowerCase()}` && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 min-h-[44px] select-none",
                    isActive
                      ? "bg-[#6D1A2B] text-white shadow-xs"
                      : "text-[#251923] hover:bg-[#F5F0E8] hover:text-[#6D1A2B]"
                  )}
                >
                  <span className={cn("shrink-0", isActive ? "text-[#C9A24B]" : "text-[#6D1A2B]")}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Card & Logout in Sidebar Footer */}
          <div className="p-3 border-t border-[#E9E0D8] bg-[#FBF9F5] shrink-0 space-y-2">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#E9E0D8]">
              <div className="w-8 h-8 rounded-full bg-[#6D1A2B] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {currentUser.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#251923] truncate">
                  {currentUser.name || "Academy Member"}
                </p>
                <p className="text-[10px] text-[#6B6268] truncate">
                  {currentUser.registrationNumber || currentUser.email || `${currentUser.role.toLowerCase()}@apexacademy.edu`}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEECEB] rounded-xl transition-colors border border-[#FDA29B]/50 min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-14 shrink-0 bg-white border-b border-[#E9E0D8] px-3 sm:px-6 flex items-center justify-between z-30 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#251923] hover:bg-[#F5F0E8] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6B6268]">
                <Link
                  href={`/${currentUser.role.toLowerCase()}`}
                  className="hover:text-[#6D1A2B] font-medium hidden sm:inline transition-colors"
                >
                  Portal Home
                </Link>
                <span className="text-[#E9E0D8] hidden sm:inline">/</span>
                <span className="font-semibold text-[#251923] capitalize truncate max-w-[150px] sm:max-w-none">
                  {pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Dashboard"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 relative">
              {/* Notifications Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-xl text-[#251923] hover:bg-[#F5F0E8] focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  title="Notifications"
                  aria-label="Toggle notifications menu"
                >
                  <Bell className="w-4 h-4 text-[#251923]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#B42318] ring-2 ring-white" />
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E9E0D8] z-50 overflow-hidden animate-pop-in max-w-sm sm:max-w-none">
                    <div className="p-3 bg-[#FBF9F5] border-b border-[#E9E0D8] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#251923]">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => handleMarkAsRead()}
                          className="text-[11px] text-[#6D1A2B] hover:underline font-semibold p-1"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#E9E0D8]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-[#6B6268]">
                          No recent notifications.
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "p-3 text-xs transition-colors",
                              n.isRead ? "bg-white" : "bg-[#FAF6EC]/60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-[#251923] leading-tight">
                                {n.subject || "Academic Alert"}
                              </p>
                              {!n.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-[10px] text-[#6B6268] hover:text-[#251923] p-1"
                                  title="Mark as read"
                                >
                                  ✓
                                </button>
                              )}
                            </div>
                            <p className="text-[#6B6268] text-[11px] mt-1 leading-snug">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-[#6B6268]">
                              <span>
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {n.linkUrl && (
                                <Link
                                  href={n.linkUrl}
                                  onClick={() => {
                                    setNotifOpen(false);
                                    handleMarkAsRead(n.id);
                                  }}
                                  className="text-[#6D1A2B] font-semibold hover:underline p-1"
                                >
                                  View Details →
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Pill */}
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FAF6EC] text-[#997324] border border-[#DEC278] shrink-0">
                {currentUser.role}
              </span>
            </div>
          </header>

          {/* Page Content Viewport */}
          <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-24 lg:pb-12 animate-fade-in">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar */}
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E9E0D8] px-2 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center justify-around max-w-lg mx-auto">
              {getMobileBottomNavItems(currentUser.role).map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== `/${currentUser.role.toLowerCase()}` && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-colors min-h-[48px] min-w-[56px]",
                      isActive
                        ? "text-[#6D1A2B]"
                        : "text-[#6B6268] hover:text-[#6D1A2B]"
                    )}
                  >
                    <span
                      className={cn(
                        "p-1 rounded-lg transition-transform",
                        isActive ? "bg-[#FAF6EC] scale-110 text-[#6D1A2B]" : ""
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate mt-0.5">{item.title}</span>
                  </Link>
                );
              })}
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold text-[#6B6268] hover:text-[#6D1A2B] min-h-[48px] min-w-[56px]"
                aria-label="Open full portal navigation"
              >
                <span className="p-1 rounded-lg">
                  <Menu className="w-5 h-5" />
                </span>
                <span className="truncate mt-0.5">More</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}
