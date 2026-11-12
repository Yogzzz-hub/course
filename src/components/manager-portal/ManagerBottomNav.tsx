import React from "react";
import { LayoutGrid, Users, ClipboardCheck, Wallet, MoreHorizontal } from "lucide-react";
import type { ManagerNavTab } from "./types";

interface ManagerBottomNavProps {
  activeTab: ManagerNavTab;
  onSelectTab: (tab: ManagerNavTab) => void;
  onOpenMore: () => void;
  approvalsBadgeCount?: number;
}

export function ManagerBottomNav({
  activeTab,
  onSelectTab,
  onOpenMore,
  approvalsBadgeCount = 5,
}: ManagerBottomNavProps) {
  // Check if current tab is one of the "More" overflow tabs
  const isMoreActive = [
    "cohorts",
    "attendance",
    "counsellors",
    "announcements",
    "reports",
  ].includes(activeTab);

  return (
    <nav
      className="manager-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-30 border-t flex items-center justify-around px-2 py-1 select-none backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--surface) 96%, transparent)",
        borderColor: "var(--border)",
        paddingBottom: "max(6px, env(safe-area-inset-bottom))",
      }}
      aria-label="Mobile Navigation Bar"
    >
      {/* 1. Overview */}
      <button
        type="button"
        onClick={() => onSelectTab("dashboard")}
        aria-current={activeTab === "dashboard" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "dashboard" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <LayoutGrid size={20} />
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "dashboard" ? 600 : 500,
            color: activeTab === "dashboard" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Overview
        </span>
      </button>

      {/* 2. Leads */}
      <button
        type="button"
        onClick={() => onSelectTab("leads")}
        aria-current={activeTab === "leads" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "leads" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <Users size={20} />
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "leads" ? 600 : 500,
            color: activeTab === "leads" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Leads
        </span>
      </button>

      {/* 3. Approvals (with badge) */}
      <button
        type="button"
        onClick={() => onSelectTab("admissions")}
        aria-current={activeTab === "admissions" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "admissions" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <div className="relative">
          <ClipboardCheck size={20} />
          {approvalsBadgeCount > 0 && (
            <span
              className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none text-white shadow-xs"
              style={{
                backgroundColor: "#831843", // deep burgundy badge as in reference image
              }}
            >
              {approvalsBadgeCount}
            </span>
          )}
        </div>
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "admissions" ? 600 : 500,
            color: activeTab === "admissions" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Approvals
        </span>
      </button>

      {/* 4. Payments */}
      <button
        type="button"
        onClick={() => onSelectTab("fees")}
        aria-current={activeTab === "fees" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "fees" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <Wallet size={20} />
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "fees" ? 600 : 500,
            color: activeTab === "fees" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Payments
        </span>
      </button>

      {/* 5. More (opens side drawer) */}
      <button
        type="button"
        onClick={onOpenMore}
        aria-label="More navigation options"
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: isMoreActive ? "var(--accent)" : "var(--muted)",
        }}
      >
        <div className="relative">
          <MoreHorizontal size={20} />
          {isMoreActive && (
            <span
              className="w-1.5 h-1.5 rounded-full absolute -top-0.5 -right-1"
              style={{ backgroundColor: "var(--accent)" }}
            />
          )}
        </div>
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: isMoreActive ? 600 : 500,
            color: isMoreActive ? "var(--accent)" : "var(--muted)",
          }}
        >
          More
        </span>
      </button>
    </nav>
  );
}

