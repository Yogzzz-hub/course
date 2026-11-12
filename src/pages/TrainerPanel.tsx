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
      className="manager-workspace min-h-screen flex transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
      }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <TrainerSidebar
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
          <div className="relative z-10 w-60 h-full shadow-2xl flex">
            <TrainerSidebar
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
        <TrainerHeader
          activeTab={activeTab}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="p-5 sm:p-6 flex-1 w-full space-y-4">
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
