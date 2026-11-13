import { useEffect, useRef, useState, useMemo } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardCheck,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "../LogoMark";
import { AdminApiError, adminError } from "./api";
import {
  secureLink,
  type AdminApi,
  type AdminSession,
  type AdminSection,
  type Permission,
} from "./contracts";
import {
  AdminAuthority,
  adminKeys,
  useAdminAction,
  useAdminAuthority,
  useAdminResource,
  useAdminSession,
} from "./hooks";
import { hasPermission } from "./permissions";
import {
  AdminErrorBoundary,
  Button,
  Card,
  Empty,
  inputClass,
  Label,
  Notice,
  SecureLink,
  Skeleton,
} from "./ui";
import { OverviewSection } from "./OverviewSection";
import { LeadsSection } from "./LeadsSection";
import { ApprovalsSection } from "./ApprovalsSection";
import { PaymentsSection } from "./PaymentsSection";
import { ProgrammesSection } from "./ProgrammesSection";
import { StudentsSection } from "./StudentsSection";
import { ReportsSection } from "./ReportsSection";
import { SettingsSection } from "./SettingsSection";
import "./admin-panel.css";
import { PaletteMenu, WorkspaceAppearance } from "../PaletteMenu";
import { ProfileMenu } from "../ProfileMenu";

export interface AdminPanelProps {
  api: AdminApi;
  signInUrl?: string;
  academyName?: string;
  onLogout?: () => void;
}

export type DashboardSection =
  | "overview"
  | "leads"
  | "approvals"
  | "payments"
  | "programmes"
  | "students"
  | "reports"
  | "settings";

interface NavItemConfig {
  id: DashboardSection;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  requiredPermission?: Permission;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: "overview",
    label: "Overview",
    subtitle: "Academy-wide metrics, active enquiries and critical operational alerts",
    icon: LayoutDashboard,
  },
  {
    id: "leads",
    label: "Leads",
    subtitle: "Admissions pipeline, enquiry tracking and counsellor stage ownership",
    icon: Users,
    requiredPermission: "leads.read",
  },
  {
    id: "approvals",
    label: "Approvals",
    subtitle: "Secondary sign-off on fee discounts, scholarships and bank transfer slips",
    icon: ClipboardCheck,
    requiredPermission: "offers.read",
  },
  {
    id: "payments",
    label: "Payments",
    subtitle: "Real-time fee ledger, instalment schedules and payment reconciliation",
    icon: Wallet,
    requiredPermission: "ledger.read",
  },
  {
    id: "programmes",
    label: "Programmes",
    subtitle: "Course cohorts, batch schedules, seat fill-rates and transparent pricing",
    icon: BookOpen,
    requiredPermission: "cms.read",
  },
  {
    id: "students",
    label: "Students",
    subtitle: "Enrolled student rosters, class attendance tracking and LMS progress",
    icon: GraduationCap,
    requiredPermission: "leads.read",
  },
  {
    id: "reports",
    label: "Reports",
    subtitle: "Lead-to-enrolment conversion funnel, counsellor performance and exports",
    icon: ChartNoAxesCombined,
    requiredPermission: "reports.read",
  },
  {
    id: "settings",
    label: "Settings",
    subtitle: "Admin session security, two-factor authentication and notification schedules",
    icon: Settings,
  },
];

function TwoFactor({
  api,
  challenge,
  now,
}: {
  api: AdminApi;
  challenge: Extract<AdminSession, { state: "two_factor_required" }>;
  now: number;
}) {
  const client = useQueryClient();
  const [code, setCode] = useState("");
  const expired = Date.parse(challenge.expiresAt) <= now;
  const mutation = useMutation({
    mutationFn: async () => {
      if (
        Date.parse(challenge.expiresAt) <= Date.now() ||
        !/^\d{6}$/.test(code)
      )
        throw new AdminApiError(422);
      const response = await api.verifyTwoFactor(
        { challengeId: challenge.challengeId, code },
        {
          csrfToken: challenge.csrfToken,
          sessionKey: challenge.challengeId,
          requestId: crypto.randomUUID(),
        },
      );
      client.setQueryData(adminKeys.session, response);
      return response;
    },
    retry: false,
  });

  return (
    <Card className="max-w-md mx-auto my-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F6ED] text-[#10754A] mb-4">
        <ShieldCheck size={28} />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text)]">Verify admin access</h1>
      <p className="my-3 text-sm leading-6 text-[var(--muted)]">
        Enter the six-digit verification code sent to {challenge.maskedEmail}.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!expired && /^\d{6}$/.test(code)) mutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <Label id="admin-otp">Two-factor verification code</Label>
          <input
            id="admin-otp"
            className={`${inputClass} tracking-[0.4em] text-center font-mono text-lg`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            required
            maxLength={6}
            value={code}
            disabled={expired || mutation.isPending}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        {mutation.isError && (
          <Notice error>{adminError(mutation.error)}</Notice>
        )}
        {expired && (
          <Notice error>
            Your verification challenge expired. Refresh your session to continue.
          </Notice>
        )}
        <Button
          type="submit"
          className="w-full"
          busy={mutation.isPending}
          disabled={expired || !/^\d{6}$/.test(code)}
        >
          Verify and continue
        </Button>
      </form>
    </Card>
  );
}

function AdminWorkspace({
  academyName,
  onLogoutStart,
  onLoggedOut,
}: {
  academyName: string;
  onLogoutStart: () => void;
  onLoggedOut: () => void;
}) {
  const { can, session, api } = useAdminAuthority();
  const client = useQueryClient();

  // Route section by URL hash so refresh retains current section
  const [activeSection, setActiveSection] = useState<DashboardSection>(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      if (NAV_ITEMS.some((item) => item.id === hash)) {
        return hash as DashboardSection;
      }
    }
    return "overview";
  });

  // Global search input in header
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarLogoutOpen, setSidebarLogoutOpen] = useState(false);
  const [drawerLogoutOpen, setDrawerLogoutOpen] = useState(false);

  // Sync hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      if (NAV_ITEMS.some((item) => item.id === hash)) {
        setActiveSection(hash as DashboardSection);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectSection = (section: DashboardSection) => {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      window.location.hash = `#${section}`;
    }
    setMobileSidebarOpen(false);
  };

  // Queries for live counts (e.g. pending approvals badge)
  const offersQuery = useAdminResource("offers", {});
  const financeQuery = useAdminResource("finance", {});
  const pendingOffersCount =
    offersQuery.data?.offers.filter((o) => o.status === "pending").length || 0;
  const pendingProofsCount =
    financeQuery.data?.proofs.filter((p) => p.status === "pending_review").length || 0;
  const totalApprovalsCount = pendingOffersCount + pendingProofsCount;

  // Filter allowed items based on session permissions
  const allowedItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    return can(item.requiredPermission);
  });

  const activeItemConfig =
    allowedItems.find((item) => item.id === activeSection) || allowedItems[0];

  const logout = useMutation({
    onMutate: () => {
      onLogoutStart();
      try {
        localStorage.removeItem("crm_session");
      } catch {}
    },
    mutationFn: () =>
      api.logout({
        csrfToken: session.csrfToken,
        sessionKey: session.cacheKey,
        requestId: crypto.randomUUID(),
      }),
    retry: false,
    onSettled: () => {
      client.setQueryData(adminKeys.session, { state: "anonymous" });
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "admin" && query.queryKey[1] !== "session",
      });
      onLoggedOut();
    },
  });

  const refreshSession = async () => {
    await client.invalidateQueries({ queryKey: adminKeys.session });
  };

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      selectSection("leads");
    }
  };

  // Render the selected section component
  const renderSection = () => {
    switch (activeItemConfig?.id) {
      case "overview":
        return <OverviewSection onNavigate={(sec) => selectSection(sec as DashboardSection)} />;
      case "leads":
        return <LeadsSection initialSearch={globalSearch} />;
      case "approvals":
        return <ApprovalsSection />;
      case "payments":
        return <PaymentsSection />;
      case "programmes":
        return <ProgrammesSection />;
      case "students":
        return <StudentsSection />;
      case "reports":
        return <ReportsSection />;
      case "settings":
        return <SettingsSection onRefreshSession={refreshSession} />;
      default:
        return <OverviewSection onNavigate={(sec) => selectSection(sec as DashboardSection)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <a href="#admin-main" className="admin-skip">
        Skip to main content
      </a>

      {/* ======================================================== */}
      {/* DESKTOP FIXED SIDEBAR (>900px, about 240px wide)        */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden h-dvh flex-col overflow-y-auto overflow-x-hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-[width] duration-200 lg:flex ${
          sidebarCollapsed ? "w-20" : "w-60"
        }`}
        aria-label="Admin sidebar navigation"
      >
        {/* Sidebar Brand Header + Quick Collapse */}
        <div
          className={`flex min-h-[64px] shrink-0 items-center border-b border-[var(--sidebar-border)] ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4"
          }`}
        >
          <a
            href="/"
            className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition"
            aria-label={`${academyName} Home`}
          >
            <LogoMark size={28} surface="dark" className="shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[15px] tracking-tight text-white leading-tight truncate">
                  {academyName.replace(/\s+(Technical\s+)?Academy$/i, "")}
                </span>
                <span className="text-[9px] font-medium text-[var(--accent-soft)] tracking-[0.22em] uppercase mt-0.5 truncate">
                  Academy · Admin
                </span>
              </div>
            )}
          </a>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-text)]/70 hover:bg-[var(--sidebar-hover)] hover:text-white transition cursor-pointer"
            >
              <PanelLeftClose size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 flex flex-col justify-between gap-1 px-3 py-3 overflow-y-auto overflow-x-hidden" aria-label="Sections">
          {allowedItems.map((item) => {
            const isActive = activeItemConfig?.id === item.id;
            const Icon = item.icon;
            const badgeCount = item.id === "approvals" ? totalApprovalsCount : 0;

            return (
              <button
                key={item.id}
                type="button"
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={() => selectSection(item.id)}
                className={`relative group flex flex-1 min-h-[42px] max-h-[64px] w-full items-center rounded-xl py-2 text-left text-xs font-semibold transition ${
                  sidebarCollapsed ? "justify-center px-2" : "justify-between px-3.5"
                } ${
                  isActive
                    ? "bg-[var(--btn-primary-bg)] text-white shadow-sm font-bold"
                    : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={18}
                    className={`shrink-0 ${
                      isActive ? "text-[var(--accent-soft)]" : "text-[var(--sidebar-text)]/70 group-hover:text-white"
                    }`}
                  />
                  <span className={sidebarCollapsed ? "sr-only" : "truncate"}>{item.label}</span>
                </div>

                {!sidebarCollapsed && badgeCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0 ${
                      isActive
                        ? "sidebar-badge bg-white text-[var(--accent)]"
                        : "bg-[var(--btn-primary-bg)] text-white"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
                {sidebarCollapsed && badgeCount > 0 && (
                  <span
                    className="absolute right-2.5 top-2 size-2 rounded-full bg-[var(--accent-soft)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Admin Footer */}
        <div className="shrink-0 border-t border-[var(--sidebar-border)] p-3 bg-[var(--sidebar-surface)] space-y-1.5">
          <button
            type="button"
            title={sidebarCollapsed ? session.name : undefined}
            onClick={() => setSidebarLogoutOpen((v) => !v)}
            aria-expanded={sidebarLogoutOpen}
            className={`flex w-full items-center gap-2.5 min-w-0 rounded-xl p-1.5 text-left hover:bg-[var(--sidebar-hover)] transition cursor-pointer ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] text-xs font-bold text-white border border-[var(--accent-soft)]/30">
              {session.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "AD"}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {session.name}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--accent-soft)]">
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  <span className="truncate">2FA Verified</span>
                </div>
              </div>
            )}
          </button>
          {sidebarLogoutOpen && (
            <button
              type="button"
              title={sidebarCollapsed ? "Log out" : undefined}
              onClick={() => logout.mutate()}
              className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--btn-primary-hover)] transition cursor-pointer"
            >
              <LogOut size={15} />
              {!sidebarCollapsed && <span>Log out</span>}
            </button>
          )}
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white transition cursor-pointer"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={17} aria-hidden="true" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH STICKY HEADER                     */}
      {/* ======================================================== */}
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        {/* Sticky Desktop & Mobile Header */}
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile Menu Button & Brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--accent)] hover:bg-[var(--accent-tint)] transition"
                aria-label="Open side navigation menu"
              >
                <Menu size={22} />
              </button>
              <a href="/" className="shrink-0 flex items-center gap-2" aria-label={`${academyName} Home`}>
                <LogoMark size={28} surface="light" />
                <span className="text-sm font-bold text-[var(--text)] truncate">
                  {academyName} Admin
                </span>
              </a>
            </div>

            {/* Global Search Box (filters leads) */}
            <form
              onSubmit={handleGlobalSearchSubmit}
              className="relative hidden sm:block flex-1 max-w-md"
            >
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3.5 top-3.5 text-[var(--muted)]"
              />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search leads, students, payments (Press Enter)..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (activeSection === "leads") {
                    // update automatically if already on leads
                  }
                }}
                className={`${inputClass} pl-10 pr-16`}
              />
              <kbd className="absolute right-3 top-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono border border-[var(--border)] text-[var(--muted)] pointer-events-none select-none">
                Ctrl K
              </kbd>
            </form>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 ml-auto">
              <PaletteMenu />

              <Button
                secondary
                className="hidden md:inline-flex min-h-[40px] px-3.5"
                onClick={() => selectSection("reports")}
              >
                <Download size={15} />
                <span>Export</span>
              </Button>

              {/* Admin Profile Menu */}
              <ProfileMenu
                initials={
                  session.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "AD"
                }
                name={session.name}
                subtitle="Verified Session"
                onLogout={() => logout.mutate()}
                busy={logout.isPending}
              />
            </div>
          </div>
        </header>

        {/* Main Section Content Area */}
        <main
          id="admin-main"
          className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 p-4 sm:p-8 pb-8"
        >
          <AdminErrorBoundary
            key={activeItemConfig?.id || "admin"}
            reset={() => {
              void client.invalidateQueries();
            }}
          >
            {renderSection()}
          </AdminErrorBoundary>
        </main>
      </div>

      {/* ======================================================== */}
      {/* MOBILE SLIDE-OVER SIDEBAR DRAWER (<=900px)               */}
      {/* ======================================================== */}
      {mobileSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sidebar Drawer container sliding from left */}
          <div
            className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex min-h-[64px] items-center justify-between border-b border-[var(--sidebar-border)] px-4">
              <div className="flex items-center gap-2.5">
                <LogoMark size={28} surface="dark" />
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  {academyName} Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[var(--accent-soft)] hover:bg-[var(--sidebar-hover)] hover:text-white transition"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Items List */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Mobile side sections">
              {allowedItems.map((item) => {
                const isActive = activeItemConfig?.id === item.id;
                const Icon = item.icon;
                const badgeCount = item.id === "approvals" ? totalApprovalsCount : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSection(item.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[var(--btn-primary-bg)] text-white shadow-sm font-bold"
                        : "text-[var(--sidebar-text)]/80 hover:bg-[var(--sidebar-hover)] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={18} className={isActive ? "text-[var(--accent-soft)]" : "text-[var(--accent-soft)]/80"} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--btn-primary-bg)] px-1.5 text-[10px] font-bold text-white border border-[var(--accent-soft)]/30">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer User Footer */}
            <div className="border-t border-[var(--sidebar-border)] p-4 bg-[var(--sidebar-surface)]">
              <button
                type="button"
                onClick={() => setDrawerLogoutOpen((v) => !v)}
                aria-expanded={drawerLogoutOpen}
                className="flex w-full items-center gap-2.5 min-w-0 rounded-xl p-1.5 text-left hover:bg-[var(--sidebar-hover)] transition cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--btn-primary-bg)] text-xs font-bold text-white border border-[var(--accent-soft)]/30">
                  {session.name.slice(0, 2) || "AD"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{session.name}</div>
                  <div className="text-[10px] text-[var(--accent-soft)]">2FA Active</div>
                </div>
              </button>
              {drawerLogoutOpen && (
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  className="mt-2 flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--btn-primary-hover)] transition cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionGate({
  api,
  signInUrl,
  academyName,
  blocked,
  unblock,
  loggingOut,
  onLogoutStart,
  onLoggedOut,
}: {
  api: AdminApi;
  signInUrl: string;
  academyName: string;
  blocked: boolean;
  unblock: () => void;
  loggingOut: boolean;
  onLogoutStart: () => void;
  onLoggedOut: () => void;
}) {
  const query = useAdminSession(api);
  const [now, setNow] = useState(Date.now);
  const session = query.data;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = async () => {
    const result = await query.refetch();
    if (result.isSuccess) unblock();
  };

  if (loggingOut) {
    return null;
  }

  if (
    !blocked &&
    query.isSuccess &&
    session?.state === "authenticated" &&
    Date.parse(session.expiresAt) > Math.max(now, Date.now()) &&
    Date.parse(session.twoFactorExpiresAt) > Math.max(now, Date.now())
  ) {
    return (
      <AdminAuthority
        key={session.cacheKey}
        api={api}
        session={session}
        now={now}
      >
        <AdminWorkspace
          academyName={academyName}
          onLogoutStart={onLogoutStart}
          onLoggedOut={onLoggedOut}
        />
      </AdminAuthority>
    );
  }

  return (
    <>
      <WorkspaceAppearance />
      <main
        id="admin-main"
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-5"
      >
        {query.isPending ? (
          <Skeleton />
        ) : blocked || query.isError ? (
          <Card>
            <h1 className="mb-4 text-2xl font-bold text-[var(--text)]">
              Admin access needs confirmation
            </h1>
            <Notice error>
              {query.isError
                ? adminError(query.error)
                : "Your permissions or verification have changed. Refresh your session to continue."}
            </Notice>
            <Button
              className="mt-4 w-full"
              busy={query.isFetching}
              onClick={() => void refresh()}
            >
              Refresh admin session
            </Button>
            <div className="mt-3 text-center">
              <SecureLink href={signInUrl}>Sign in securely</SecureLink>
            </div>
          </Card>
        ) : session?.state === "two_factor_required" ? (
          <>
            <TwoFactor
              key={session.challengeId}
              api={api}
              challenge={session}
              now={now}
            />
            <Button
              secondary
              className="w-full"
              busy={query.isFetching}
              onClick={() => void refresh()}
            >
              Refresh verification session
            </Button>
          </>
        ) : (
          <Card>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent)] mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text)]">
              {session?.state === "authenticated"
                ? "Your verification has expired"
                : "Sign in to administration"}
            </h1>
            <p className="my-4 text-sm leading-6 text-[var(--muted)]">
              Sign in and complete two-factor verification to access academy operations.
            </p>
            <SecureLink href={signInUrl}>Sign in securely</SecureLink>
            <div className="mt-3">
              <Button
                secondary
                className="w-full"
                busy={query.isFetching}
                onClick={() => void refresh()}
              >
                Refresh admin session
              </Button>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}

export function AdminPanel({
  api,
  signInUrl = "/login",
  academyName = "Aintrix Academy",
  onLogout,
}: AdminPanelProps) {
  const [blocked, setBlocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);
  const [client] = useState(() => {
    const onError = (error: Error) => {
      if (
        !loggingOutRef.current &&
        error instanceof AdminApiError &&
        [401, 403].includes(error.status)
      ) {
        setBlocked(true);
      }
    };
    return new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: typeof window === "undefined" ? Infinity : 5 * 60 * 1000,
        },
        mutations: { retry: false },
      },
    });
  });

  const url = secureLink.safeParse(signInUrl);
  const resolvedSignInUrl = url.success ? url.data : "/login";

  const handleLogoutStart = () => {
    loggingOutRef.current = true;
    setLoggingOut(true);
    setBlocked(false);
  };

  const handleLoggedOut = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.assign(resolvedSignInUrl);
    }
  };

  return (
    <div className="ss-admin min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <QueryClientProvider client={client}>
        <AdminErrorBoundary
          reset={() =>
            void client.invalidateQueries({ queryKey: adminKeys.session })
          }
        >
          {url.success ? (
            <SessionGate
              api={api}
              signInUrl={url.data}
              academyName={academyName}
              blocked={blocked}
              unblock={() => setBlocked(false)}
              loggingOut={loggingOut}
              onLogoutStart={handleLogoutStart}
              onLoggedOut={handleLoggedOut}
            />
          ) : (
            <main className="mx-auto max-w-lg p-6">
              <Notice error>Configure a valid secure admin sign-in URL.</Notice>
            </main>
          )}
        </AdminErrorBoundary>
      </QueryClientProvider>
    </div>
  );
}
