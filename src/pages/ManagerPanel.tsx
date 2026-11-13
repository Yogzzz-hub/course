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
import { readCrmSession, isManagerAuthorized, clearCrmSession } from "../utils/authSession";

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

  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadTrack, setNewLeadTrack] = useState("Python Full-Stack");
  const [newLeadSubmitting, setNewLeadSubmitting] = useState(false);

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

      try {
        const schedRes = await managerApi.getSchedule();
        if (schedRes.classes && schedRes.classes.length) {
          setScheduledClasses(schedRes.classes);
          writeScheduledClasses(schedRes.classes);
        }
      } catch {}
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load manager data from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = readCrmSession();
    if (!session || !isManagerAuthorized(session)) {
      navigate("/login?returnTo=/manager", { replace: true });
      return;
    }
    void loadSnapshot();
  }, [navigate]);

  const handleSaveScheduledClass = async (item: ScheduledClassItem, isEdit: boolean) => {
    try {
      const res = await managerApi.createSchedule({
        batchCode: item.batchCode,
        topic: item.topic,
        dateIso: item.dateIso || new Date().toISOString().slice(0, 10),
        startTime: item.startTime || "10:00",
        endTime: item.endTime || "12:00",
        roomLink: item.roomLink,
      });
      const savedItem: ScheduledClassItem = { ...item, id: res.item.id };
      setScheduledClasses((prev) => {
        const next = isEdit ? prev.map((existing) => (existing.id === item.id ? savedItem : existing)) : [savedItem, ...prev];
        writeScheduledClasses(next);
        return next;
      });
      addToast({
        type: "success",
        title: "Class Scheduled",
        message: `Class for ${item.batchCode} saved to database schedule.`,
      });
    } catch {
      setScheduledClasses((prev) => {
        const next = isEdit ? prev.map((existing) => (existing.id === item.id ? item : existing)) : [item, ...prev];
        writeScheduledClasses(next);
        return next;
      });
      addToast({
        type: "info",
        title: "Schedule Saved",
        message: `Session recorded for ${item.batchCode}.`,
      });
    }
  };

  const handleDeleteScheduledClass = (id: string) => {
    setScheduledClasses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeScheduledClasses(next);
      return next;
    });
    managerApi.deleteSchedule(id).catch(() => {});
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadEmail.trim()) {
      addToast({ type: "warning", title: "Missing Information", message: "Please enter candidate name and email." });
      return;
    }
    setNewLeadSubmitting(true);
    try {
      const { lead: created } = await managerApi.createLead({
        fullName: newLeadName.trim(),
        email: newLeadEmail.trim(),
        phone: newLeadPhone.trim(),
        courseTrack: newLeadTrack,
      });
      setLeads((prev) => [created, ...prev]);
      setNewLeadModalOpen(false);
      setNewLeadName("");
      setNewLeadEmail("");
      setNewLeadPhone("");
      addToast({
        type: "success",
        title: "Lead Created",
        message: `${created.name} registered into candidate leads pipeline.`,
      });
    } catch (err) {
      addToast({
        type: "danger",
        title: "Creation Failed",
        message: err instanceof Error ? err.message : "Could not create lead.",
      });
    } finally {
      setNewLeadSubmitting(false);
    }
  };

  const exportActiveDataToCsv = () => {
    const filename = `manager_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = "";
    if (activeTab === "leads") {
      csvContent = "ID,Name,Email,Phone,Track,Status,Score,Date\n" +
        leads.map((l) => `"${l.id}","${l.name}","${l.email}","${l.phone}","${l.track}","${l.status}","${l.score}","${l.date}"`).join("\n");
    } else if (activeTab === "admissions") {
      csvContent = "ID,Student Name,Reg No,Course,Batch,Enrolled Date,Fee Status,Status\n" +
        admissions.map((a) => `"${a.id}","${a.studentName}","${a.registrationNumber}","${a.course}","${a.batch}","${a.enrolledDate}","${a.feeStatus}","${a.status}"`).join("\n");
    } else {
      csvContent = "ID,Invoice ID,Student Name,Course,Amount,Due Date,Paid Date,Status,Method\n" +
        payments.map((p) => `"${p.id}","${p.invoiceId}","${p.studentName}","${p.course}","${p.amount}","${p.dueDate}","${p.paidDate || ''}","${p.status}","${p.method || ''}"`).join("\n");
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      type: "success",
      title: "CSV Exported",
      message: `Downloaded ${filename} for offline analysis.`,
    });
  };

  const handleLogout = () => {
    clearCrmSession();
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
              setNewLeadModalOpen(true);
            } else if (action === "create_class") {
              setSelectedScheduleBatch(undefined);
              setActiveTab("schedule");
            } else if (action === "export_csv") {
              exportActiveDataToCsv();
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

      {/* New Candidate Lead Registration Modal */}
      {newLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setNewLeadModalOpen(false)}
            aria-hidden="true"
          />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl border"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
                Register New Candidate Lead
              </h3>
              <button
                type="button"
                onClick={() => setNewLeadModalOpen(false)}
                className="p-1 rounded-md transition-opacity hover:opacity-70 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
                  Course of Interest
                </label>
                <select
                  value={newLeadTrack}
                  onChange={(e) => setNewLeadTrack(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="Python Full-Stack">Python Full-Stack Cohort</option>
                  <option value="React Development">Modern React & Frontend</option>
                  <option value="Django Backend">Django REST Backend</option>
                  <option value="DSA & System Design">DSA & Technical Interview</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewLeadModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium border cursor-pointer"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newLeadSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-opacity"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-contrast)",
                    opacity: newLeadSubmitting ? 0.6 : 1,
                  }}
                >
                  {newLeadSubmitting ? "Registering..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Interactive Toast Notification Host */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
