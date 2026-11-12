import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  initialManagerStats,
  initialLeads,
  initialAdmissions,
  initialCohorts,
  initialAttendanceAlerts,
  initialFeePayments,
  initialCounsellors,
  initialAnnouncements,
  type Lead,
  type Admission,
  type AttendanceAlert,
  type Announcement,
} from "../data/managerMock";
import {
  readScheduledClasses,
  writeScheduledClasses,
  type ScheduledClassItem,
} from "../utils/classScheduleStore";
import {
  ManagerSidebar,
  ManagerHeader,
  DashboardView,
  LeadsView,
  AdmissionsView,
  CohortsView,
  ScheduleClassesView,
  AttendanceAlertsView,
  FeesView,
  CounsellorsView,
  AnnouncementsView,
  ReportsView,
  ToastContainer,
  type ManagerNavTab,
  type ToastMessage,
} from "../components/manager-portal";

export default function ManagerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ManagerNavTab>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Live state connected to mocks (with backend sync capability)
  const [stats, setStats] = useState(initialManagerStats);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [admissions, setAdmissions] = useState<Admission[]>(initialAdmissions);
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>(initialAttendanceAlerts);
  const [payments, setPayments] = useState(initialFeePayments);
  const [counsellors, setCounsellors] = useState(initialCounsellors);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClassItem[]>(() =>
    readScheduledClasses()
  );
  const [selectedScheduleBatch, setSelectedScheduleBatch] = useState<string | undefined>(undefined);

  useEffect(() => {
    setScheduledClasses(readScheduledClasses());
  }, []);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: {
    type: "success" | "info" | "warning" | "danger";
    title: string;
    message: string;
  }) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("crm_session");
    } catch {}
    navigate("/login");
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleUpdateAdmission = (updated: Admission) => {
    setAdmissions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleUpdateAlert = (updated: AttendanceAlert) => {
    setAlerts((prev) => prev.map((al) => (al.id === updated.id ? updated : al)));
  };

  const handlePublishAnnouncement = (newAnn: Announcement) => {
    setAnnouncements((prev) => [newAnn, ...prev]);
  };

  const handleSaveScheduledClass = (item: ScheduledClassItem, isEdit: boolean) => {
    setScheduledClasses((prev) => {
      const next = isEdit
        ? prev.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...prev];
      writeScheduledClasses(next);
      return next;
    });
  };

  const handleDeleteScheduledClass = (id: string) => {
    setScheduledClasses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeScheduledClasses(next);
      return next;
    });
  };

  return (
    <div
      className="manager-workspace min-h-screen flex flex-col md:flex-row transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <ManagerSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Side Drawer Navigation */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Side Drawer Panel */}
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <ManagerSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
              onClose={() => setMobileSidebarOpen(false)}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <ManagerHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onLogout={handleLogout}
          onQuickAction={(action) => {
            if (action === "create_lead") {
              addToast({
                type: "info",
                title: "Create Lead",
                message: "Fill in candidate enquiry details to register new lead.",
              });
            } else if (action === "create_class") {
              setSelectedScheduleBatch(undefined);
              setActiveTab("schedule");
            } else if (action === "export_csv") {
              addToast({
                type: "success",
                title: "CSV Export",
                message: "Downloading data report for your offline records.",
              });
            }
          }}
        />

        <main className="manager-main p-3 sm:p-5 md:p-6 pb-6 flex-1 w-full space-y-4">
          {activeTab === "dashboard" && (
            <DashboardView
              stats={stats}
              leads={leads}
              admissions={admissions}
              alerts={alerts}
              onNavigateTab={setActiveTab}
              onSelectLead={() => setActiveTab("leads")}
            />
          )}

          {activeTab === "leads" && (
            <LeadsView
              leads={leads}
              counsellors={counsellors}
              onAddToast={addToast}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {activeTab === "admissions" && (
            <AdmissionsView
              admissions={admissions}
              onAddToast={addToast}
              onUpdateAdmission={handleUpdateAdmission}
            />
          )}

          {activeTab === "cohorts" && (
            <CohortsView
              cohorts={cohorts}
              onScheduleBatch={(batchCode) => {
                setSelectedScheduleBatch(batchCode);
                setActiveTab("schedule");
              }}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleClassesView
              cohorts={cohorts}
              classes={scheduledClasses}
              initialBatchCode={selectedScheduleBatch}
              onSaveClass={handleSaveScheduledClass}
              onDeleteClass={handleDeleteScheduledClass}
              onAddToast={addToast}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceAlertsView
              alerts={alerts}
              onAddToast={addToast}
              onUpdateAlert={handleUpdateAlert}
            />
          )}

          {activeTab === "fees" && (
            <FeesView payments={payments} onAddToast={addToast} />
          )}

          {activeTab === "counsellors" && (
            <CounsellorsView counsellors={counsellors} onAddToast={addToast} />
          )}

          {activeTab === "announcements" && (
            <AnnouncementsView
              announcements={announcements}
              onAddToast={addToast}
              onPublishAnnouncement={handlePublishAnnouncement}
            />
          )}

          {activeTab === "reports" && <ReportsView onAddToast={addToast} />}
        </main>
      </div>

      {/* Global Interactive Toast Notification Host */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
