import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  initialTrainerStats,
  initialTrainerBatches,
  initialTrainerSchedule,
  initialAttendanceRoster,
  initialAssignments,
  initialDoubts,
  initialTrainerAnnouncements,
  type TrainerBatch,
  type TrainerScheduleItem,
  type AttendanceStudent,
  type TrainerAssignmentSubmission,
  type DoubtSession,
  type TrainerAnnouncement,
} from "../data/trainerMock";
import {
  TrainerSidebar,
  TrainerHeader,
  DashboardView,
  BatchesView,
  ScheduleView,
  AttendanceView,
  AssignmentsView,
  DoubtsView,
  AnnouncementsView,
  type TrainerNavTab,
} from "../components/trainer-portal";
import { ToastContainer } from "../components/manager-portal/Toast";
import type { ToastMessage } from "../components/manager-portal/types";

export default function TrainerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TrainerNavTab>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Live state connected to mocks
  const [stats, setStats] = useState(initialTrainerStats);
  const [batches, setBatches] = useState<TrainerBatch[]>(initialTrainerBatches);
  const [schedule, setSchedule] = useState<TrainerScheduleItem[]>(initialTrainerSchedule);
  const [rosterMap, setRosterMap] = useState<Record<string, AttendanceStudent[]>>(initialAttendanceRoster);
  const [selectedBatchForAttendance, setSelectedBatchForAttendance] = useState("BATCH-PY-2026-A");
  const [assignments, setAssignments] = useState<TrainerAssignmentSubmission[]>(initialAssignments);
  const [doubts, setDoubts] = useState<DoubtSession[]>(initialDoubts);
  const [announcements, setAnnouncements] = useState<TrainerAnnouncement[]>(initialTrainerAnnouncements);

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

  const handleSaveAttendance = (batchCode: string, records: AttendanceStudent[]) => {
    setRosterMap((prev) => ({ ...prev, [batchCode]: records }));
    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    addToast({
      type: "success",
      title: "Attendance Saved",
      message: `${presentCount}/${records.length} students logged present for ${batchCode}.`,
    });
  };

  const handleGradeSubmission = (id: string, score: number, feedback: string) => {
    setAssignments((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, status: "GRADED", score, feedback } : sub
      )
    );
    addToast({
      type: "success",
      title: "Submission Graded",
      message: `Score of ${score}/100 recorded with feedback.`,
    });
  };

  const handleAcceptDoubt = (id: string) => {
    setDoubts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "SCHEDULED", meetingTime: "Today, 5:00 PM" } : d
      )
    );
    addToast({
      type: "info",
      title: "Doubt Session Scheduled",
      message: "Room link sent to student for today at 5:00 PM.",
    });
  };

  const handlePublishAnnouncement = (newAnn: TrainerAnnouncement) => {
    setAnnouncements((prev) => [newAnn, ...prev]);
    addToast({
      type: "success",
      title: "Notice Broadcasted",
      message: `Published to ${newAnn.batchCode} cohort stream.`,
    });
  };

  return (
    <div
      className="trainer-workspace manager-workspace min-h-screen flex flex-col md:flex-row transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      {/* Desktop Sidebar: rendered on left above 768px */}
      <div className="hidden md:block shrink-0">
        <TrainerSidebar
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
            <TrainerSidebar
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
        <TrainerHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="manager-main p-3 sm:p-5 md:p-6 flex-1 w-full space-y-4">
          {activeTab === "dashboard" && (
            <DashboardView
              stats={stats}
              batches={batches}
              doubts={doubts}
              onNavigateTab={setActiveTab}
              onSelectBatch={(batch) => {
                setSelectedBatchForAttendance(batch.code);
                setActiveTab("batches");
              }}
            />
          )}

          {activeTab === "batches" && (
            <BatchesView
              batches={batches}
              onTakeAttendance={(batch) => {
                setSelectedBatchForAttendance(batch.code);
                setActiveTab("attendance");
              }}
            />
          )}

          {activeTab === "schedule" && <ScheduleView schedule={schedule} />}

          {activeTab === "attendance" && (
            <AttendanceView
              rosterMap={rosterMap}
              selectedBatchCode={selectedBatchForAttendance}
              onChangeBatch={setSelectedBatchForAttendance}
              onSaveAttendance={handleSaveAttendance}
            />
          )}

          {activeTab === "assignments" && (
            <AssignmentsView
              submissions={assignments}
              onGradeSubmission={handleGradeSubmission}
            />
          )}

          {activeTab === "doubts" && (
            <DoubtsView doubts={doubts} onAcceptDoubt={handleAcceptDoubt} />
          )}

          {activeTab === "announcements" && (
            <AnnouncementsView
              announcements={announcements}
              batches={batches}
              onPublishAnnouncement={handlePublishAnnouncement}
            />
          )}
        </main>
      </div>

      {/* Global Interactive Toast Notification Host */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
