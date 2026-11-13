import React, { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  Calendar,
  UserCheck,
  FileCheck,
  HelpCircle,
  Megaphone,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  X,
} from "lucide-react";
import { LogoMark } from "../LogoMark";
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
  { id: "assignments", label: "Assignments", icon: FileCheck },
  { id: "doubts", label: "Doubt sessions", icon: HelpCircle },
  { id: "announcements", label: "Announcements", icon: Megaphone },
];

export function TrainerSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  onClose,
  isMobileDrawer = false,
  badges,
}: {
  activeTab: TrainerNavTab;
  onSelectTab: (tab: TrainerNavTab) => void;
  onLogout: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
  badges?: Partial<Record<TrainerNavTab, number>>;
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = !isMobileDrawer && collapsed;

  return (
    <aside
      className={`trainer-sidebar ${
        isMobileDrawer
          ? "side-drawer-aside w-full h-full overflow-x-hidden"
          : `${isCollapsed ? "w-20" : "w-60"} sticky top-0 h-dvh overflow-x-hidden transition-[width] duration-200`
      } shrink-0 flex flex-col justify-between border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] select-none`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand header */}
        <div
          className={`h-14 border-b border-[var(--sidebar-border)] flex items-center gap-2 shrink-0 ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <a href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
            <LogoMark size={28} surface="dark" className="shrink-0" />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-[15px] font-bold truncate leading-tight text-white">
                  Aintrix
                </div>
                <div className="text-[9px] font-medium tracking-[0.2em] uppercase leading-tight mt-0.5 text-[var(--accent-soft)]">
                  Academy · Trainer
                </div>
              </div>
            )}
          </a>

          {!isMobileDrawer && !isCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text)]/70 hover:bg-[var(--sidebar-hover)] hover:text-white transition cursor-pointer"
            >
              <PanelLeftClose size={16} aria-hidden="true" />
            </button>
          )}

          {/* Close button inside mobile side drawer */}
          {isMobileDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-xs cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center text-[var(--accent-soft)] hover:bg-[var(--sidebar-hover)] hover:text-white transition-colors"
              aria-label="Close sidebar menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav
          className="flex-1 flex flex-col justify-between gap-1.5 p-2.5 overflow-y-auto overflow-x-hidden"
          aria-label="Trainer Navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = badges?.[item.id] ?? item.badge;
            return (
              <button
                key={item.id}
                type="button"
                title={isCollapsed ? item.label : undefined}
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative group flex-1 min-h-[44px] max-h-[68px] w-full flex items-center py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  isCollapsed ? "justify-center px-2" : "justify-between px-3"
                } ${
                  isActive
                    ? "bg-[var(--btn-primary-bg)] text-white font-bold shadow-sm"
                    : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={17}
                    className={`shrink-0 ${
                      isActive
                        ? "text-[var(--accent-soft)]"
                        : "text-[var(--sidebar-text)]/70 group-hover:text-white"
                    }`}
                  />
                  <span className={isCollapsed ? "sr-only" : "truncate"}>{item.label}</span>
                </div>

                {!isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                      isActive
                        ? "sidebar-badge bg-white text-[var(--accent)]"
                        : "bg-[var(--btn-primary-bg)] text-white border border-[var(--accent-soft)]/25"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
                {isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
                  <span
                    className="absolute right-2.5 top-2 size-2 rounded-full bg-[var(--accent-soft)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & Logout */}
      <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] space-y-2 shrink-0">
        <div
          title={isCollapsed ? "Dr. Vikram Joshi (Lead Faculty Instructor)" : undefined}
          className={`w-full p-2 rounded-xl flex items-center justify-between gap-2.5 text-left ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 bg-[var(--btn-primary-bg)] text-white border border-[var(--accent-soft)]/30">
              VJ
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold truncate leading-tight text-white">
                  Dr. Vikram Joshi
                </div>
                <div className="text-[10px] truncate leading-tight text-[var(--accent-soft)]">
                  Lead Faculty Instructor
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Always-Visible Logout Button */}
        <button
          type="button"
          title={isCollapsed ? "Log out" : undefined}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-hover)] cursor-pointer min-h-[40px]"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Log out</span>}
        </button>

        {!isMobileDrawer && (
          <button
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white cursor-pointer min-h-[40px]"
          >
            {isCollapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={17} aria-hidden="true" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

