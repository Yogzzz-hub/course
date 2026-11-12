import React from "react";
import { Bell, Menu, Plus, Download } from "lucide-react";
import type { ManagerNavTab } from "./types";

const tabDisplayTitles: Record<ManagerNavTab, string> = {
  dashboard: "Dashboard",
  leads: "Leads & Enquiries",
  admissions: "Admissions",
  cohorts: "Cohorts & Seats",
  attendance: "Attendance Alerts",
  fees: "Fees & Payments",
  counsellors: "Counsellors",
  announcements: "Announcements",
  reports: "Reports",
};

export function ManagerHeader({
  activeTab,
  onOpenMobileSidebar,
  onQuickAction,
}: {
  activeTab: ManagerNavTab;
  onOpenMobileSidebar: () => void;
  onQuickAction?: (action: string) => void;
}) {
  const title = tabDisplayTitles[activeTab] || "Dashboard";

  return (
    <header
      className="h-16 px-6 sm:px-8 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface) 95%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg border text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        {/* The ONLY page heading, clean 18px font size */}
        <div
          className="text-base sm:text-lg font-bold tracking-tight select-none"
          style={{ color: "var(--text)" }}
        >
          {title}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {activeTab === "leads" && (
          <button
            type="button"
            onClick={() => onQuickAction?.("create_lead")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity shadow-xs cursor-pointer"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            <Plus size={14} />
            <span>New Lead</span>
          </button>
        )}

        {activeTab === "announcements" && (
          <button
            type="button"
            onClick={() => onQuickAction?.("create_announcement")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity shadow-xs cursor-pointer"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            <Plus size={14} />
            <span>New Broadcast</span>
          </button>
        )}

        {(activeTab === "fees" || activeTab === "reports") && (
          <button
            type="button"
            onClick={() => onQuickAction?.("export_csv")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
            }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        )}

        <div
          className="w-8 h-8 rounded-lg border flex items-center justify-center relative cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
          }}
          title="Notifications"
        >
          <Bell size={15} />
          <span
            className="w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </div>
      </div>
    </header>
  );
}
