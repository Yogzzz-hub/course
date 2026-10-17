import { useEffect, useState, type ReactNode } from "react";
import { PaletteMenu, WorkspaceAppearance } from "../PaletteMenu";
import {
  QueryCache,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  QueryErrorResetBoundary,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  House,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  Sparkles,
  Users,
  Orbit,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StudentApiError, friendlyError } from "./api";
import type { PaymentGateway, StudentApi, StudentSession } from "./contracts";
import { useStudentActions, useStudentSession, studentKeys } from "./hooks";
import {
  ProspectHome,
  LearningPlanView,
  CounsellingSessions,
} from "./Prospect";
import { EnrolledHome, ClassSchedule } from "./Enrolled";
import { ClassSessions } from "./ClassSessions";
import { PaymentsView } from "./Checkout";
import { AssignmentsView } from "./Assignments";
import { MentorshipView } from "./Mentorship";
import {
  Button,
  Card,
  Notice,
  PanelErrorBoundary,
  QueryView,
  ScreenTitle,
  SecureLink,
  Skeleton,
} from "./ui";
import type { PanelTab } from "./utils";
import "./student-panel.css";

export interface StudentPanelProps {
  api: StudentApi;
  gateway: PaymentGateway;
  signInUrl?: string;
  supportUrl?: string;
  academyName?: string;
  /** Optional development preview entry; never substitutes an authenticated session. */
  unavailableAction?: ReactNode;
  /** Untrusted public catalogue intent; matched against the server learning plan. */
  checkoutPackageId?: string;
}
function SignIn({ url, expired = false, action }: { url: string; expired?: boolean; action?: ReactNode }) {
  return (
    <><WorkspaceAppearance/>
    <main
      id="student-main"
      className="mx-auto flex min-h-screen max-w-lg items-center p-5"
    >
      <Card>
        <GraduationCap
          size={32}
          className="mb-5 text-indigo-700"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-bold">
          {expired
            ? "Your session has expired."
            : "Welcome to your student workspace."}
        </h1>
        <p className="my-4 text-sm leading-7 text-slate-600">
          Sign in to view your learning plan, payments and programme activity.
        </p>
        <SecureLink href={url}>Sign in securely</SecureLink>
        {action}
      </Card>
    </main>
    </>
  );
}
function MoreView({
  api,
  session,
  supportUrl,
  onMentorship,
}: {
  api: StudentApi;
  session: StudentSession;
  supportUrl: string;
  onMentorship: () => void;
}) {
  const { logout } = useStudentActions(api, session);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Your account</h2>
        <p className="text-sm font-semibold">{session.name}</p>
        <p className="mt-2 text-sm text-slate-600">{session.email}</p>
        <p className="my-4 text-xs font-semibold capitalize text-indigo-700">
          {session.mode} workspace
        </p>
        {logout.isError && <Notice error>{friendlyError(logout.error)}</Notice>}
        <Button
          secondary
          busy={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </Button>
      </Card>
      {session.mode === "enrolled" && (
        <Card>
          <Users
            size={22}
            className="mb-3 text-indigo-700"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">Mentorship & attendance</h2>
          <p className="my-3 text-sm leading-relaxed text-slate-600">
            Book a mentor session, check your remaining entitlement and review
            class attendance.
          </p>
          <Button onClick={onMentorship}>Open mentorship</Button>
        </Card>
      )}
      <Card>
        <h2 className="text-lg font-semibold">We’re here to help</h2>
        <p className="my-3 text-sm leading-relaxed text-slate-600">
          Have a question about your plan, enrolment or learning experience?
        </p>
        <SecureLink href={supportUrl}>Contact academy support</SecureLink>
      </Card>
    </div>
  );
}
function Workspace({
  session,
  api,
  gateway,
  supportUrl,
  academyName,
  checkoutPackageId,
}: StudentPanelProps & {
  session: StudentSession;
  supportUrl: string;
  academyName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<PanelTab>(session.mode === 'prospect' && checkoutPackageId ? 'payments' : 'home');
  const [showMentorship, setShowMentorship] = useState(false);
  const [packageId, setPackageId] = useState(checkoutPackageId);
  const client = useQueryClient();
  const enrolled = session.mode === "enrolled";
  const navigate = (next: PanelTab) => {
    setTab(next);
    setShowMentorship(false);
  };
  const items: {
    id: PanelTab;
    label: string;
    mobileLabel: string;
    icon: LucideIcon;
  }[] = [
    { id: "home", label: "Home", mobileLabel: "Home", icon: House },
    {
      id: "schedule",
      label: "Schedule",
      mobileLabel: "Schedule",
      icon: CalendarDays,
    },
    {
      id: "work",
      label: enrolled ? "Assignments & projects" : "My learning plan",
      mobileLabel: enrolled ? "Assignments" : "Sessions",
      icon: BookOpen,
    },
    {
      id: "payments",
      label: "Payments",
      mobileLabel: "Payments",
      icon: CreditCard,
    },
    { id: "more", label: "More", mobileLabel: "More", icon: MoreHorizontal },
  ];
  const titles: Record<PanelTab, [string, string]> = {
    home: [
      `Welcome back, ${session.name.split(" ")[0]}.`,
      enrolled
        ? "Your learning, your progress, your next step."
        : "A clear path from your first conversation to your first class.",
    ],
    schedule: [
      "Your schedule",
      enrolled
        ? "Your class sessions, attendance and live class links, in one place."
        : "Your counselling sessions and upcoming conversations.",
    ],
    work: [
      enrolled ? "Assignments & projects" : "My learning plan",
      enrolled
        ? "Build, submit and learn from every round of feedback."
        : "A programme recommendation built around your goals.",
    ],
    payments: [
      "Payments & enrolment",
      "Review your fees, securely pay and track verified payment status.",
    ],
    more: showMentorship
      ? [
          "Mentorship & attendance",
          "Focused guidance, with a clear record of your learning.",
        ]
      : ["Your workspace", "Account, support and everything else you need."],
  };
  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-64";
  const contentOffset = collapsed ? "lg:pl-20" : "lg:pl-64";
  return (
    <>
      <a className="student-skip" href="#student-main">
        Skip to workspace
      </a>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-slate-200 bg-white lg:flex ${sidebarWidth}`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <a href="/" className="logo flex flex-row items-center flex-nowrap gap-2.5 shrink-0" aria-label={`${academyName} home`}>
            <Orbit size={32} aria-hidden="true" className="shrink-0 text-[var(--accent)]" />
            {!collapsed && (
              <span className="logo-wordmark flex flex-col justify-center leading-tight">
                <span className="logo-name whitespace-nowrap">{academyName.replace(/\s+Technical Academy$/i, "")}</span>
                <span className="logo-subtitle whitespace-nowrap">Technical Academy</span>
              </span>
            )}
          </a>
        </div>
        <div className="px-3 py-5">
          <span
            className={`flex items-center justify-center gap-2 rounded-lg bg-indigo-50 py-2 text-xs font-semibold text-indigo-800 ${collapsed ? "px-1" : "px-3"}`}
            title={`${enrolled ? "Enrolled" : "Prospect"} workspace`}
          >
            <span className="size-2 shrink-0 rounded-full bg-indigo-600" />
            {collapsed ? (
              <span className="sr-only">
                {enrolled ? "Enrolled" : "Prospect"}
              </span>
            ) : (
              `${enrolled ? "Enrolled" : "Prospect"} workspace`
            )}
          </span>
        </div>
        <nav aria-label="Workspace navigation" className="space-y-1 px-3">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              title={collapsed ? label : undefined}
              onClick={() => navigate(id)}
              aria-current={tab === id && !showMentorship ? "page" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${tab === id && !showMentorship ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100"} ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : ""}>{label}</span>
            </button>
          ))}
          {enrolled && (
            <button
              title={collapsed ? "Mentorship & attendance" : undefined}
              onClick={() => {
                setTab("more");
                setShowMentorship(true);
              }}
              aria-current={showMentorship ? "page" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${showMentorship ? "bg-indigo-50 text-indigo-800" : "text-slate-600 hover:bg-slate-100"} ${collapsed ? "justify-center" : ""}`}
            >
              <Users size={19} className="shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : ""}>
                Mentorship & attendance
              </span>
            </button>
          )}
        </nav>
        <div className="mt-auto border-t border-slate-100 p-3">
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <ChevronRight size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
            {!collapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>
      <div className={contentOffset}>
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <a href="/" className="logo lg:hidden" aria-label={`${academyName} home`}>
              <Orbit size={28} aria-hidden="true" />
            </a>
            <div>
              <p className="text-sm font-semibold">
                {enrolled ? session.programme : "Your academy journey"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {academyName} · Technical Academy
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2"><PaletteMenu/>
          <span className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
            {enrolled ? "Enrolled" : "Prospect"}
          </span>
          </div>
        </header>
        <main
          id="student-main"
          tabIndex={-1}
          className="mx-auto max-w-7xl p-4 pb-28 sm:p-8 sm:pb-28 lg:pb-10"
        >
          <ScreenTitle title={titles[tab][0]} subtitle={titles[tab][1]} />
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <PanelErrorBoundary
                key={`${tab}-${showMentorship}`}
                onReset={() => {
                  reset();
                  void client.invalidateQueries({
                    queryKey: studentKeys.scope(session),
                  });
                }}
              >
                {tab === "home" &&
                  (session.mode === "prospect" ? (
                    <ProspectHome session={session} navigate={navigate} />
                  ) : (
                    <EnrolledHome
                      api={api}
                      session={session}
                      navigate={navigate}
                    />
                  ))}
                {tab === "schedule" &&
                  (enrolled ? (
                    <div className="space-y-5">
                      <ClassSessions api={api} session={session} />
                      <ClassSchedule api={api} session={session} />
                    </div>
                  ) : (
                    <CounsellingSessions api={api} session={session} />
                  ))}
                {tab === "work" &&
                  (enrolled ? (
                    <AssignmentsView api={api} session={session} />
                  ) : (
                    <div className="space-y-6">
                      <LearningPlanView
                        api={api}
                        session={session}
                        onCheckout={(id) => {
                          setPackageId(id);
                          navigate("payments");
                        }}
                      />
                      <h2 className="text-lg font-semibold">
                        Your counselling sessions
                      </h2>
                      <CounsellingSessions api={api} session={session} />
                    </div>
                  ))}
                {tab === "payments" && (
                  <PaymentsView
                    api={api}
                    session={session}
                    gateway={gateway}
                    packageId={packageId}
                  />
                )}
                {tab === "more" &&
                  (enrolled && showMentorship ? (
                    <>
                      <Button
                        secondary
                        className="mb-4 lg:hidden"
                        onClick={() => setShowMentorship(false)}
                      >
                        <ChevronLeft size={16} aria-hidden="true" />
                        Back to More
                      </Button>
                      <MentorshipView api={api} session={session} />
                    </>
                  ) : (
                    <MoreView
                      api={api}
                      session={session}
                      supportUrl={supportUrl}
                      onMentorship={() => setShowMentorship(true)}
                    />
                  ))}
              </PanelErrorBoundary>
            )}
          </QueryErrorResetBoundary>
          <p className="mt-10 flex items-center gap-2 text-xs text-slate-500">
            <Sparkles size={13} aria-hidden="true" />
            Learn. Build. Evolve.
          </p>
        </main>
      </div>
      <nav
        aria-label="Mobile workspace navigation"
        className="student-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white px-1 pt-2 lg:hidden"
      >
        {items.map(({ id, mobileLabel, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[10px] font-semibold ${tab === id ? "bg-indigo-50 text-indigo-800" : "text-slate-600"}`}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{mobileLabel}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
function SessionGate(
  props: StudentPanelProps & {
    signInUrl: string;
    supportUrl: string;
    academyName: string;
  },
) {
  const query = useStudentSession(props.api);
  const client = useQueryClient();
  const scope = query.data?.cacheKey;
  const mode = query.data?.mode;
  useEffect(() => {
    // Evict a previous account's data when the authenticated session changes or signs out.
    client.removeQueries({
      predicate: (item) =>
        item.queryKey[0] === "student" &&
        item.queryKey[1] !== "session" &&
        (item.queryKey[1] !== scope || item.queryKey[2] !== mode),
    });
    client.getMutationCache().clear();
  }, [client, scope, mode]);
  if (query.isPending)
    return (
      <><WorkspaceAppearance/>
      <main id="student-main" className="mx-auto max-w-5xl p-6">
        <Skeleton />
      </main>
      </>
    );
  if (query.isError)
    return (
      <><WorkspaceAppearance/>
      <main id="student-main" className="mx-auto max-w-2xl px-5 py-16">
        <Card>
        <GraduationCap size={32} aria-hidden="true" className="mb-5 text-indigo-700"/>
        <h1 className="mb-4 text-2xl font-bold">Your student workspace</h1>
        <Notice error>{friendlyError(query.error)}</Notice>
        <Button className="mt-4" busy={query.isFetching} onClick={() => void query.refetch()}>
          Retry session
        </Button>
        {props.unavailableAction}
        <p className="mt-5 text-sm text-slate-600"><SecureLink href={props.supportUrl}>Contact academy support</SecureLink></p>
        </Card>
      </main>
      </>
    );
  return (
    <QueryView query={query}>
      {(session) =>
        session ? (
          <Workspace
            key={`${session.cacheKey}-${session.mode}`}
            {...props}
            session={session}
          />
        ) : (
          <SignIn url={props.signInUrl} action={props.unavailableAction}/>
        )
      }
    </QueryView>
  );
}
export function StudentPanel({
  signInUrl = "/auth/sign-in?returnTo=%2Fstudent-panel",
  supportUrl = "/contact",
  academyName = "Shadow Sphere",
  ...props
}: StudentPanelProps) {
  const [expired, setExpired] = useState(false);
  const [client] = useState(() => {
    const handleError = (error: Error) => {
      if (error instanceof StudentApiError && error.status === 401)
        setExpired(true);
    };
    return new QueryClient({
      queryCache: new QueryCache({ onError: handleError }),
      mutationCache: new MutationCache({ onError: handleError }),
      defaultOptions: {
        queries: {
          gcTime: typeof window === "undefined" ? Infinity : 5 * 60000,
          refetchOnWindowFocus: true,
        },
        mutations: { retry: false, networkMode: "always" },
      },
    });
  });
  useEffect(() => {
    if (expired) client.clear();
    return () => {
      if (expired) client.clear();
    };
  }, [client, expired]);
  useEffect(() => () => client.clear(), [client]);
  return (
    <div className="ss-student min-h-screen">
      <QueryClientProvider client={client}>
        <PanelErrorBoundary onReset={() => client.clear()}>
          {expired ? (
            <SignIn url={signInUrl} expired />
          ) : (
            <SessionGate
              {...props}
              signInUrl={signInUrl}
              supportUrl={supportUrl}
              academyName={academyName}
            />
          )}
        </PanelErrorBoundary>
      </QueryClientProvider>
      <noscript>
        <main className="p-6">
          <p>
            Enable JavaScript and sign in to use your private student workspace.
          </p>
        </main>
      </noscript>
    </div>
  );
}
export function StudentPanelLoading() {
  return (
    <div className="ss-student min-h-screen p-6">
      <Skeleton />
    </div>
  );
}
