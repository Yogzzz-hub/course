import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
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
} from "./contracts";
import {
  AdminAuthority,
  adminKeys,
  PermissionGate,
  useAdminAction,
  useAdminAuthority,
  useAdminResource,
  useAdminSession,
} from "./hooks";
import {
  hasPermission,
  resourcePermissions,
  sectionPermissions,
} from "./permissions";
import { ActionFeedback, OperationRecovery } from "./ActionFeedback";
import { Leads } from "./Leads";
import { Offers } from "./Offers";
import { Finance } from "./Finance";
import { Programmes } from "./Programmes";
import { Reports } from "./Reports";
import { Audit } from "./Audit";
import {
  AdminErrorBoundary,
  Button,
  Card,
  Empty,
  inputClass,
  Label,
  Notice,
  QueryView,
  SecureLink,
  Skeleton,
} from "./ui";
import { dateTime } from "./utils";
import "./admin-panel.css";
import { PaletteMenu, WorkspaceAppearance } from "../PaletteMenu";

export interface AdminPanelProps {
  api: AdminApi;
  signInUrl?: string;
  academyName?: string;
}
const items: {
  id: AdminSection;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "leads",
    label: "Leads pipeline",
    description:
      "Keep every enquiry moving with clear ownership and follow-ups.",
    icon: LayoutDashboard,
  },
  {
    id: "offers",
    label: "Offers & approvals",
    description: "Review discount requests and record an independent decision.",
    icon: ClipboardCheck,
  },
  {
    id: "finance",
    label: "Payments & ledger",
    description:
      "Reconcile payments, verify evidence and manage refund approvals.",
    icon: Wallet,
  },
  {
    id: "programmes",
    label: "Programmes & pricing",
    description:
      "Manage versioned packages, transparent fees and website builds.",
    icon: BookOpen,
  },
  {
    id: "reports",
    label: "Reports & analytics",
    description:
      "Measure conversions, counsellor performance and confirmed revenue.",
    icon: ChartNoAxesCombined,
  },
  {
    id: "audit",
    label: "Audit trail",
    description:
      "Review the server record of changes, decisions and request identifiers.",
    icon: FileClock,
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
    <Card>
      <ShieldCheck
        size={32}
        className="mb-4 text-indigo-700"
        aria-hidden="true"
      />
      <h1 className="text-2xl font-semibold">Verify your admin access</h1>
      <p className="my-4 text-sm leading-7 text-slate-600">
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
            className={`${inputClass} tracking-[0.4em]`}
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
            Your verification challenge expired. Refresh your session to
            continue.
          </Notice>
        )}
        <Button
          type="submit"
          busy={mutation.isPending}
          disabled={expired || !/^\d{6}$/.test(code)}
        >
          Verify and continue
        </Button>
      </form>
    </Card>
  );
}
function SearchBox({
  navigate,
}: {
  navigate: (section: AdminSection) => void;
}) {
  const { can } = useAdminAuthority();
  const [value, setValue] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  const query = useAdminResource("search", { q: term }, term.length >= 2);
  if (!can("search.read")) return null;
  const visible = value.trim().length >= 2 && term === value.trim();
  return (
    <div className="relative min-w-0 w-full order-last sm:order-none sm:w-auto sm:flex-1">
      <label htmlFor="admin-search" className="sr-only">
        Search admin workspace
      </label>
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="absolute top-3.5 left-3 text-slate-400"
        />
        <input
          id="admin-search"
          placeholder="Search leads, payments, programmes…"
          maxLength={200}
          className={`${inputClass} pl-9`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setValue("");
          }}
        />
      </div>
      {visible && (
        <div
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          role="region"
          aria-label="Search results"
        >
          <QueryView query={query}>
            {(data) => {
              const results = data.results.filter((item) =>
                can(sectionPermissions[item.section]),
              );
              return !results.length ? (
                <Empty>No accessible results.</Empty>
              ) : (
                results.map((item) => (
                  <button
                    key={`${item.section}:${item.id}`}
                    type="button"
                    className="block w-full rounded-lg p-3 text-left hover:bg-slate-50"
                    onClick={() => {
                      navigate(item.section);
                      setValue("");
                    }}
                  >
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {item.description}
                    </span>
                  </button>
                ))
              );
            }}
          </QueryView>
        </div>
      )}
    </div>
  );
}
function NotificationItem({
  item,
  navigate,
}: {
  item: import("./contracts").ResourceMap["notifications"]["notifications"][number];
  navigate: (section: AdminSection) => void;
}) {
  const { can } = useAdminAuthority();
  const action = useAdminAction();
  if (!can("notifications.read") || !can(sectionPermissions[item.section]))
    return null;
  return (
    <li className="space-y-2 border-b border-slate-100 py-3">
      <button
        type="button"
        className="text-left text-sm font-semibold text-indigo-700"
        onClick={() => navigate(item.section)}
      >
        {!item.read && (
          <span className="mr-1" aria-label="Unread">
            •
          </span>
        )}
        {item.title}
      </button>
      <p className="text-xs text-slate-500">{dateTime(item.at)}</p>
      {!item.read && can("notifications.write") && (
        <Button
          secondary
          busy={action.busy}
          onClick={() =>
            void action.run({
              type: "notification.read",
              notificationId: item.id,
            })
          }
        >
          Mark as read
        </Button>
      )}
      <ActionFeedback action={action} />
    </li>
  );
}
function Notifications({
  navigate,
}: {
  navigate: (section: AdminSection) => void;
}) {
  const { can } = useAdminAuthority();
  const [open, setOpen] = useState(false);
  const query = useAdminResource("notifications", {}, open);
  if (!can("notifications.read")) return null;
  return (
    <div className="relative">
      <Button
        secondary
        aria-label="Notification center"
        aria-expanded={open}
        aria-controls="admin-notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
      </Button>
      {open && (
        <div
          id="admin-notifications"
          role="region"
          aria-label="Notifications"
          className="absolute top-full right-0 z-40 mt-2 max-h-96 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Notifications</h2>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <QueryView query={query}>
            {(data) => {
              const visible = data.notifications.filter((item) =>
                can(sectionPermissions[item.section]),
              );
              return !visible.length ? (
                <Empty>No notifications.</Empty>
              ) : (
                <ul>
                  {visible.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      navigate={(section) => {
                        navigate(section);
                        setOpen(false);
                      }}
                    />
                  ))}
                </ul>
              );
            }}
          </QueryView>
        </div>
      )}
    </div>
  );
}
function Workspace({ academyName }: { academyName: string }) {
  const { can, session, api } = useAdminAuthority();
  const client = useQueryClient();
  const [selected, setSelected] = useState<AdminSection>("leads");
  const [collapsed, setCollapsed] = useState(false);
  const allowed = items.filter((item) => can(sectionPermissions[item.id]));
  const active = allowed.find((item) => item.id === selected) || allowed[0];
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
  const content =
    active?.id === "leads" ? (
      <Leads />
    ) : active?.id === "offers" ? (
      <Offers />
    ) : active?.id === "finance" ? (
      <Finance />
    ) : active?.id === "programmes" ? (
      <Programmes />
    ) : active?.id === "reports" ? (
      <Reports />
    ) : (
      <Audit />
    );
  return (
    <>
      <a href="#admin-main" className="admin-skip">
        Skip to admin workspace
      </a>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-slate-200 bg-white lg:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex min-h-20 shrink-0 items-center gap-3 border-b border-slate-100 p-5">
          <a href="/" className="logo flex flex-row items-center flex-nowrap gap-2.5 shrink-0" aria-label={`${academyName} home`}>
            <LogoMark size={32} className="shrink-0" />
            {!collapsed && (
              <span className="logo-wordmark flex flex-col justify-center leading-tight">
                <span className="logo-name whitespace-nowrap">{academyName.replace(/\s+(Technical\s+)?Academy$/i, "")}</span>
                <span className="logo-subtitle whitespace-nowrap">Academy</span>
              </span>
            )}
          </a>
        </div>
        <nav aria-label="Admin navigation" className="space-y-2 px-3 py-6">
          {allowed.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={active?.id === item.id ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              onClick={() => setSelected(item.id)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${active?.id === item.id ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3 p-3">
          <Button
            secondary
            className="w-full"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <Menu size={18} />
            {!collapsed && "Collapse sidebar"}
          </Button>
          <p className="flex justify-center gap-1 text-xs text-emerald-700">
            <ShieldCheck size={14} />
            {!collapsed && "Two-factor verified"}
          </p>
        </div>
      </aside>
      <div className={collapsed ? "lg:pl-20" : "lg:pl-64"}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:justify-start sm:px-7">
            <div className="flex items-center gap-2 lg:hidden">
              <a href="/" className="logo shrink-0" aria-label={`${academyName} home`}>
                <LogoMark size={26} />
              </a>
              <span className="text-sm font-bold truncate">
                {academyName} Admin
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto sm:ml-0 sm:order-last">
              <PaletteMenu />
              <Notifications navigate={setSelected} />
              <Button
                secondary
                busy={logout.isPending}
                aria-label="Sign out of admin workspace"
                onClick={() => logout.mutate()}
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
            <SearchBox navigate={setSelected} />
          </div>
          <nav
            aria-label="Mobile admin navigation"
            className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden"
          >
            {allowed.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold ${active?.id === item.id ? "bg-indigo-50 text-indigo-800" : "text-slate-600"}`}
                aria-current={active?.id === item.id ? "page" : undefined}
                onClick={() => setSelected(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>
        <main
          id="admin-main"
          className="mx-auto min-w-0 max-w-[1600px] space-y-6 p-4 sm:p-7"
        >
          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-700 uppercase">
              Administration · {session.name}
            </p>
            <h1
              tabIndex={-1}
              className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {active?.label || "Your admin workspace"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {active?.description ||
                "Ask your administrator to assign access to the required sections."}
            </p>
          </div>
          {logout.isError && <Notice error>{adminError(logout.error)}</Notice>}
          <OperationRecovery />
          {active ? (
            <PermissionGate permissions={[sectionPermissions[active.id]]}>
              <AdminErrorBoundary
                key={active.id}
                reset={() => {
                  void client.invalidateQueries({
                    queryKey: adminKeys.scope(session),
                  });
                }}
              >
                {content}
              </AdminErrorBoundary>
            </PermissionGate>
          ) : (
            <Empty>No administration permissions have been assigned.</Empty>
          )}
        </main>
      </div>
    </>
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
  const client = useQueryClient();
  const [now, setNow] = useState(Date.now);
  const session = query.data;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    client.removeQueries({
      predicate: (item) => {
        if (item.queryKey[0] !== "admin" || item.queryKey[1] === "session")
          return false;
        if (
          session?.state !== "authenticated" ||
          item.queryKey[1] !== session.cacheKey
        )
          return true;
        const resource = item.queryKey[2];
        return (
          typeof resource === "string" &&
          resource in resourcePermissions &&
          !resourcePermissions[
            resource as keyof typeof resourcePermissions
          ].every((permission) => hasPermission(session, permission, now))
        );
      },
    });
  }, [session, client, now]);
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
  )
    return (
      <AdminAuthority
        key={session.cacheKey}
        api={api}
        session={session}
        now={now}
      >
        <Workspace academyName={academyName} />
      </AdminAuthority>
    );
  return (
    <><WorkspaceAppearance/>
    <main
      id="admin-main"
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-5"
    >
      {query.isPending ? (
        <Skeleton />
      ) : blocked || query.isError ? (
        <Card>
          <h1 className="mb-4 text-2xl font-semibold">
            Admin access needs confirmation
          </h1>
          <Notice error>
            {query.isError
              ? adminError(query.error)
              : "Your permissions or verification have changed. Refresh your session to continue."}
          </Notice>
          <Button
            className="mt-4"
            busy={query.isFetching}
            onClick={() => void refresh()}
          >
            Refresh admin session
          </Button>
          <div className="mt-3">
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
            busy={query.isFetching}
            onClick={() => void refresh()}
          >
            Refresh verification session
          </Button>
        </>
      ) : (
        <Card>
          <ShieldCheck size={32} className="mb-4 text-indigo-700" />
          <h1 className="text-2xl font-semibold">
            {session?.state === "authenticated"
              ? "Your verification has expired"
              : "Sign in to administration"}
          </h1>
          <p className="my-4 text-sm leading-7 text-slate-600">
            Sign in and complete two-factor verification to access academy
            operations.
          </p>
          <SecureLink href={signInUrl}>Sign in securely</SecureLink>
          <div className="mt-3">
            <Button
              secondary
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
    <div className="ss-admin min-h-screen bg-slate-50 text-slate-900">
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
