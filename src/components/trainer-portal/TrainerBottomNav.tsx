import React from "react";
import { LayoutGrid, Layers, ClipboardCheck, Calendar, MoreHorizontal } from "lucide-react";
import type { TrainerNavTab } from "./types";

interface TrainerBottomNavProps {
  activeTab: TrainerNavTab;
  onSelectTab: (tab: TrainerNavTab) => void;
  onOpenMore: () => void;
  assignmentsBadgeCount?: number;
}

export function TrainerBottomNav({
  activeTab,
  onSelectTab,
  onOpenMore,
  assignmentsBadgeCount = 5,
}: TrainerBottomNavProps) {
  // Check if current tab is one of the "More" overflow tabs
  const isMoreActive = [
    "attendance",
    "doubts",
    "announcements",
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

      {/* 2. Batches */}
      <button
        type="button"
        onClick={() => onSelectTab("batches")}
        aria-current={activeTab === "batches" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "batches" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <Layers size={20} />
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "batches" ? 600 : 500,
            color: activeTab === "batches" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Batches
        </span>
      </button>

      {/* 3. Assignments (with circular burgundy badge) */}
      <button
        type="button"
        onClick={() => onSelectTab("assignments")}
        aria-current={activeTab === "assignments" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "assignments" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <div className="relative">
          <ClipboardCheck size={20} />
          {assignmentsBadgeCount > 0 && (
            <span
              className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none text-white shadow-xs"
              style={{
                backgroundColor: "#831843", // deep burgundy badge matching reference image
              }}
            >
              {assignmentsBadgeCount}
            </span>
          )}
        </div>
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "assignments" ? 600 : 500,
            color: activeTab === "assignments" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Assignments
        </span>
      </button>

      {/* 4. Schedule */}
      <button
        type="button"
        onClick={() => onSelectTab("schedule")}
        aria-current={activeTab === "schedule" ? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] cursor-pointer transition-colors relative"
        style={{
          color: activeTab === "schedule" ? "var(--accent)" : "var(--muted)",
        }}
      >
        <Calendar size={20} />
        <span
          className="text-[10.5px] mt-1 font-medium tracking-tight truncate max-w-[64px]"
          style={{
            fontWeight: activeTab === "schedule" ? 600 : 500,
            color: activeTab === "schedule" ? "var(--accent)" : "var(--muted)",
          }}
        >
          Schedule
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
