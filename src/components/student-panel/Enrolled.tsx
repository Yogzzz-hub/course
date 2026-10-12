import { CalendarDays, Check, Circle, Clock3 } from "lucide-react";
import type { Dashboard, StudentApi, StudentSession } from "./contracts";
import {
  useDashboard,
  usePayments,
  useRequestKey,
  useStudentActions,
} from "./hooks";
import { friendlyError } from "./api";
import {
  Button,
  Card,
  Empty,
  Eyebrow,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { dateTime, money, type PanelTab } from "./utils";

function Onboarding({
  data,
  api,
  session,
}: {
  data: Dashboard;
  api: StudentApi;
  session: StudentSession;
}) {
  const { onboarding } = useStudentActions(api, session);
  const requestKey = useRequestKey();
  const complete = data.onboarding.filter((item) => item.completed).length;
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Make yourself at home</h2>
        <span className="text-xs font-semibold text-slate-500">
          {complete}/{data.onboarding.length}
        </span>
      </div>
      {onboarding.isError && (
        <Notice error>{friendlyError(onboarding.error)}</Notice>
      )}
      <ul className="space-y-3">
        {data.onboarding.map((item) => (
          <li className="flex items-start gap-3" key={item.id}>
            {item.completed ? (
              <Check
                size={18}
                className="mt-3 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
            ) : (
              <Circle
                size={18}
                className="mt-3 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="pt-2.5 text-sm font-medium">
                {item.title}
                {item.completed && (
                  <span className="sr-only"> · Completed</span>
                )}
              </p>
              {item.url && (
                <SecureLink href={item.url}>
                  Open {item.title.toLowerCase()}
                </SecureLink>
              )}
              {!item.completed && (
                <Button
                  secondary
                  className="mt-2"
                  busy={onboarding.isPending}
                  onClick={async () => {
                    try {
                      await onboarding.mutateAsync({
                        id: item.id,
                        requestId: requestKey.forPayload(item.id),
                      });
                      requestKey.reset();
                    } catch {
                      /* Error is displayed above the list. */
                    }
                  }}
                  aria-label={`Mark ${item.title} complete`}
                >
                  Mark complete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!data.onboarding.length && (
        <p className="text-sm text-slate-600">
          You’re all set. No onboarding tasks are outstanding.
        </p>
      )}
    </Card>
  );
}
export function InstalmentAlert({
  api,
  session,
  navigate,
}: {
  api: StudentApi;
  session: StudentSession;
  navigate: (tab: PanelTab) => void;
}) {
  const query = usePayments(api, session);
  if (query.isPending)
    return (
      <p role="status" className="text-xs text-slate-500">
        Checking payment schedule…
      </p>
    );
  if (query.isError)
    return (
      <Notice error>
        We couldn’t load your payment schedule.{" "}
        <button
          className="font-semibold underline"
          onClick={() => navigate("payments")}
        >
          Open Payments to retry.
        </button>
      </Notice>
    );
  const next = [...query.data.instalments]
    .filter((item) => item.status === "due")
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))[0];
  if (!next) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm leading-relaxed text-amber-950">
        <span className="font-semibold">
          {Date.parse(next.dueAt) < Date.now()
            ? "Instalment overdue"
            : "Upcoming instalment"}{" "}
          · {money(next.amountMinor, query.data.currency)}
        </span>
        <br />
        {next.label} · Due {dateTime(next.dueAt)}
      </p>
      <Button secondary onClick={() => navigate("payments")}>
        View payments
      </Button>
    </div>
  );
}
export function EnrolledHome({
  api,
  session,
  navigate,
}: {
  api: StudentApi;
  session: StudentSession;
  navigate: (tab: PanelTab) => void;
}) {
  const query = useDashboard(api, session);
  return (
    <div className="space-y-5">
      <InstalmentAlert api={api} session={session} navigate={navigate} />
      <QueryView query={query}>
        {(data) => (
          <>
            <section className="rounded-2xl bg-indigo-950 p-6 text-white sm:p-8">
              <Eyebrow>
                <span className="text-indigo-200">Keep your momentum</span>
              </Eyebrow>
              <h2 className="text-2xl font-semibold">
                {data.nextClass?.title || "Your next class is being planned."}
              </h2>
              {data.nextClass ? (
                <>
                  <p className="mt-3 flex items-center gap-2 text-sm text-indigo-100">
                    <CalendarDays size={16} aria-hidden="true" />
                    {dateTime(data.nextClass.startsAt)}
                  </p>
                  {data.nextClass.joinUrl ? (
                    <SecureLink
                      href={data.nextClass.joinUrl}
                      className="mt-5 rounded-xl bg-white px-4 text-indigo-950"
                    >
                      Join live class
                    </SecureLink>
                  ) : (
                    <p className="mt-4 text-sm text-indigo-100">
                      Your class link will appear here when it’s ready.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-indigo-100">
                  Check Schedule for your upcoming classes.
                </p>
              )}
            </section>
            <div className="grid items-start gap-5 xl:grid-cols-2">
              <Card>
                <h2 className="mb-4 text-lg font-semibold">
                  This week’s deadlines
                </h2>
                <ul className="space-y-4">
                  {data.deadlines
                    .filter(
                      (item) =>
                        Date.parse(item.dueAt) <= Date.now() + 7 * 86400000,
                    )
                    .map((item) => (
                      <li key={item.id} className="flex gap-3">
                        <Clock3
                          size={18}
                          className="mt-0.5 shrink-0 text-indigo-700"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p
                            className={`mt-1 text-xs ${Date.parse(item.dueAt) < Date.now() ? "text-red-700" : "text-slate-600"}`}
                          >
                            {Date.parse(item.dueAt) < Date.now() &&
                              "Overdue · "}
                            {dateTime(item.dueAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
                {!data.deadlines.some(
                  (item) => Date.parse(item.dueAt) <= Date.now() + 7 * 86400000,
                ) && (
                  <p className="text-sm text-slate-600">
                    No outstanding deadlines this week. Keep building.
                  </p>
                )}
                <Button
                  secondary
                  className="mt-5"
                  onClick={() => navigate("work")}
                >
                  Open assignments
                </Button>
              </Card>
              <Onboarding data={data} api={api} session={session} />
            </div>
            <Card>
              <h2 className="mb-5 text-lg font-semibold">
                Your learning progress
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {data.modules.map((item) => (
                  <div key={item.id}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <label
                        htmlFor={`module-${item.id}`}
                        className="font-semibold"
                      >
                        {item.title}
                      </label>
                      <span className="shrink-0 text-slate-600">
                        {item.completed}/{item.total}
                      </span>
                    </div>
                    <progress
                      id={`module-${item.id}`}
                      max={Math.max(item.total, 1)}
                      value={item.completed}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      {item.total
                        ? `${Math.round((item.completed / item.total) * 100)}% complete`
                        : "Content coming soon"}
                    </p>
                  </div>
                ))}
              </div>
              {!data.modules.length && (
                <p className="text-sm text-slate-600">
                  Your module progress will appear once your curriculum is
                  released.
                </p>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </div>
  );
}
export function ClassSchedule({
  api,
  session,
}: {
  api: StudentApi;
  session: StudentSession;
}) {
  const query = useDashboard(api, session);
  return (
    <QueryView query={query}>
      {(data) =>
        data.classes.length ? (
          <div className="space-y-4">
            {[...data.classes]
              .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
              .map((item) => (
                <Card key={item.id}>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="my-3 text-sm text-slate-600">
                    {dateTime(item.startsAt)}
                  </p>
                  {item.joinUrl ? (
                    <SecureLink href={item.joinUrl}>Open class link</SecureLink>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Class link will be shared here.
                    </p>
                  )}
                </Card>
              ))}
          </div>
        ) : (
          <Empty title="Your schedule is coming soon">
            Upcoming live classes will appear here as your cohort schedule is
            published.
          </Empty>
        )
      }
    </QueryView>
  );
}
