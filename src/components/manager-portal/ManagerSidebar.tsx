import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  CalendarDays,
  AlertCircle,
  CreditCard,
  Headphones,
  Megaphone,
  BarChart3,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  X,
} from "lucide-react";
import { LogoMark } from "../LogoMark";
import type { ManagerNavTab } from "./types";

interface NavItem {
  id: ManagerNavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads & enquiries", icon: Users },
  { id: "admissions", label: "Admissions", icon: UserCheck },
  { id: "cohorts", label: "Cohorts & seats", icon: GraduationCap },
  { id: "schedule", label: "Class schedule", icon: CalendarDays },
  { id: "attendance", label: "Attendance alerts", icon: AlertCircle },
  { id: "fees", label: "Fees & payments", icon: CreditCard },
  { id: "counsellors", label: "Counsellors", icon: Headphones },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export function ManagerSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  onClose,
  isMobileDrawer = false,
  badges,
}: {
  activeTab: ManagerNavTab;
  onSelectTab: (tab: ManagerNavTab) => void;
  onLogout: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
  badges?: Partial<Record<ManagerNavTab, number>>;
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = !isMobileDrawer && collapsed;

  return (
    <aside
      className={`manager-sidebar ${
        isMobileDrawer
          ? "side-drawer-aside w-full h-full overflow-x-hidden"
          : `${isCollapsed ? "w-20" : "w-60"} sticky top-0 h-dvh overflow-x-hidden border-r transition-[width] duration-200`
      } shrink-0 flex flex-col justify-between select-none border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand header */}
        <div
          className={`${
            isMobileDrawer ? "flex" : "hidden md:flex"
          } h-14 border-b border-[var(--sidebar-border)] items-center gap-2 shrink-0 ${
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
                  Academy · Manager
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
          className="flex-1 flex flex-col justify-between gap-1 p-2.5 overflow-y-auto overflow-x-hidden"
          aria-label="Manager Navigation"
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
                className={`relative group flex-1 min-h-[40px] max-h-[54px] w-full flex items-center py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
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
      <div
        className={`${
          isMobileDrawer ? "block" : "hidden md:block"
        } p-3 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] space-y-2 shrink-0`}
      >
        <button
          type="button"
          title={isCollapsed ? "Operations Manager" : undefined}
          onClick={() => setProfileMenuOpen((v) => !v)}
          aria-expanded={profileMenuOpen}
          className={`w-full p-2 rounded-xl flex items-center gap-2.5 text-left cursor-pointer hover:bg-[var(--sidebar-hover)] transition ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 bg-[var(--btn-primary-bg)] text-white border border-[var(--accent-soft)]/30">
            OM
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold truncate leading-tight text-white">
                Operations Manager
              </div>
              <div className="text-[10px] truncate leading-tight text-[var(--accent-soft)]">
                manager@aintrix.edu
              </div>
            </div>
          )}
        </button>

        {profileMenuOpen && (
          <button
            type="button"
            title={isCollapsed ? "Log out" : undefined}
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors bg-[var(--btn-primary-bg)] text-white hover:bg-[var(--btn-primary-hover)] cursor-pointer min-h-[44px]"
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Log out</span>}
          </button>
        )}

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
