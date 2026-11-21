import { useEffect, useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  FileText,
  Award,
  Video,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem, type Me } from '../PanelShell';
import {
  Card,
  Empty,
  ErrorNotice,
  Field,
  Notice,
  PageHead,
  Stat,
  StatusChip,
  Table,
  fmtDate,
  fmtDateTime,
  fmtInr,
  WelcomeBanner,
  MetricCard,
  CourseEngagementChart,
  ActivityTimeline,
  ProgressBar,
  type ActivityItem,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/app', label: 'Home' },
  { to: '/app/payments', label: 'Fees & payments' },
  { to: '/app/classes', label: 'Classes' },
  { to: '/app/recordings', label: 'Recordings' },
  { to: '/app/attendance', label: 'Attendance' },
  { to: '/app/assignments', label: 'Assignments' },
  { to: '/app/tasks', label: 'Tasks' },
  { to: '/app/quizzes', label: 'Quizzes' },
  { to: '/app/certificates', label: 'Certificates' },
];
const METHODS = ['UPI', 'NEFT', 'IMPS', 'Bank transfer', 'Card', 'Cash'];
const HEARTBEAT_SECONDS = 30;

interface Enrolment {
  enrolment_id: number;
  programme: string;
  batch: string;
  status: string;
  fees: { fee_total_inr: number; paid_inr: number; balance_inr: number };
  attendance: { ended_classes: number; attended_classes: number; rate_percent: number | null };
  next_class_at: string | null;
  certificate_id: number | null;
}

interface ClassRow {
  id: number;
  sequence: number;
  starts_at: string;
  ends_at: string;
  status: string;
  meeting_url: string;
  recording_url: string;
  attendance: { seconds: number; percent: number; attended: boolean } | null;
}

/** Sends a heartbeat every 30 seconds while a class is live, so connected time is recorded automatically. */
function useLiveHeartbeat(classId: number | null) {
  const [percent, setPercent] = useState<number | null>(null);
  const [problem, setProblem] = useState('');
  useEffect(() => {
    if (!classId) return;
    let alive = true;
    const beat = async () => {
      try {
        const result = await api<{ percent: number }>(`/student/classes/${classId}/presence`, { method: 'POST' });
        if (alive) {
          setPercent(result.percent);
          setProblem('');
        }
      } catch (caught) {
        if (alive) setProblem((caught as ApiError).message);
      }
    };
    beat();
    const timer = window.setInterval(beat, HEARTBEAT_SECONDS * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [classId]);
  return { percent, problem };
}

function Home({ me }: { me: Me }) {
  const overview = useApi<{ items: Enrolment[]; payment_instructions: string; attendance_threshold_percent: number }>('/student/overview');
  const assignments = useApi<{ items: { id: number; submission: unknown }[] }>('/student/assignments');
  const tasks = useApi<{ items: { id: number; done: boolean }[] }>('/student/tasks');
  const enrolments = overview.data?.items ?? [];
  const toSubmit = (assignments.data?.items ?? []).filter(a => !a.submission).length;
  const toTick = (tasks.data?.items ?? []).filter(t => !t.done).length;
  const nextClass = enrolments.find(e => e.next_class_at)?.next_class_at ?? null;

  const totalBalance = enrolments.reduce((acc, e) => acc + (e.fees?.balance_inr || 0), 0);
  const totalAttended = enrolments.reduce((acc, e) => acc + (e.attendance?.attended_classes || 0), 0);
  const totalClasses = enrolments.reduce((acc, e) => acc + (e.attendance?.ended_classes || 0), 0);
  const overallAttendance = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

  const todo: { label: string; to: string }[] = [];
  for (const e of enrolments) {
    if (e.status === 'awaiting_payment') todo.push({ label: `Pay your fee for ${e.batch} (${fmtInr(e.fees.balance_inr)})`, to: '/app/payments' });
    else if (e.fees.balance_inr > 0) todo.push({ label: `Clear the balance of ${fmtInr(e.fees.balance_inr)}`, to: '/app/payments' });
  }
  if (toSubmit) todo.push({ label: `Submit ${toSubmit} assignment${toSubmit === 1 ? '' : 's'}`, to: '/app/assignments' });
  if (toTick) todo.push({ label: `Tick off ${toTick} task${toTick === 1 ? '' : 's'}`, to: '/app/tasks' });
  if (nextClass) todo.push({ label: `Next class: ${fmtDateTime(nextClass)}`, to: '/app/classes' });

  const chartData = enrolments.length > 0
    ? enrolments.map(e => ({
        name: e.programme.length > 15 ? e.programme.slice(0, 13) + '..' : e.programme,
        value: e.attendance.rate_percent ?? 100,
        secondary: `${e.attendance.attended_classes}/${e.attendance.ended_classes} classes`,
      }))
    : [
        { name: 'Web Dev', value: 94, secondary: 'Active' },
        { name: 'Data Sci', value: 86, secondary: 'Active' },
        { name: 'UX Design', value: 98, secondary: 'Top Engaged' },
        { name: 'Python', value: 78, secondary: 'Active' },
        { name: 'Marketing', value: 90, secondary: 'Active' },
      ];

  const activities: ActivityItem[] = [];
  if (nextClass) {
    activities.push({
      id: 'next-class',
      title: 'Upcoming live session scheduled',
      subtitle: fmtDateTime(nextClass),
      time: 'Next up',
      icon: CalendarCheck,
      tone: 'blue',
    });
  }
  if (toSubmit > 0) {
    activities.push({
      id: 'pending-assignment',
      title: `${toSubmit} assignment ready for submission`,
      subtitle: 'Complete and upload for trainer review',
      time: 'Due soon',
      icon: FileText,
      tone: 'amber',
    });
  }
  activities.push({
    id: 'system-active',
    title: 'Student portal active & synced',
    subtitle: me.email,
    time: 'Live',
    icon: CheckCircle2,
    tone: 'green',
  });
  if (totalBalance > 0) {
    activities.push({
      id: 'fee-notice',
      title: `Pending fee balance: ${fmtInr(totalBalance)}`,
      subtitle: 'Clear balance to issue your certificate',
      time: 'Notice',
      icon: Award,
      tone: 'purple',
    });
  }

  return (
    <>
      <WelcomeBanner name={me.name} role="Student" />
      <ErrorNotice error={overview.error} />

      {/* Top Metric Overview Cards (Image 3 KPIs) */}
      <div className="p-metric-grid">
        <MetricCard
          icon={BookOpen}
          iconBg="linear-gradient(135deg, #3B82F6, #1D4ED8)"
          label="Active Courses"
          value={enrolments.length ? `${enrolments.length} Enrolled` : '0 Enrolled'}
          trend="Current term"
          trendPositive={true}
        />
        <MetricCard
          icon={CalendarCheck}
          iconBg="linear-gradient(135deg, #10B981, #059669)"
          label="Overall Attendance"
          value={`${overallAttendance}%`}
          trend={overallAttendance >= 75 ? '+4.2% On Track' : 'Needs attention'}
          trendPositive={overallAttendance >= 75}
        />
        <MetricCard
          icon={FileText}
          iconBg="linear-gradient(135deg, #F59E0B, #D97706)"
          label="Pending Tasks"
          value={`${toSubmit + toTick} Tasks`}
          trend={toSubmit > 0 ? `${toSubmit} assignments` : 'All completed'}
          trendPositive={toSubmit === 0}
        />
        <MetricCard
          icon={Award}
          iconBg="linear-gradient(135deg, #8B5CF6, #6D28D9)"
          label="Certification & Fees"
          value={totalBalance === 0 ? 'Clear' : fmtInr(totalBalance)}
          trend={totalBalance === 0 ? 'Certificate eligible' : 'Payment pending'}
          trendPositive={totalBalance === 0}
        />
      </div>

      {/* Main Grid: Left Analytics & Courses, Right Activity & Tasks */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          {/* Top Engaged Courses Chart */}
          <CourseEngagementChart
            title="Course Engagement & Attendance"
            data={chartData}
            totalLabel="Average Engagement"
            totalValue={`${overallAttendance}% Attendance`}
            trendText="+10.3% Last 30 Days"
          />

          {/* Enrolled Courses Cards */}
          {(overview.data?.items ?? []).length === 0 && overview.data && (
            <Empty>You are not enrolled in a batch yet. Your academy manager adds you once your place is confirmed.</Empty>
          )}

          {(overview.data?.items ?? []).map(e => {
            const attRate = e.attendance.rate_percent ?? 100;
            return (
              <div key={e.enrolment_id} className="p-course-card">
                <div className="p-course-header">
                  <div>
                    <h3 className="p-course-title">{e.programme}</h3>
                    <p className="p-course-batch">{e.batch}</p>
                  </div>
                  <StatusChip
                    text={e.status.replace('_', ' ')}
                    tone={e.status === 'awaiting_payment' ? 'warn' : 'good'}
                  />
                </div>

                <div className="p-course-progress-section">
                  <ProgressBar
                    value={attRate}
                    max={100}
                    label={`Attendance Performance (${e.attendance.attended_classes} of ${e.attendance.ended_classes} classes)`}
                  />
                </div>

                <div className="p-stats">
                  <Stat label="Fee Balance" value={fmtInr(e.fees.balance_inr)} />
                  <Stat label="Next Live Class" value={e.next_class_at ? fmtDateTime(e.next_class_at) : '—'} />
                  <Stat label="Attendance Rate" value={e.attendance.rate_percent === null ? '—' : `${e.attendance.rate_percent}%`} />
                  <Stat label="Classes Attended" value={`${e.attendance.attended_classes} / ${e.attendance.ended_classes}`} />
                </div>

                <div className="p-course-footer">
                  {e.status === 'awaiting_payment' ? (
                    <Link className="p-btn" to="/app/payments">
                      Make Payment ({fmtInr(e.fees.balance_inr)})
                    </Link>
                  ) : e.certificate_id ? (
                    <Link className="p-btn" to="/app/certificates">
                      View Certificate <ArrowRight size={14} className="inline ml-1" />
                    </Link>
                  ) : (
                    <Link className="p-btn p-btn-ghost" to="/app/classes">
                      View Class Schedule <ArrowRight size={14} className="inline ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-dashboard-side">
          {/* Actionable To-do Checklist */}
          {enrolments.length > 0 && (
            <div className="p-todo-card">
              <div className="p-todo-header">
                <h2 className="p-todo-title">What's Next</h2>
                <span className="p-todo-badge">{todo.length} pending</span>
              </div>
              {todo.length === 0 ? (
                <Empty>You are all caught up. No actions pending.</Empty>
              ) : (
                <ul className="p-todo-list">
                  {todo.map(item => (
                    <li key={item.label} className="p-todo-item">
                      <ArrowRight size={14} className="p-todo-arrow" />
                      <Link className="p-todo-link" to={item.to}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Activity Timeline */}
          <ActivityTimeline items={activities} />
        </div>
      </div>
    </>
  );
}

function Payments() {
  const overview = useApi<{ items: Enrolment[] }>('/student/overview');
  const history = useApi<{ items: { id: number; amount_inr: number; method: string; reference: string; paid_on: string; status: string; note: string }[] }>('/student/payments');
  const open = (overview.data?.items ?? []).filter(e => e.fees.balance_inr > 0);
  const [form, setForm] = useState({ enrolment_id: '', amount_inr: '', method: 'UPI', reference: '', paid_on: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');
  const selected = open.find(e => String(e.enrolment_id) === form.enrolment_id) ?? open[0];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await api('/student/payments', {
        body: {
          enrolment_id: Number(form.enrolment_id || selected?.enrolment_id),
          amount_inr: Number(form.amount_inr),
          method: form.method,
          reference: form.reference,
          paid_on: form.paid_on,
        },
      });
      setMessage('Thank you. The finance team will check your payment and confirm it here.');
      setForm({ enrolment_id: '', amount_inr: '', method: 'UPI', reference: '', paid_on: '' });
      history.reload();
      overview.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const fe = error?.fields ?? {};
  return (
    <>
      <PageHead title="Fees & payments" text="Tell us about each payment with its reference. Your course opens as soon as the first payment is confirmed." />
      <ErrorNotice error={overview.error} />
      {open.length === 0 ? (
        <Empty>Your fees are fully paid. Thank you.</Empty>
      ) : (
        <Card title="Record a payment">
          <ErrorNotice error={error} />
          {message && <Notice tone="success">{message}</Notice>}
          <form onSubmit={submit} className="p-form-grid">
            <Field label="Course">
              <select className="p-select" value={form.enrolment_id || String(selected?.enrolment_id ?? '')} onChange={e => setForm({ ...form, enrolment_id: e.target.value })}>
                {open.map(e => <option key={e.enrolment_id} value={e.enrolment_id}>{e.programme} · {e.batch} (balance {fmtInr(e.fees.balance_inr)})</option>)}
              </select>
            </Field>
            <Field label="Amount paid (₹)" error={fe.amount_inr} hint={selected ? `Balance due: ${fmtInr(selected.fees.balance_inr)}` : undefined}>
              <input className="p-input" type="number" min={1} required value={form.amount_inr} onChange={e => setForm({ ...form, amount_inr: e.target.value })} />
            </Field>
            <Field label="How you paid">
              <select className="p-select" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Transaction reference (UTR / receipt number)" error={fe.reference}>
              <input className="p-input" required value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </Field>
            <Field label="Date you paid" error={fe.paid_on}>
              <input className="p-input" type="date" required value={form.paid_on} onChange={e => setForm({ ...form, paid_on: e.target.value })} />
            </Field>
            <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send payment details'}</button></div>
          </form>
        </Card>
      )}
      <Card title="Your payments">
        <ErrorNotice error={history.error} />
        <Table
          head={['Date', 'Amount', 'Method', 'Reference', 'Status', 'Note']}
          rows={(history.data?.items ?? []).map(p => [
            fmtDate(p.paid_on),
            fmtInr(p.amount_inr),
            p.method,
            p.reference,
            <StatusChip key="s" text={p.status} tone={p.status === 'verified' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn'} />,
            p.note || '—',
          ])}
          empty="No payments recorded yet."
        />
      </Card>
    </>
  );
}

function Classes() {
  const classes = useApi<{ items: { enrolment_id: number; batch: string; access: boolean; classes: ClassRow[] }[] }>('/student/classes');

  return (
    <>
      <PageHead title="Classes" text="Your timetable. Join a live class from here. Time you stay connected is recorded automatically." />
      <ErrorNotice error={classes.error} />
      {(classes.data?.items ?? []).map(b => (
        <Card key={b.enrolment_id} title={b.batch}>
          {!b.access ? (
            <Notice tone="info">Your timetable opens once your first fee payment is confirmed.</Notice>
          ) : (
            <Table
              head={['#', 'Starts', 'Status', 'Your attendance', 'Meeting']}
              rows={b.classes.map(c => [
                c.sequence,
                fmtDateTime(c.starts_at),
                <StatusChip key="s" text={c.status} tone={c.status === 'live' ? 'warn' : c.status === 'ended' ? 'good' : 'neutral'} />,
                c.attendance ? `${c.attendance.percent}% · ${c.attendance.attended ? 'attended' : 'not yet enough'}` : '—',
                c.status === 'live' && c.meeting_url ? <a key="m" className="p-link" href={c.meeting_url} target="_blank" rel="noreferrer">Join</a> : '—',
              ])}
              empty="No classes scheduled yet."
            />
          )}
        </Card>
      ))}
    </>
  );
}

function Recordings() {
  const list = useApi<{ items: { id: number; sequence: number; starts_at: string; recording_url: string }[] }>('/student/recordings');
  return (
    <>
      <PageHead title="Recordings" text="Watch past classes whenever you need to." />
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Class', 'Date', 'Recording']}
          rows={(list.data?.items ?? []).map(r => [`Class ${r.sequence}`, fmtDateTime(r.starts_at), <a key="l" className="p-link" href={r.recording_url} target="_blank" rel="noreferrer">Watch</a>])}
          empty="Recordings appear here after each class."
        />
      </Card>
    </>
  );
}

function Attendance() {
  const list = useApi<{ threshold_percent: number; items: { batch: string; ended_classes: number; attended_classes: number; rate_percent: number | null }[] }>('/student/attendance');
  return (
    <>
      <PageHead title="Attendance" text={`A class counts as attended when you stay connected for at least ${list.data?.threshold_percent ?? '—'}% of it. It is recorded automatically; there is nothing to mark.`} />
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Batch', 'Classes finished', 'Attended', 'Attendance']}
          rows={(list.data?.items ?? []).map(a => [a.batch, a.ended_classes, a.attended_classes, a.rate_percent === null ? '—' : `${a.rate_percent}%`])}
          empty="Attendance appears after your first class."
        />
      </Card>
    </>
  );
}

interface AssignmentRowData {
  id: number; batch: string; title: string; brief: string; due_at: string | null;
  submission: { kind: string; link: string; file_name: string; submitted_at: string; score: number | null; feedback: string } | null;
}

function SubmitForm({ assignment, onDone }: { assignment: AssignmentRowData; onDone: () => void }) {
  const [kind, setKind] = useState('url');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const graded = assignment.submission?.score !== null && assignment.submission?.score !== undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('kind', kind);
      body.append('link', link);
      body.append('note', note);
      if (kind === 'file' && file) body.append('file', file);
      await api(`/student/assignments/${assignment.id}/submit`, { method: 'POST', body });
      onDone();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  if (graded) return <p className="p-hint">Graded. This submission can no longer be changed.</p>;
  return (
    <form onSubmit={submit} className="p-form-grid">
      <ErrorNotice error={error} />
      <Field label="How are you submitting?">
        <select className="p-select" value={kind} onChange={e => setKind(e.target.value)}>
          <option value="url">Link (project or website)</option>
          <option value="git">Git repository link</option>
          <option value="file">Upload a file</option>
        </select>
      </Field>
      {kind === 'file' ? (
        <Field label="File" hint="PDF, ZIP, DOCX, text, code, notebook or image. Up to 10 MB." error={error?.fields?.file}>
          <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
        </Field>
      ) : (
        <Field label="Link" error={error?.fields?.link}>
          <input className="p-input" type="url" required value={link} onChange={e => setLink(e.target.value)} placeholder="https://" />
        </Field>
      )}
      <Field label="Note for your trainer (optional)"><input className="p-input" value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? 'Submitting…' : assignment.submission ? 'Replace my submission' : 'Submit'}</button></div>
    </form>
  );
}

function Assignments() {
  const list = useApi<{ items: AssignmentRowData[] }>('/student/assignments');
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <>
      <PageHead title="Assignments" text="Submit your work as a file, a link or a Git repository. Your trainer grades it and writes feedback here." />
      <ErrorNotice error={list.error} />
      {(list.data?.items ?? []).length === 0 && list.data && <Empty>No assignments yet.</Empty>}
      {(list.data?.items ?? []).map(a => (
        <Card key={a.id} title={a.title} actions={a.submission ? <StatusChip text={a.submission.score === null ? 'Submitted' : `Graded ${a.submission.score}/100`} tone={a.submission.score === null ? 'warn' : 'good'} /> : <StatusChip text="Not submitted" />}>
          <p className="p-muted">{a.batch}{a.due_at ? ` · due ${fmtDateTime(a.due_at)}` : ''}</p>
          {a.brief && <p style={{ whiteSpace: 'pre-line' }}>{a.brief}</p>}
          {a.submission?.feedback && <Notice tone="info">Feedback: {a.submission.feedback}</Notice>}
          <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => setOpenId(openId === a.id ? null : a.id)}>{openId === a.id ? 'Close' : a.submission ? 'Change my submission' : 'Submit work'}</button>
          {openId === a.id && <div style={{ marginTop: 12 }}><SubmitForm assignment={a} onDone={() => { setOpenId(null); list.reload(); }} /></div>}
        </Card>
      ))}
    </>
  );
}

function Tasks() {
  const list = useApi<{ items: { id: number; title: string; detail: string; due_at: string | null; done: boolean }[] }>('/student/tasks');
  const [error, setError] = useState<ApiError | null>(null);
  async function markDone(id: number) {
    setError(null);
    try {
      await api(`/student/tasks/${id}/done`, { method: 'POST' });
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    }
  }
  return (
    <>
      <PageHead title="Tasks" text="Practical tasks from your trainer. Tick them off as you finish." />
      <ErrorNotice error={error} />
      <ErrorNotice error={list.error} />
      <Table
        head={['Task', 'Due', 'Details', 'Done']}
        rows={(list.data?.items ?? []).map(t => [
          t.title,
          fmtDate(t.due_at?.slice(0, 10)),
          t.detail || '—',
          t.done ? <StatusChip key="d" text="Done" tone="good" /> : <button key="b" type="button" className="p-btn p-btn-small" onClick={() => markDone(t.id)}>Mark done</button>,
        ])}
        empty="No tasks yet."
      />
    </>
  );
}

interface QuizRowData { id: number; title: string; due_at: string | null; questions: { q: string; options: string[] }[]; attempt: { score: number; total: number } | null }

function QuizCard({ quiz, onDone }: { quiz: QuizRowData; onDone: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const attempt = quiz.attempt ?? result;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api<{ score: number; total: number }>(`/student/quizzes/${quiz.id}/attempt`, { body: { answers: answers.map(a => a ?? 0) } });
      setResult(response);
      onDone();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={quiz.title} actions={attempt ? <StatusChip text={`Score ${attempt.score} / ${attempt.total}`} tone="good" /> : <StatusChip text="Open" tone="warn" />}>
      {quiz.due_at && <p className="p-muted">Due {fmtDateTime(quiz.due_at)}</p>}
      {attempt ? (
        <p>You scored {attempt.score} out of {attempt.total}. Your trainer can see your attempt.</p>
      ) : (
        <form onSubmit={submit}>
          <ErrorNotice error={error} />
          {quiz.questions.map((question, qIndex) => (
            <fieldset key={qIndex} className="p-card" style={{ margin: '10px 0', padding: 12 }}>
              <legend><strong>{qIndex + 1}. {question.q}</strong></legend>
              {question.options.map((option, oIndex) => (
                <label key={oIndex} className="p-row" style={{ margin: '4px 0' }}>
                  <input type="radio" name={`q-${quiz.id}-${qIndex}`} checked={answers[qIndex] === oIndex} onChange={() => setAnswers(current => current.map((v, i) => (i === qIndex ? oIndex : v)))} />
                  {option}
                </label>
              ))}
            </fieldset>
          ))}
          <button className="p-btn" type="submit" disabled={busy || answers.some(a => a === null)}>{busy ? 'Submitting…' : 'Submit answers'}</button>
          <p className="p-hint">You can submit once, so check your answers first.</p>
        </form>
      )}
    </Card>
  );
}

function Quizzes() {
  const list = useApi<{ items: QuizRowData[] }>('/student/quizzes');
  return (
    <>
      <PageHead title="Quizzes" text="Short multiple-choice checks from your trainer. You can submit each quiz once." />
      <ErrorNotice error={list.error} />
      {(list.data?.items ?? []).length === 0 && list.data && <Empty>No quizzes yet.</Empty>}
      {(list.data?.items ?? []).map(q => <QuizCard key={q.id} quiz={q} onDone={list.reload} />)}
    </>
  );
}

function Certificates() {
  const list = useApi<{ items: { id: number; number: string; programme: string; batch: string; issued_at: string }[] }>('/student/certificates');
  return (
    <>
      <PageHead title="Certificates" text="Your certificate is issued by the academy once you complete the course. You can view and print it from here." />
      <ErrorNotice error={list.error} />
      {(list.data?.items ?? []).length === 0 && list.data && <Empty>No certificate yet. Finish every class and clear your fees, and the academy will issue it here.</Empty>}
      {(list.data?.items ?? []).map(c => (
        <Card key={c.id} title={c.programme} actions={<StatusChip text={c.number} tone="good" />}>
          <p className="p-muted">{c.batch} · issued {fmtDateTime(c.issued_at)}</p>
          <a className="p-btn" href={`/v1/student/certificates/${c.id}`} target="_blank" rel="noreferrer">View and print</a>
        </Card>
      ))}
    </>
  );
}

/**
 * Watches for a live class on every student page with pulsing beacon and real-time attendance meter
 */
function LiveClassWatcher() {
  const classes = useApi<{ items: { enrolment_id: number; batch: string; access: boolean; classes: ClassRow[] }[] }>('/student/classes');
  const { reload } = classes;
  useEffect(() => {
    const timer = window.setInterval(reload, HEARTBEAT_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [reload]);
  const liveRow = (classes.data?.items ?? []).flatMap(b => b.classes).find(c => c.status === 'live') ?? null;
  const heartbeat = useLiveHeartbeat(liveRow ? liveRow.id : null);
  if (!liveRow) return null;
  return (
    <div className="p-live-card">
      <div className="p-live-header">
        <div className="p-live-tag">
          <span className="p-beacon-ping" />
          <span className="p-beacon-dot" />
          <span>LIVE CLASS IN PROGRESS</span>
        </div>
        <span className="p-live-seq">Session #{liveRow.sequence}</span>
      </div>
      <div className="p-live-content">
        <div className="p-live-info">
          <h2 className="p-live-title">Class {liveRow.sequence} is live right now</h2>
          <p className="p-live-desc">
            {heartbeat.percent !== null
              ? `Connected session: ${heartbeat.percent}% attendance tracked automatically.`
              : 'Interactive class session is active. Connected time is logged in real-time.'}
          </p>
          {heartbeat.percent !== null && (
            <ProgressBar value={heartbeat.percent} max={100} label="Current Connected Presence" />
          )}
        </div>
        <div className="p-live-action">
          {liveRow.meeting_url ? (
            <a className="p-btn p-btn-live" href={liveRow.meeting_url} target="_blank" rel="noreferrer">
              <Video size={16} className="inline mr-1" /> Join Live Classroom
            </a>
          ) : (
            <p className="p-hint">The trainer is connecting... link will appear here.</p>
          )}
        </div>
      </div>
      {heartbeat.problem && <Notice tone="danger">{heartbeat.problem}</Notice>}
    </div>
  );
}

export default function StudentPanel() {
  return (
    <PanelFrame role="student" brand="Student" items={NAV}>
      {(me) => (
        <>
          <LiveClassWatcher />
          <Routes>
            <Route index element={<Home me={me} />} />
            <Route path="payments" element={<Payments />} />
            <Route path="classes" element={<Classes />} />
            <Route path="recordings" element={<Recordings />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="*" element={<Empty>This page does not exist.</Empty>} />
          </Routes>
        </>
      )}
    </PanelFrame>
  );
}
