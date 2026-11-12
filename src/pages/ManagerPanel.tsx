import React, { useState } from "react";
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
  ManagerSidebar,
  ManagerHeader,
  DashboardView,
  LeadsView,
  AdmissionsView,
  CohortsView,
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

  return (
    <div
      className="manager-workspace min-h-screen flex transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ManagerSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 h-full shadow-2xl flex">
            <ManagerSidebar
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
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
            } else if (action === "export_csv") {
              addToast({
                type: "success",
                title: "CSV Export",
                message: "Downloading data report for your offline records.",
              });
            }
          }}
        />

        <main className="p-5 sm:p-6 flex-1 w-full space-y-4">
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

          {activeTab === "cohorts" && <CohortsView cohorts={cohorts} />}

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
