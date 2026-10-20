import { useState } from "react";
import type {
  Mentorship,
  MentorshipSlot,
  StudentApi,
  StudentSession,
} from "./contracts";
import { friendlyError, StudentApiError } from "./api";
import {
  useMentorship,
  useMentorshipSlots,
  useRequestKey,
  useStudentActions,
} from "./hooks";
import { sendStudentNotification } from "../../utils/studentNotification";
import {
  Button,
  Card,
  Empty,
  Field,
  inputClass,
  Notice,
  QueryView,
  SecureLink,
} from "./ui";
import { dateTime, dayKey, timeLabel } from "./utils";

function MentorshipContent({
  data,
  api,
  session,
}: {
  data: Mentorship;
  api: StudentApi;
  session: StudentSession;
}) {
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [day, setDay] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [uncertainSlot, setUncertainSlot] = useState<MentorshipSlot | null>(
    null,
  );
  const remaining =
    data.entitlement.total - data.entitlement.used - data.entitlement.reserved;
  const slots = useMentorshipSlots(api, session, timeZone, remaining > 0);
  const { bookMentorship } = useStudentActions(api, session);
  const requestKey = useRequestKey();
  const locked = bookMentorship.isPending || !!uncertainSlot;
  const available = (slots.data || []).filter(
    (item) => Date.parse(item.startsAt) > Date.now(),
  );
  const days = [
    ...new Set(available.map((item) => dayKey(item.startsAt, timeZone))),
  ].sort();
  const chosenDay = day && days.includes(day) ? day : days[0];
  const selected = available.find(
    (item) =>
      item.id === selectedId && dayKey(item.startsAt, timeZone) === chosenDay,
  );
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Time with your mentor</h2>
            <p className="mt-2 text-sm text-slate-600">
              Focused support for the problems you’re working through.
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 px-5 py-3 text-center">
            <p className="text-3xl font-bold text-indigo-800">{remaining}</p>
            <p className="mt-1 text-xs font-semibold text-indigo-800">
              sessions available
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {data.entitlement.used} used · {data.entitlement.reserved} reserved ·{" "}
          {data.entitlement.total} included
        </p>
      </Card>
      {confirmed && (
        <Notice>
          Your mentorship session is confirmed. Your remaining entitlement has
          been updated.
        </Notice>
      )}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Book a mentorship session
        </h2>
        {remaining <= 0 && !uncertainSlot ? (
          <Notice>
            You’ve used or reserved all included sessions. Your booked sessions
            are listed below; contact support if you need more time.
          </Notice>
        ) : (
          <div className="space-y-4">
            <Field name="time-zone" label="Time zone">
              <select
                id="student-time-zone"
                className={`${inputClass} max-w-sm`}
                value={timeZone}
                disabled={locked}
                onChange={(event) => {
                  setTimeZone(event.target.value);
                  setDay(null);
                  setSelectedId(null);
                }}
              >
                {[
                  "Asia/Kolkata",
                  "Asia/Dubai",
                  "Europe/London",
                  "America/New_York",
                  "America/Los_Angeles",
                  "Australia/Sydney",
                ].map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <QueryView query={slots}>
              {() =>
                days.length ? (
                  <>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Available mentorship dates"
                    >
                      {days.map((date) => (
                        <button
                          key={date}
                          disabled={locked}
                          aria-pressed={chosenDay === date}
                          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${chosenDay === date ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-700"}`}
                          onClick={() => {
                            setDay(date);
                            setSelectedId(null);
                          }}
                        >
                          {date}
                        </button>
                      ))}
                    </div>
                    <div
                      className="grid gap-3 sm:grid-cols-2"
                      role="group"
                      aria-label="Available mentorship times"
                    >
                      {available
                        .filter(
                          (item) =>
                            dayKey(item.startsAt, timeZone) === chosenDay,
                        )
                        .map((slot) => (
                          <button
                            key={slot.id}
                            disabled={locked}
                            aria-pressed={selected?.id === slot.id}
                            className={`rounded-xl border p-4 text-left ${selected?.id === slot.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                            onClick={() => {
                              setSelectedId(slot.id);
                              setConfirmed(false);
                            }}
                          >
                            <span className="block text-sm font-semibold">
                              {timeLabel(slot.startsAt, timeZone)} –{" "}
                              {timeLabel(slot.endsAt, timeZone)}
                            </span>
                            <span className="mt-1 block text-xs text-slate-600">
                              {slot.mentor}
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                ) : (
                  <Empty title="No available sessions">
                    New mentor slots will appear here when they’re released.
                    Check again later or contact support.
                  </Empty>
                )
              }
            </QueryView>
            {bookMentorship.isError && (
              <Notice error>
                {friendlyError(bookMentorship.error)}
                {uncertainSlot &&
                  " The booking result is uncertain. Retry the same slot to recover your reservation."}
              </Notice>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!selected && !uncertainSlot}
                busy={bookMentorship.isPending}
                onClick={async () => {
                  const target = uncertainSlot || selected;
                  if (
                    !target ||
                    (!uncertainSlot &&
                      Date.parse(target.startsAt) <= Date.now())
                  ) {
                    setSelectedId(null);
                    void slots.refetch();
                    return;
                  }
                  setUncertainSlot(target);
                  try {
                    await bookMentorship.mutateAsync({
                      slotId: target.id,
                      requestId: requestKey.forPayload(target.id),
                    });
                    requestKey.reset();
                    void sendStudentNotification({
                      type: "consultation",
                      studentName: session.name,
                      studentEmail: session.email,
                      topics: `Mentorship Session with ${target.mentor}`,
                      preferredDate: dateTime(target.startsAt),
                      message: `Booked mentorship session from ${timeLabel(target.startsAt, timeZone)} to ${timeLabel(target.endsAt, timeZone)} (Timezone: ${timeZone}).`,
                    });
                    setSelectedId(null);
                    setConfirmed(true);
                    setUncertainSlot(null);
                  } catch (error) {
                    if (
                      error instanceof StudentApiError &&
                      error.status >= 400 &&
                      error.status < 500
                    ) {
                      setUncertainSlot(null);
                      setSelectedId(null);
                      requestKey.reset();
                    }
                  }
                }}
              >
                {uncertainSlot && bookMentorship.isError
                  ? "Retry mentorship booking safely"
                  : "Confirm mentorship booking"}
              </Button>
              <Button
                secondary
                disabled={locked}
                onClick={() => {
                  setSelectedId(null);
                  void slots.refetch();
                }}
              >
                Refresh available slots
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              The slot and entitlement are confirmed together when your booking
              is accepted.
            </p>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Your mentorship sessions</h2>
        {!data.bookings.length && (
          <p className="text-sm text-slate-600">
            Your booked mentorship sessions will appear here.
          </p>
        )}
        <ul className="space-y-4">
          {data.bookings.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <p className="text-sm font-semibold">{item.mentor}</p>
                <span className="text-xs font-semibold capitalize text-slate-600">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {dateTime(item.startsAt, timeZone)}
              </p>
              {item.joinUrl && item.status === "booked" && (
                <SecureLink href={item.joinUrl}>
                  Join mentorship session
                </SecureLink>
              )}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Class attendance</h2>
        {data.attendance.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px]">
              <caption className="sr-only">
                Attendance recorded by your academy for each class
              </caption>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Date</th>
                  <th scope="col">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data.attendance.map((item) => (
                  <tr key={item.classId}>
                    <th scope="row" className="font-medium">
                      {item.title}
                    </th>
                    <td>{dateTime(item.startsAt, timeZone)}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${item.status === "present" ? "bg-emerald-50 text-emerald-800" : item.status === "absent" ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700"}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Attendance will appear after your first live class.
          </p>
        )}
      </Card>
    </div>
  );
}
export function MentorshipView({
  api,
  session,
}: {
  api: StudentApi;
  session: StudentSession;
}) {
  const query = useMentorship(api, session);
  return (
    <QueryView query={query}>
      {(data) => <MentorshipContent data={data} api={api} session={session} />}
    </QueryView>
  );
}
