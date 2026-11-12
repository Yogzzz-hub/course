import { useEffect, useState, useMemo } from "react";
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
  MoreHorizontal,
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

export interface AdminPanelProps {
  api: AdminApi;
  signInUrl?: string;
  academyName?: string;
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
      <h1 className="text-2xl font-bold text-[#241921]">Verify admin access</h1>
      <p className="my-3 text-sm leading-6 text-[#645A62]">
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

function AdminWorkspace({ academyName }: { academyName: string }) {
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
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  const selectSection = (section: DashboardSection) => {
    setActiveSection(section);
    if (typeof window !== "undefined") {
      window.location.hash = `#${section}`;
    }
    setMobileMoreOpen(false);
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
    mutationFn: () =>
      api.logout({
        csrfToken: session.csrfToken,
        sessionKey: session.cacheKey,
        requestId: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => {
      client.setQueryData(adminKeys.session, { state: "anonymous" });
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "admin" && query.queryKey[1] !== "session",
      });
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
    <div className="min-h-screen bg-[#F7F9FB] text-[#241921] flex flex-col">
      <a href="#admin-main" className="admin-skip">
        Skip to main content
      </a>

      {/* ======================================================== */}
      {/* DESKTOP FIXED SIDEBAR (>900px, about 240px wide)        */}
      {/* ======================================================== */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-[#4F1A2C] bg-[#3A1020] text-[#F7F9FB] lg:flex"
        aria-label="Admin sidebar navigation"
      >
        {/* Sidebar Brand Header */}
        <div className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-[#4F1A2C] px-5">
          <a
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition"
            aria-label={`${academyName} Home`}
          >
            <LogoMark size={28} className="shrink-0 text-[#A9C9DC]" />
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">
                {academyName.replace(/\s+(Technical\s+)?Academy$/i, "")}
              </span>
              <span className="text-[11px] font-semibold text-[#A9C9DC] tracking-wider uppercase">
                Admin Portal
              </span>
            </div>
          </a>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Sections">
          {allowedItems.map((item) => {
            const isActive = activeItemConfig?.id === item.id;
            const Icon = item.icon;
            const badgeCount = item.id === "approvals" ? totalApprovalsCount : 0;

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => selectSection(item.id)}
                className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition ${
                  isActive
                    ? "bg-[#681C35] text-white shadow-sm font-bold"
                    : "text-[#F7F9FB]/80 hover:bg-[#4F1A2C] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={`shrink-0 ${
                      isActive ? "text-[#A9C9DC]" : "text-[#F7F9FB]/70 group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {badgeCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      isActive
                        ? "bg-white text-[#681C35]"
                        : "bg-[#681C35] text-white"
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Admin Footer */}
        <div className="mt-auto border-t border-[#4F1A2C] p-4 bg-[#320D1B]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#681C35] text-xs font-bold text-white border border-[#A9C9DC]/30">
                {session.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "AD"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {session.name}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#A9C9DC]">
                  <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                  <span className="truncate">2FA Verified</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout.mutate()}
              title="Sign out of admin"
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#F7F9FB]/70 hover:bg-[#4F1A2C] hover:text-white transition"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH STICKY HEADER                     */}
      {/* ======================================================== */}
      <div className="lg:pl-60 flex-1 flex flex-col min-w-0">
        {/* Sticky Desktop & Mobile Header */}
        <header className="sticky top-0 z-20 border-b border-[#DFE5EC] bg-white/95 backdrop-blur px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Mobile Menu Button & Brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#681C35] hover:bg-[#F3F7FA] transition"
                aria-label="Open side navigation menu"
              >
                <Menu size={22} />
              </button>
              <a href="/" className="shrink-0 flex items-center gap-2" aria-label={`${academyName} Home`}>
                <LogoMark size={28} className="text-[#681C35]" />
                <span className="text-sm font-bold text-[#241921] truncate">
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
                className="absolute left-3.5 top-3.5 text-[#645A62]"
              />
              <input
                type="search"
                placeholder="Search leads, students, payments (Press Enter)..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  if (activeSection === "leads") {
                    // update automatically if already on leads
                  }
                }}
                className={`${inputClass} pl-10`}
              />
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

              {/* Admin Avatar */}
              <div
                title={`Signed in as ${session.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#681C35] text-xs font-bold text-white shadow-sm"
              >
                {session.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "AD"}
              </div>
            </div>
          </div>
        </header>

        {/* Main Section Content Area */}
        <main
          id="admin-main"
          className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 p-4 sm:p-8 pb-28 lg:pb-8"
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
      {/* MOBILE FIXED BOTTOM TAB BAR (<=900px)                    */}
      {/* Overview, Leads, Approvals, Payments, More               */}
      {/* ======================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t border-[#DFE5EC] bg-white/95 px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => selectSection("overview")}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeSection === "overview"
              ? "text-[#681C35] font-bold"
              : "text-[#645A62] hover:text-[#241921]"
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Overview</span>
        </button>

        <button
          type="button"
          onClick={() => selectSection("leads")}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeSection === "leads"
              ? "text-[#681C35] font-bold"
              : "text-[#645A62] hover:text-[#241921]"
          }`}
        >
          <Users size={20} />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Leads</span>
        </button>

        <button
          type="button"
          onClick={() => selectSection("approvals")}
          className={`relative flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeSection === "approvals"
              ? "text-[#681C35] font-bold"
              : "text-[#645A62] hover:text-[#241921]"
          }`}
        >
          <div className="relative">
            <ClipboardCheck size={20} />
            {totalApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#681C35] text-[9px] font-bold text-white">
                {totalApprovalsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap">Approvals</span>
        </button>

        <button
          type="button"
          onClick={() => selectSection("payments")}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            activeSection === "payments"
              ? "text-[#681C35] font-bold"
              : "text-[#645A62] hover:text-[#241921]"
          }`}
        >
          <Wallet size={20} />
          <span className="text-[10px] tracking-tight whitespace-nowrap">Payments</span>
        </button>

        <button
          type="button"
          aria-expanded={mobileMoreOpen}
          onClick={() => setMobileMoreOpen((open) => !open)}
          className={`flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition ${
            ["programmes", "students", "reports", "settings"].includes(activeSection)
              ? "text-[#681C35] font-bold"
              : "text-[#645A62] hover:text-[#241921]"
          }`}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] tracking-tight whitespace-nowrap">More</span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* "MORE" MOBILE BOTTOM SHEET DRAWER                       */}
      {/* ======================================================== */}
      {mobileMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMoreOpen(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-[#DFE5EC] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#DFE5EC]">
              <span className="text-sm font-bold text-[#241921]">
                Additional Operations
              </span>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#645A62] hover:bg-[#F3F7FA]"
                aria-label="Close sheet"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                type="button"
                onClick={() => selectSection("programmes")}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-semibold transition ${
                  activeSection === "programmes"
                    ? "border-[#681C35] bg-[#681C35] text-white"
                    : "border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
                }`}
              >
                <BookOpen size={20} />
                <span>Programmes</span>
              </button>

              <button
                type="button"
                onClick={() => selectSection("students")}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-semibold transition ${
                  activeSection === "students"
                    ? "border-[#681C35] bg-[#681C35] text-white"
                    : "border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
                }`}
              >
                <GraduationCap size={20} />
                <span>Students</span>
              </button>

              <button
                type="button"
                onClick={() => selectSection("reports")}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-semibold transition ${
                  activeSection === "reports"
                    ? "border-[#681C35] bg-[#681C35] text-white"
                    : "border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
                }`}
              >
                <ChartNoAxesCombined size={20} />
                <span>Reports</span>
              </button>

              <button
                type="button"
                onClick={() => selectSection("settings")}
                className={`flex min-h-[48px] items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-semibold transition ${
                  activeSection === "settings"
                    ? "border-[#681C35] bg-[#681C35] text-white"
                    : "border-[#DFE5EC] bg-white text-[#241921] hover:bg-[#F3F7FA]"
                }`}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#DFE5EC] flex items-center justify-between">
              <span className="text-xs text-[#645A62]">
                Admin: {session.name}
              </span>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="inline-flex min-h-[44px] items-center gap-2 text-xs font-bold text-red-700 hover:underline"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-[#3A1020] text-[#F7F9FB] shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex min-h-[64px] items-center justify-between border-b border-[#4F1A2C] px-4">
              <div className="flex items-center gap-2.5">
                <LogoMark size={26} className="text-[#A9C9DC]" />
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  {academyName} Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#A9C9DC] hover:bg-[#4F1A2C] hover:text-white transition"
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
                        ? "bg-[#681C35] text-white shadow-sm font-bold"
                        : "text-[#F7F9FB]/80 hover:bg-[#4F1A2C] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={18} className={isActive ? "text-[#A9C9DC]" : "text-[#A9C9DC]/80"} />
                      <span>{item.label}</span>
                    </div>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#681C35] px-1.5 text-[10px] font-bold text-white border border-[#A9C9DC]/30">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer User Footer */}
            <div className="border-t border-[#4F1A2C] p-4 bg-[#320D1B]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#681C35] text-xs font-bold text-white border border-[#A9C9DC]/30">
                    {session.name.slice(0, 2) || "AD"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{session.name}</div>
                    <div className="text-[10px] text-[#A9C9DC]">2FA Active</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-[#F7F9FB]/70 hover:bg-[#4F1A2C] hover:text-white transition"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
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
}: Required<AdminPanelProps> & { blocked: boolean; unblock: () => void }) {
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
        <AdminWorkspace academyName={academyName} />
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
            <h1 className="mb-4 text-2xl font-bold text-[#241921]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F7FA] text-[#681C35] mb-4">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold text-[#241921]">
              {session?.state === "authenticated"
                ? "Your verification has expired"
                : "Sign in to administration"}
            </h1>
            <p className="my-4 text-sm leading-6 text-[#645A62]">
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
  signInUrl = "/auth/admin/sign-in?returnTo=%2Fadmin-panel",
  academyName = "Aintrix Academy",
}: AdminPanelProps) {
  const [blocked, setBlocked] = useState(false);
  const [client] = useState(() => {
    const onError = (error: Error) => {
      if (error instanceof AdminApiError && [401, 403].includes(error.status))
        setBlocked(true);
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

  return (
    <div className="ss-admin min-h-screen bg-[#F7F9FB] text-[#241921]">
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
