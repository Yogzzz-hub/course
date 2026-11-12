import React from "react";
import {
  LayoutDashboard,
  Layers,
  Calendar,
  UserCheck,
  FileCheck,
  HelpCircle,
  Megaphone,
  LogOut,
  Presentation,
  X,
} from "lucide-react";
import type { TrainerNavTab } from "./types";

interface NavItem {
  id: TrainerNavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "batches", label: "My batches", icon: Layers },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "attendance", label: "Attendance", icon: UserCheck },
  { id: "assignments", label: "Assignments", icon: FileCheck, badge: 5 },
  { id: "doubts", label: "Doubt sessions", icon: HelpCircle, badge: 3 },
  { id: "announcements", label: "Announcements", icon: Megaphone },
];

export function TrainerSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  onClose,
  isMobileDrawer = false,
}: {
  activeTab: TrainerNavTab;
  onSelectTab: (tab: TrainerNavTab) => void;
  onLogout: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}) {
  return (
    <aside
      className={`trainer-sidebar ${isMobileDrawer ? "side-drawer-aside w-full h-full" : "w-60 min-h-screen"} shrink-0 flex flex-col justify-between border-r select-none`}
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand header */}
        <div
          className="h-14 px-4 border-b flex items-center justify-between gap-2.5 shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <Presentation size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate leading-tight" style={{ color: "var(--text)" }}>
                Aintrix Academy
              </div>
              <div
                className="text-[10px] font-semibold tracking-wider uppercase leading-tight mt-0.5"
                style={{ color: "var(--accent)" }}
              >
                Trainer Portal
              </div>
            </div>
          </div>

          {/* Close button inside mobile side drawer */}
          {isMobileDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border text-xs cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              aria-label="Close sidebar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav
          className="p-2 space-y-1 flex flex-col overflow-y-auto flex-1"
          aria-label="Trainer Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer min-h-[44px]"
                style={{
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                    : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={17}
                    className="shrink-0"
                    style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ml-1.5"
                    style={{
                      backgroundColor: isActive ? "var(--accent)" : "var(--bg-secondary)",
                      color: isActive ? "var(--accent-contrast)" : "var(--muted)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div
        className="p-3 border-t space-y-2 shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="p-2 rounded-lg flex items-center gap-2.5"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            VJ
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold truncate leading-tight">Dr. Vikram Joshi</div>
            <div className="text-[10px] truncate leading-tight text-stone-500" style={{ color: "var(--muted)" }}>
              Lead Faculty Instructor
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 transition-colors border hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer min-h-[44px]"
          style={{ borderColor: "var(--border)" }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

