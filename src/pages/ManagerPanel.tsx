import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { exportToCsv } from "../utils/csvExport";
import { createInitialManagerFallback } from "../data/managerFallbackData";
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

  useEffect(() => {
    const session = readCrmSession();
    if (!session || !isManagerAuthorized(session)) {
      navigate("/login?returnUrl=/manager", { replace: true });
    }
  }, [navigate]);

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

  // Create Lead Modal State
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadTrack, setNewLeadTrack] = useState("Python Full Stack");
  const [newLeadCounsellor, setNewLeadCounsellor] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCreateLeadOpen(false);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      console.warn("[ManagerPanel] Database offline, loaded offline fallback dataset:", err);
      const fallback = createInitialManagerFallback();
      setStats(fallback.stats);
      setLeads(fallback.leads);
      setAdmissions(fallback.admissions);
      setCohorts(fallback.cohorts);
      setAlerts(fallback.alerts);
      setPayments(fallback.payments);
      setCounsellors(fallback.counsellors);
      setAnnouncements(fallback.announcements);
      setReports(fallback.reports);
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
    setAdmissions((prev) =>
      prev.some((a) => a.id === updated.id)
        ? prev.map((a) => (a.id === updated.id ? updated : a))
        : [updated, ...prev]
    );
    managerApi.updateAdmission(updated.id, updated.status).catch((err) => {
      addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save admission update." });
    });
  };

  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadEmail.trim()) return;

    const newLead: Lead = {
      id: `LEAD-${Date.now().toString().slice(-4)}`,
      name: newLeadName.trim(),
      email: newLeadEmail.trim(),
      phone: newLeadPhone.trim() || "+91 98765 00000",
      track: newLeadTrack,
      date: "Today",
      status: "New Lead",
      assignedCounsellor: newLeadCounsellor || counsellors[0]?.name || "Unassigned",
      notes: newLeadNotes.trim() ? [newLeadNotes.trim()] : ["Candidate registered via Manager Enrolment Desk."],
      source: "Manager Console",
      score: 85,
    };

    setLeads((prev) => [newLead, ...prev]);
    setIsCreateLeadOpen(false);
    managerApi.createLead({
      fullName: newLeadName.trim(),
      email: newLeadEmail.trim(),
      phone: newLeadPhone.trim(),
      courseTrack: newLeadTrack,
    }).catch(() => {});
    setNewLeadName("");
    setNewLeadEmail("");
    setNewLeadPhone("");
    setNewLeadNotes("");
    addToast({
      type: "success",
      title: "Lead Created",
      message: `Lead ${newLead.name} enrolled for ${newLead.track}.`,
    });
  };

  const handleExportManagerCsv = (tab: ManagerNavTab) => {
    const today = new Date().toISOString().slice(0, 10);
    if (tab === "leads") {
      exportToCsv(`aintrix-manager-leads-${today}.csv`, leads, [
        { header: "Lead ID", accessor: (l) => l.id },
        { header: "Name", accessor: (l) => l.name },
        { header: "Email", accessor: (l) => l.email },
        { header: "Phone", accessor: (l) => l.phone },
        { header: "Track", accessor: (l) => l.track },
        { header: "Status", accessor: (l) => l.status },
        { header: "Counsellor", accessor: (l) => l.assignedCounsellor },
        { header: "Score", accessor: (l) => l.score },
      ]);
    } else if (tab === "admissions") {
      exportToCsv(`aintrix-manager-admissions-${today}.csv`, admissions, [
        { header: "Reg No", accessor: (a) => a.registrationNumber },
        { header: "Name", accessor: (a) => a.studentName },
        { header: "Email", accessor: (a) => a.email },
        { header: "Phone", accessor: (a) => a.phone },
        { header: "Course", accessor: (a) => a.course },
        { header: "Batch", accessor: (a) => a.batch },
        { header: "Fee Status", accessor: (a) => a.feeStatus },
        { header: "Status", accessor: (a) => a.status },
      ]);
    } else if (tab === "cohorts") {
      exportToCsv(`aintrix-manager-cohorts-${today}.csv`, cohorts, [
        { header: "Cohort Code", accessor: (c) => c.code },
        { header: "Course", accessor: (c) => c.courseTitle },
        { header: "Faculty", accessor: (c) => c.facultyName },
        { header: "Enrolled", accessor: (c) => c.enrolledCount },
        { header: "Max Seats", accessor: (c) => c.maxSeats },
        { header: "Status", accessor: (c) => c.status },
        { header: "Progress %", accessor: (c) => `${c.progress}%` },
      ]);
    } else if (tab === "fees") {
      exportToCsv(`aintrix-manager-fees-${today}.csv`, payments, [
        { header: "Invoice ID", accessor: (p) => p.invoiceId },
        { header: "Student", accessor: (p) => p.studentName },
        { header: "Course", accessor: (p) => p.course },
        { header: "Amount", accessor: (p) => p.amount },
        { header: "Due Date", accessor: (p) => p.dueDate },
        { header: "Method", accessor: (p) => p.method || "—" },
        { header: "Status", accessor: (p) => p.status },
      ]);
    } else if (tab === "counsellors") {
      exportToCsv(`aintrix-manager-counsellors-${today}.csv`, counsellors, [
        { header: "ID", accessor: (c) => c.id },
        { header: "Name", accessor: (c) => c.name },
        { header: "Email", accessor: (c) => c.email },
        { header: "Phone", accessor: (c) => c.phone },
        { header: "Target", accessor: (c) => c.targetCount },
        { header: "Converted", accessor: (c) => c.convertedCount },
        { header: "Conversion", accessor: (c) => `${c.conversionRate}%` },
      ]);
    } else {
      exportToCsv(`aintrix-manager-data-${today}.csv`, leads, [
        { header: "Lead ID", accessor: (l) => l.id },
        { header: "Name", accessor: (l) => l.name },
        { header: "Email", accessor: (l) => l.email },
        { header: "Track", accessor: (l) => l.track },
        { header: "Status", accessor: (l) => l.status },
      ]);
    }
    addToast({
      type: "success",
      title: "Data Exported",
      message: `Downloaded CSV snapshot for ${tab}.`,
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
          badges={{
            leads: leads.filter((l) => l.status === "New Lead").length,
            admissions: admissions.filter((a) => a.status === "PENDING_VERIFICATION").length,
            attendance: alerts.filter((al) => !al.warningSent).length,
          }}
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
              badges={{
                leads: leads.filter((l) => l.status === "New Lead").length,
                admissions: admissions.filter((a) => a.status === "PENDING_VERIFICATION").length,
                attendance: alerts.filter((al) => !al.warningSent).length,
              }}
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
              setIsCreateLeadOpen(true);
            } else if (action === "create_class") {
              setSelectedScheduleBatch(undefined);
              setActiveTab("schedule");
            } else if (action === "create_announcement") {
              setActiveTab("announcements");
            } else if (action === "export_csv") {
              handleExportManagerCsv(activeTab);
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

{/* Create Lead Modal */}
      {isCreateLeadOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase" style={{ color: "var(--accent)" }}>
                  Admissions Pipeline
                </span>
                <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>
                  Register New Candidate Lead
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateLeadOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border outline-none text-xs"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="candidate@example.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Course Track
                  </label>
                  <select
                    value={newLeadTrack}
                    onChange={(e) => setNewLeadTrack(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="Python Full Stack">Python Full Stack</option>
                    <option value="Full-Stack App Development">Full-Stack App Development</option>
                    <option value="Django & Cloud APIs">Django & Cloud APIs</option>
                    <option value="React & Next.js Architecture">React & Next.js Architecture</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Assign Counsellor
                  </label>
                  <select
                    value={newLeadCounsellor}
                    onChange={(e) => setNewLeadCounsellor(e.target.value)}
                    className="w-full p-2.5 rounded-lg border outline-none text-xs cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="">Select Counsellor...</option>
                    {counsellors.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Initial Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Career objectives, educational background, preferred schedule..."
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border outline-none text-xs"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateLeadOpen(false)}
                  className="px-4 py-2 rounded-lg border font-semibold text-xs hover:bg-black/5 dark:hover:bg-white/5 transition"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold text-xs shadow-xs hover:opacity-90 transition"
                  style={{ backgroundColor: "var(--accent)", color: "var(--accent-contrast)" }}
                >
                  Register Lead
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
