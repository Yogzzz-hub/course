import React from "react";
import { Bell, Menu, Plus, Download } from "lucide-react";
import { PaletteMenu } from "../PaletteMenu";
import { ProfileMenu } from "../ProfileMenu";
import type { ManagerNavTab } from "./types";

const tabDisplayTitles: Record<ManagerNavTab, string> = {
  dashboard: "Dashboard",
  leads: "Leads & Enquiries",
  admissions: "Admissions",
  cohorts: "Cohorts & Seats",
  schedule: "Class Schedule",
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
  onLogout,
}: {
  activeTab: ManagerNavTab;
  onOpenMobileSidebar: () => void;
  onQuickAction?: (action: string) => void;
  onLogout?: () => void;
}) {
  const title = tabDisplayTitles[activeTab] || "Dashboard";

  return (
    <header
      className="manager-header min-h-[48px] md:h-16 px-3.5 sm:px-6 md:px-8 border-b flex flex-wrap items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md gap-2"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface) 95%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger menu button to open side drawer on mobile */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex md:hidden p-2 rounded-lg border text-xs cursor-pointer min-h-[44px] min-w-[44px] items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          aria-label="Open sidebar menu"
        >
          <Menu size={20} />
        </button>

        {/* The ONLY page heading, clean responsive font size */}
        <div
          className="text-sm sm:text-base md:text-lg font-bold tracking-tight select-none"
          style={{ color: "var(--text)" }}
        >
          {title}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeTab === "leads" && (
          <button
            type="button"
            onClick={() => onQuickAction?.("create_lead")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity shadow-xs cursor-pointer min-h-[44px]"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity shadow-xs cursor-pointer min-h-[44px]"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            <Plus size={14} />
            <span>New Broadcast</span>
          </button>
        )}

        {activeTab === "cohorts" && (
          <button
            type="button"
            onClick={() => onQuickAction?.("create_class")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity shadow-xs cursor-pointer min-h-[44px]"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            <Plus size={14} />
            <span>Schedule Class</span>
          </button>
        )}

        {(activeTab === "fees" || activeTab === "reports") && (
          <button
            type="button"
            onClick={() => onQuickAction?.("export_csv")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer min-h-[44px]"
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

        <PaletteMenu />

        <div
          className="w-9 h-9 sm:w-8 sm:h-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border flex items-center justify-center relative cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--text)",
          }}
          title="Notifications"
        >
          <Bell size={15} />
          <span
            className="w-1.5 h-1.5 rounded-full absolute top-2 right-2 sm:top-1.5 sm:right-1.5 ring-2 ring-white"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </div>

        {onLogout && (
          <ProfileMenu
            initials="OM"
            name="Operations Manager"
            subtitle="manager@aintrix.edu"
            onLogout={onLogout}
          />
        )}
      </div>
    </header>
  );
}
