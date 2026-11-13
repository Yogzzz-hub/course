import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  managerApi,
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
  ManagerBottomNav,
  type ManagerNavTab,
  type ToastMessage,
  type Lead,
  type Admission,
  type CohortSeat,
  type AttendanceAlert,
  type FeePayment,
  type Counsellor,
  type Announcement,
  type ManagerStats,
  type ManagerReportsData,
} from "../components/manager-portal";
import {
  readScheduledClasses,
  writeScheduledClasses,
  type ScheduledClassItem,
} from "../utils/classScheduleStore";

const EMPTY_STATS: ManagerStats = {
  newEnquiries: 0,
  pendingFollowUps: 0,
  activeStudents: 0,
  runningBatches: 0,
  attendanceAlertsCount: 0,
  pendingAdmissionsCount: 0,
  totalRevenue: "₹ 0",
};

const EMPTY_REPORTS: ManagerReportsData = { monthlyAdmissions: [], trackBreakdown: [] };

export default function ManagerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ManagerNavTab>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stats, setStats] = useState<ManagerStats>(EMPTY_STATS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [cohorts, setCohorts] = useState<CohortSeat[]>([]);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reports, setReports] = useState<ManagerReportsData>(EMPTY_REPORTS);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClassItem[]>(() => readScheduledClasses());
  const [selectedScheduleBatch, setSelectedScheduleBatch] = useState<string | undefined>(undefined);

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

  const loadSnapshot = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const snapshot = await managerApi.getSnapshot();
      setStats(snapshot.stats);
      setLeads(snapshot.leads);
      setAdmissions(snapshot.admissions);
      setCohorts(snapshot.cohorts);
      setAlerts(snapshot.alerts);
      setPayments(snapshot.payments);
      setCounsellors(snapshot.counsellors);
      setAnnouncements(snapshot.announcements);
      setReports(snapshot.reports);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load manager data from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const handleSaveScheduledClass = (item: ScheduledClassItem, isEdit: boolean) => {
    setScheduledClasses((prev) => {
      const next = isEdit ? prev.map((existing) => (existing.id === item.id ? item : existing)) : [item, ...prev];
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

  const handleLogout = () => {
    try {
      localStorage.removeItem("crm_session");
    } catch {}
    navigate("/login");
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    managerApi.updateLead(updated.id, { status: updated.status }).catch((err) => {
      addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save lead update." });
    });
  };

  const handleUpdateAdmission = (updated: Admission) => {
    setAdmissions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    managerApi.updateAdmission(updated.id, updated.status).catch((err) => {
      addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save admission update." });
    });
  };

  const handleUpdateAlert = (updated: AttendanceAlert) => {
    setAlerts((prev) => prev.map((al) => (al.id === updated.id ? updated : al)));
    managerApi.updateAlert(updated.id, { warningSent: updated.warningSent }).catch((err) => {
      addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save alert update." });
    });
  };

  const handlePublishAnnouncement = (newAnn: Announcement) => {
    setAnnouncements((prev) => [newAnn, ...prev]);
    managerApi
      .publishAnnouncement({ title: newAnn.title, body: newAnn.body, author: newAnn.author, audience: newAnn.audience, priority: newAnn.priority })
      .catch((err) => {
        addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save announcement." });
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

        <main className="manager-main p-3 sm:p-5 md:p-6 pb-20 md:pb-6 flex-1 w-full space-y-4">
          {loadError && (
            <div
              className="p-3 rounded-lg border text-xs flex items-center justify-between gap-3"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)", color: "var(--text)" }}
            >
              <span>Could not load live data from the database: {loadError}</span>
              <button
                className="shrink-0 px-2.5 py-1 rounded-md font-semibold"
                style={{ backgroundColor: "var(--accent)", color: "white" }}
                onClick={() => void loadSnapshot()}
              >
                Retry
              </button>
            </div>
          )}

          {loading && !loadError ? (
            <div className="text-xs py-10 text-center" style={{ color: "var(--muted)" }}>
              Loading manager data from the database...
            </div>
          ) : (
            <>
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

              {activeTab === "reports" && <ReportsView reports={reports} onAddToast={addToast} />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar matching reference UI */}
      <ManagerBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMore={() => setMobileSidebarOpen(true)}
        approvalsBadgeCount={stats.pendingAdmissionsCount}
      />

      {/* Global Interactive Toast Notification Host */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
