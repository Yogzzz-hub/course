import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  trainerApi,
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
  type TrainerBatch,
  type TrainerScheduleItem,
  type AttendanceStudent,
  type TrainerAssignmentSubmission,
  type DoubtSession,
  type TrainerAnnouncement,
  type TrainerStats,
} from "../components/trainer-portal";
import { ToastContainer } from "../components/manager-portal/Toast";
import { readScheduledClasses, subscribeScheduledClasses } from "../utils/classScheduleStore";
import type { ToastMessage } from "../components/manager-portal/types";

const EMPTY_STATS: TrainerStats = {
  todayClasses: 0,
  totalStudents: 0,
  pendingReviews: 0,
  openDoubts: 0,
  nextClassTime: "",
  nextClassTitle: "",
  nextClassBatch: "",
  nextClassStudents: 0,
};

export default function TrainerPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TrainerNavTab>("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [stats, setStats] = useState<TrainerStats>(EMPTY_STATS);
  const [batches, setBatches] = useState<TrainerBatch[]>([]);
  const [schedule, setSchedule] = useState<TrainerScheduleItem[]>([]);
  // Classes scheduled by managers (Schedule Classes tab), shown alongside DB sessions.
  const [managerClasses, setManagerClasses] = useState<TrainerScheduleItem[]>(() => readScheduledClasses());
  useEffect(() => subscribeScheduledClasses((items) => setManagerClasses(items)), []);
  const combinedSchedule = [...managerClasses, ...schedule];
  const [rosterMap, setRosterMap] = useState<Record<string, AttendanceStudent[]>>({});
  const [selectedBatchForAttendance, setSelectedBatchForAttendance] = useState("");
  const [assignments, setAssignments] = useState<TrainerAssignmentSubmission[]>([]);
  const [doubts, setDoubts] = useState<DoubtSession[]>([]);
  const [announcements, setAnnouncements] = useState<TrainerAnnouncement[]>([]);

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
      const snapshot = await trainerApi.getSnapshot();
      setStats(snapshot.stats);
      setBatches(snapshot.batches);
      setSchedule(snapshot.schedule);
      setRosterMap(snapshot.rosterMap);
      setAssignments(snapshot.assignments);
      setDoubts(snapshot.doubts);
      setAnnouncements(snapshot.announcements);
      if (snapshot.batches.length > 0) setSelectedBatchForAttendance(snapshot.batches[0].code);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load trainer data from the database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("crm_session");
    } catch {}
    navigate("/login");
  };

  const handleSaveAttendance = (batchCode: string, records: AttendanceStudent[]) => {
    setRosterMap((prev) => ({ ...prev, [batchCode]: records }));
    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    trainerApi
      .saveAttendance(batchCode, records)
      .then(() => {
        addToast({
          type: "success",
          title: "Attendance Saved",
          message: `${presentCount}/${records.length} students logged present for ${batchCode}.`,
        });
      })
      .catch((err) => {
        addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save attendance." });
      });
  };

  const handleGradeSubmission = (id: string, score: number, feedback: string) => {
    setAssignments((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, status: "GRADED", score, feedback } : sub
      )
    );
    trainerApi
      .gradeSubmission(id, score, feedback)
      .then(() => {
        addToast({
          type: "success",
          title: "Submission Graded",
          message: `Score of ${score}/100 recorded with feedback.`,
        });
      })
      .catch((err) => {
        addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save the grade." });
      });
  };

  const handleAcceptDoubt = (id: string) => {
    setDoubts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "SCHEDULED", meetingTime: "Today, 5:00 PM" } : d
      )
    );
    trainerApi
      .acceptDoubt(id)
      .then(() => {
        addToast({
          type: "info",
          title: "Doubt Session Scheduled",
          message: "Room link sent to student for today at 5:00 PM.",
        });
      })
      .catch((err) => {
        addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not schedule the doubt session." });
      });
  };

  const handlePublishAnnouncement = (newAnn: TrainerAnnouncement) => {
    setAnnouncements((prev) => [newAnn, ...prev]);
    trainerApi
      .publishAnnouncement({ title: newAnn.title, body: newAnn.body, batchCode: newAnn.batchCode })
      .then(() => {
        addToast({
          type: "success",
          title: "Notice Broadcasted",
          message: `Published to ${newAnn.batchCode} cohort stream.`,
        });
      })
      .catch((err) => {
        addToast({ type: "danger", title: "Sync Failed", message: err instanceof Error ? err.message : "Could not save the announcement." });
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
          onLogout={handleLogout}
        />

        <main className="manager-main p-3 sm:p-5 md:p-6 pb-6 flex-1 w-full space-y-4">
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
              Loading trainer data from the database...
            </div>
          ) : (
            <>
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

              {activeTab === "schedule" && <ScheduleView schedule={combinedSchedule} />}

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
            </>
          )}
        </main>
      </div>

      {/* Global Interactive Toast Notification Host */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
