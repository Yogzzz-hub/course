import { useId, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  Clock3,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import type { AttendanceStatus, Batch } from "../academy/contracts";
import { formatDate, formatTime } from "../academy/rules";
import type { ClassProgress, StudentApi, StudentSession } from "./contracts";
import { useClassProgress } from "./hooks";
import { friendlyError } from "./api";
import { Button, Card, Empty, Notice, QueryView } from "./ui";
import {
  classStanding,
  classTimeline,
  type ClassDay,
  type PanelTab,
} from "./utils";

const RECENT_CLASSES = 8;
const weekdayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const scheduleNames = {
  weekdays: "Weekdays",
  weekends: "Weekends",
  flexible: "Flexible",
} as const;
// A batch can run into the next year, so its start and end dates carry one.
const batchDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
const notAllocated =
  "Your batch is being allocated. Class sessions, attendance and syllabus progress will appear here once it is confirmed.";

const chips: Record<
  AttendanceStatus | "unmarked" | "not-submitted",
  { label: string; icon: LucideIcon; className: string; mark: boolean }
> = {
  present: {
    label: "Present",
    icon: CircleCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    mark: true,
  },
  absent: {
    label: "Absent",
    icon: CircleX,
    className: "border-red-200 bg-red-50 text-red-800",
    mark: true,
  },
  leave: {
    label: "Leave",
    icon: CircleMinus,
    className: "border-amber-200 bg-amber-50 text-amber-900",
    mark: true,
  },
  unmarked: {
    label: "No attendance recorded",
    icon: CircleDashed,
    className: "border-slate-300 bg-white text-slate-700",
    mark: true,
  },
  "not-submitted": {
    label: "Attendance not submitted",
    icon: CircleDashed,
    className: "border-dashed border-slate-400 bg-white text-slate-700",
    mark: false,
  },
};
function Chip({ kind }: { kind: keyof typeof chips }) {
  const { label, icon: Icon, className, mark } = chips[kind];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {mark && <span className="sr-only">Your attendance: </span>}
      {label}
    </span>
  );
}
function Tag({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-indigo-800 uppercase">
      {children}
    </span>
  );
}
function Meter({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <span
          aria-hidden="true"
          className="text-2xl font-semibold text-slate-900 tabular-nums"
        >
          {percent}%
        </span>
      </div>
      <progress id={id} max={100} value={percent} />
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{detail}</p>
    </div>
  );
}

type Standing = ReturnType<typeof classStanding>;
const completionStates: Record<
  NonNullable<Standing["request"]> | "eligible" | "open",
  { tone: string; icon: LucideIcon; detail: string }
> = {
  pending_admin: {
    tone: "border-indigo-200 bg-indigo-50 text-indigo-900",
    icon: Hourglass,
    detail: "Your trainer has sent your course completion to the academy admin.",
  },
  approved: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: BadgeCheck,
    detail: "The academy admin has approved your course completion.",
  },
  rejected: {
    tone: "border-amber-200 bg-amber-50 text-amber-950",
    icon: CircleAlert,
    detail:
      "The academy admin did not approve this request. Your trainer will follow up with you.",
  },
  eligible: {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CircleCheck,
    detail:
      "Attendance and syllabus are both at 100%. Your trainer can now send your course for admin approval.",
  },
  open: {
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: CircleDashed,
    detail:
      "Your trainer can request completion once attendance and syllabus both reach 100%.",
  },
};
function Completion({ request, eligible, completion }: Standing) {
  const {
    tone,
    icon: Icon,
    detail,
  } = completionStates[request ?? (eligible ? "eligible" : "open")];
  return (
    <div
      className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${tone}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold">Course completion</p>
        <p className="mt-1 text-sm font-semibold" data-completion>
          {completion}
        </p>
        <p className="mt-1 text-xs leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}
/** Attendance and syllabus progress, kept as two separate figures, plus the completion state. */
function Progress({ data }: { data: ClassProgress }) {
  const standing = classStanding(data);
  const { attendance, syllabus } = standing;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Meter
          label="Attendance progress"
          percent={attendance.percent}
          detail={`Present for ${attendance.present} of ${attendance.scheduled} scheduled classes.`}
        />
        <Meter
          label="Syllabus progress"
          percent={syllabus.percent}
          detail={`${syllabus.covered} of ${syllabus.total} syllabus subtopics covered in class.`}
        />
      </div>
      <Completion {...standing} />
    </>
  );
}

export function ClassProgressCard({
  api,
  session,
  navigate,
}: {
  api: StudentApi;
  session: StudentSession;
  navigate: (tab: PanelTab) => void;
}) {
  const query = useClassProgress(api, session);
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">Attendance & syllabus</h2>
        {query.data && (
          <p className="text-xs font-semibold text-slate-600">
            Batch {query.data.batch.code}
          </p>
        )}
      </div>
      {query.isPending ? (
        <p role="status" className="text-sm text-slate-600">
          Loading your class progress…
        </p>
      ) : query.isError ? (
        <div className="space-y-3">
          <Notice error>{friendlyError(query.error)}</Notice>
          <Button secondary onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data ? (
        <>
          <Progress data={query.data} />
          <Button
            secondary
            className="mt-5"
            onClick={() => navigate("schedule")}
          >
            View class sessions
          </Button>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">{notAllocated}</p>
      )}
    </Card>
  );
}

function DayItem({
  day,
  today,
  batch,
}: {
  day: ClassDay;
  today: string;
  batch: Batch;
}) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {formatDate(day.date, "long")}
        </h3>
        {day.date === today && <Tag>Today</Tag>}
        {!day.scheduled && <Tag>Extra class</Tag>}
      </div>
      {day.sessions.length === 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="flex items-center gap-1.5 text-xs text-slate-600">
            <Clock3 size={13} className="shrink-0" aria-hidden="true" />
            Scheduled {formatTime(batch.startTime)} to {formatTime(batch.endTime)}
          </p>
          {day.status !== "upcoming" && <Chip kind="not-submitted" />}
        </div>
      ) : (
        day.sessions.map((item) => (
          <div key={item.id} className="mt-2">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock3 size={13} className="shrink-0" aria-hidden="true" />
                {formatTime(item.startTime)} to {formatTime(item.endTime)}
              </p>
              <Chip kind={item.attendance ?? "unmarked"} />
            </div>
            {item.topics.length ? (
              <ul aria-label="Topics covered" className="mt-2 space-y-1">
                {item.topics.map((topic) => (
                  <li key={topic.id} className="text-sm leading-relaxed">
                    <span className="font-semibold">{topic.title}:</span>{" "}
                    {topic.subtopics.join(", ")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No syllabus topics recorded.
              </p>
            )}
          </div>
        ))
      )}
    </li>
  );
}
function ClassRecord({ data }: { data: ClassProgress }) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const { batch, course, today } = data;
  const days = classTimeline(data);
  // Classes so far read newest first; the rest of the schedule reads in order.
  const past = days.filter((day) => day.date <= today).reverse();
  const upcoming = days.filter((day) => day.date > today);
  const visible = showAll ? past : past.slice(0, RECENT_CLASSES);
  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Your batch</h2>
        <dl className="mb-6 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-600">Batch</dt>
            <dd className="font-semibold">{batch.code}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Course</dt>
            <dd className="font-semibold">
              {course.name} · {course.durationWeeks} weeks
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Schedule</dt>
            <dd className="font-semibold">
              {scheduleNames[batch.scheduleType]} ·{" "}
              {batch.classDays.map((day) => weekdayNames[day]).join(", ")} ·{" "}
              {formatTime(batch.startTime)} to {formatTime(batch.endTime)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Dates</dt>
            <dd className="font-semibold">
              {batchDate(batch.startDate)} to {batchDate(batch.expectedEndDate)}
            </dd>
          </div>
        </dl>
        <Progress data={data} />
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Class sessions</h2>
        <p className="mt-2 mb-5 text-sm leading-relaxed text-slate-600">
          Every class scheduled for your batch, newest first. A class shows
          “Attendance not submitted” until your trainer submits it; it is not
          counted as an absence.
        </p>
        {past.length ? (
          <ol
            id={listId}
            aria-label="Classes so far"
            className="divide-y divide-slate-200"
          >
            {visible.map((day) => (
              <DayItem key={day.date} day={day} today={today} batch={batch} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">
            {upcoming.length
              ? `Your first class is on ${formatDate(upcoming[0].date, "long")}.`
              : "No classes are scheduled for your batch yet."}
          </p>
        )}
        {past.length > RECENT_CLASSES && (
          <Button
            secondary
            className="mt-5"
            aria-expanded={showAll}
            aria-controls={listId}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll
              ? "Show recent classes only"
              : `Show all ${past.length} classes so far`}
          </Button>
        )}
        {upcoming.length > 0 && (
          <details className="group mt-5 border-t border-slate-200 pt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-indigo-700 [&::-webkit-details-marker]:hidden">
              <CalendarClock size={16} aria-hidden="true" />
              Upcoming classes ({upcoming.length})
              <ChevronDown
                size={16}
                className="transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <ol
              aria-label="Upcoming classes"
              className="mt-3 divide-y divide-slate-200"
            >
              {upcoming.map((day) => (
                <DayItem key={day.date} day={day} today={today} batch={batch} />
              ))}
            </ol>
          </details>
        )}
      </Card>
    </>
  );
}
export function ClassSessions({
  api,
  session,
}: {
  api: StudentApi;
  session: StudentSession;
}) {
  const query = useClassProgress(api, session);
  return (
    <QueryView query={query}>
      {(data) =>
        data ? (
          <ClassRecord data={data} />
        ) : (
          <Empty title="Your class sessions are coming soon">
            {notAllocated}
          </Empty>
        )
      }
    </QueryView>
  );
}
