import React from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  AlertCircle,
  CreditCard,
  Headphones,
  Megaphone,
  BarChart3,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import type { ManagerNavTab } from "./types";

interface NavItem {
  id: ManagerNavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads & enquiries", icon: Users, badge: 14 },
  { id: "admissions", label: "Admissions", icon: UserCheck, badge: 3 },
  { id: "cohorts", label: "Cohorts & seats", icon: GraduationCap },
  { id: "attendance", label: "Attendance alerts", icon: AlertCircle, badge: 4 },
  { id: "fees", label: "Fees & payments", icon: CreditCard },
  { id: "counsellors", label: "Counsellors", icon: Headphones },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export function ManagerSidebar({
  activeTab,
  onSelectTab,
  onLogout,
}: {
  activeTab: ManagerNavTab;
  onSelectTab: (tab: ManagerNavTab) => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className="w-60 shrink-0 flex flex-col justify-between border-r min-h-screen select-none"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div>
        {/* Brand header */}
        <div
          className="h-14 px-4 border-b flex items-center gap-2.5"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-contrast)",
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate leading-tight" style={{ color: "var(--text)" }}>
              Aintrix Academy
            </div>
            <div
              className="text-[10px] font-semibold tracking-wider uppercase leading-tight mt-0.5"
              style={{ color: "var(--accent)" }}
            >
              Manager Portal
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-0.5" aria-label="Manager Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer"
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
                    size={16}
                    className="shrink-0"
                    style={{ color: isActive ? "var(--accent)" : "var(--muted)" }}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0"
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
        className="p-3 border-t space-y-2"
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
            OM
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold truncate leading-tight">Operations Manager</div>
            <div className="text-[10px] truncate leading-tight text-stone-500" style={{ color: "var(--muted)" }}>
              manager@aintrix.edu
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80 cursor-pointer"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
