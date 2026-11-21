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
  PlayCircle,
  Eye,
  EyeOff,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  Edit3,
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
  FileUploadZone,
  type ActivityItem,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/app', label: 'Home' },
  { to: '/app/payments', label: 'Fees & payments' },
  { to: '/app/classes', label: 'Classes' },
  { to: '/app/recordings', label: 'Recordings' },
  { to: '/app/attendance', label: 'Attendance' },
  { to: '/app/assignments', label: 'Assignments' },
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
  const enrolments = overview.data?.items ?? [];
  const toSubmit = (assignments.data?.items ?? []).filter(a => !a.submission).length;
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
      subtitle: 'Clear your balance via the payments tab',
      time: 'Notice',
      icon: Award,
      tone: 'purple',
    });
  }

  return (
    <>
      <WelcomeBanner name={me.name} role="Student" />
      <ErrorNotice error={overview.error} />

      {/* Top Metric Overview Cards (Derived 100% from active Theme) */}
      <div className="p-metric-grid">
        <MetricCard
          icon={BookOpen}
          variant={1}
          label="Active Courses"
          value={enrolments.length ? `${enrolments.length} Enrolled` : '0 Enrolled'}
          trend="Current term"
          trendPositive={true}
        />
        <MetricCard
          icon={CalendarCheck}
          variant={2}
          label="Overall Attendance"
          value={`${overallAttendance}%`}
          trend={overallAttendance >= 75 ? '+4.2% On Track' : 'Needs attention'}
          trendPositive={overallAttendance >= 75}
        />
        <MetricCard
          icon={FileText}
          variant={3}
          label="Pending Assignments"
          value={`${toSubmit} Due`}
          trend={toSubmit > 0 ? `${toSubmit} submissions due` : 'All completed'}
          trendPositive={toSubmit === 0}
        />
        <MetricCard
          icon={Award}
          variant={4}
          label="Fees & Billing"
          value={totalBalance === 0 ? 'Fully Paid' : fmtInr(totalBalance)}
          trend={totalBalance === 0 ? 'All fees cleared' : 'Payment pending'}
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
                  {e.fees.balance_inr > 0 ? (
                    <Link className="p-btn" to="/app/payments">
                      Make Payment ({fmtInr(e.fees.balance_inr)})
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
  id: number;
  batch: string;
  title: string;
  brief: string;
  due_at: string | null;
  submission: {
    id?: number;
    kind: string;
    link: string;
    file_name: string;
    note?: string;
    has_file?: boolean;
    submitted_at: string;
    score: number | null;
    feedback: string;
  } | null;
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
        <Field label="Assignment File" error={error?.fields?.file}>
          <FileUploadZone
            file={file}
            onChange={setFile}
            hint="PDF, ZIP, DOCX, text, code, notebook or image. Up to 10 MB."
          />
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
  const [viewingSubId, setViewingSubId] = useState<number | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  return (
    <>
      <PageHead
        title="Assignments"
        text="Submit your work as a file, link or Git repository. View deadlines fixed by your trainer and review your submissions & grades here."
      />
      <ErrorNotice error={list.error} />
      {(list.data?.items ?? []).length === 0 && list.data && <Empty>No assignments published yet.</Empty>}
      {(list.data?.items ?? []).map(a => {
        const isOverdue = a.due_at ? new Date(a.due_at).getTime() < Date.now() : false;
        const isSubmitted = !!a.submission;
        const isGraded = a.submission?.score !== null && a.submission?.score !== undefined;

        let statusText = 'Pending Submission';
        let statusTone: 'good' | 'warn' | 'bad' = 'warn';
        if (isGraded) {
          statusText = `Graded ${a.submission?.score}/100`;
          statusTone = 'good';
        } else if (isSubmitted) {
          statusText = 'Submitted';
          statusTone = 'good';
        } else if (isOverdue) {
          statusText = 'Past Deadline';
          statusTone = 'bad';
        }

        return (
          <div key={a.id} className="p-card p-assignment-card">
            <div className="p-assignment-header">
              <div className="p-assignment-title-group">
                <div className="p-assignment-meta-row">
                  <span className="p-assignment-batch-badge">{a.batch}</span>
                  {a.due_at ? (
                    <span className={`p-assignment-deadline-badge ${isOverdue && !isSubmitted ? 'p-assignment-deadline-badge--overdue' : ''}`}>
                      <Clock size={12} className="inline mr-1" />
                      Deadline: {fmtDateTime(a.due_at)}
                      {isOverdue && !isSubmitted && ' (Overdue)'}
                    </span>
                  ) : (
                    <span className="p-assignment-deadline-badge">
                      <Clock size={12} className="inline mr-1" />
                      No deadline set
                    </span>
                  )}
                </div>
                <h3 className="p-assignment-title">{a.title}</h3>
              </div>
              <StatusChip text={statusText} tone={statusTone} />
            </div>

            {a.brief && <p className="p-assignment-brief">{a.brief}</p>}

            {/* Trainer Feedback when graded */}
            {a.submission?.feedback && (
              <div className="p-assignment-feedback-box">
                <div className="p-assignment-feedback-head">
                  <Award size={16} className="inline text-accent" />
                  <strong>Trainer Feedback & Grade ({a.submission.score}/100)</strong>
                </div>
                <p className="p-assignment-feedback-body">{a.submission.feedback}</p>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="p-assignment-actions-bar">
              {isSubmitted && (
                <button
                  type="button"
                  className="p-btn p-btn-ghost p-btn-small"
                  onClick={() => setViewingSubId(viewingSubId === a.id ? null : a.id)}
                >
                  {viewingSubId === a.id ? (
                    <>
                      <EyeOff size={14} className="inline mr-1" /> Hide Submission
                    </>
                  ) : (
                    <>
                      <Eye size={14} className="inline mr-1" /> View Submission
                    </>
                  )}
                </button>
              )}

              {!isGraded && (
                <button
                  type="button"
                  className={`p-btn p-btn-small ${isSubmitted ? 'p-btn-ghost' : ''}`}
                  onClick={() => setSubmittingId(submittingId === a.id ? null : a.id)}
                >
                  {submittingId === a.id ? (
                    'Cancel'
                  ) : isSubmitted ? (
                    <>
                      <Edit3 size={14} className="inline mr-1" /> Change My Submission
                    </>
                  ) : (
                    'Submit Work'
                  )}
                </button>
              )}

              {isGraded && (
                <span className="p-assignment-final-hint">
                  ✓ Graded by trainer. Submission is finalized.
                </span>
              )}
            </div>

            {/* View Submission Details Box */}
            {viewingSubId === a.id && a.submission && (
              <div className="p-submission-details-pane">
                <div className="p-submission-details-head">
                  <span className="p-submission-details-title">Your Submitted Work</span>
                  <span className="p-submission-time">
                    Submitted on {fmtDateTime(a.submission.submitted_at)}
                  </span>
                </div>

                <div className="p-submission-content-row">
                  {a.submission.kind === 'file' ? (
                    <div className="p-submission-file-card">
                      <FileText size={22} className="p-submission-file-icon" />
                      <div className="p-submission-file-info">
                        <span className="p-submission-file-name">
                          {a.submission.file_name || 'Uploaded File'}
                        </span>
                        <span className="p-submission-file-hint">Attached file submission</span>
                      </div>
                      <a
                        className="p-btn p-btn-small"
                        href={`/v1/student/assignments/${a.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        <Download size={13} className="inline mr-1" /> Download File
                      </a>
                    </div>
                  ) : (
                    <div className="p-submission-link-card">
                      <ExternalLink size={20} className="p-submission-link-icon" />
                      <div className="p-submission-link-info">
                        <span className="p-submission-link-label">
                          {a.submission.kind === 'git' ? 'Git Repository' : 'Project URL'}
                        </span>
                        <span className="p-submission-link-url">{a.submission.link}</span>
                      </div>
                      <a
                        className="p-btn p-btn-small"
                        href={a.submission.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={13} className="inline mr-1" /> Open Link
                      </a>
                    </div>
                  )}
                </div>

                {a.submission.note && (
                  <div className="p-submission-note-row">
                    <strong className="text-xs text-muted block mb-1">Your Note for Trainer:</strong>
                    <p className="p-submission-note-text">{a.submission.note}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit / Edit Form Box */}
            {submittingId === a.id && (
              <div className="p-submission-form-container">
                <SubmitForm
                  assignment={a}
                  onDone={() => {
                    setSubmittingId(null);
                    list.reload();
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

interface QuizQuestion {
  q: string;
  options: string[];
  answer_index?: number;
  user_answer?: number | null;
}

interface QuizRowData {
  id: number;
  title: string;
  batch_name?: string;
  due_at: string | null;
  questions: QuizQuestion[];
  attempt: {
    score: number;
    total: number;
    submitted_at?: string | null;
    answers?: number[];
  } | null;
}

function QuizCard({ quiz, onDone }: { quiz: QuizRowData; onDone: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isTaking, setIsTaking] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutions, setSolutions] = useState<{
    score: number;
    total: number;
    submitted_at?: string | null;
    answers?: number[];
    questions: QuizQuestion[];
  } | null>(null);
  const [loadingSolutions, setLoadingSolutions] = useState(false);

  const attempt = quiz.attempt || solutions;
  const isMissed = !attempt && Boolean(quiz.due_at && new Date(quiz.due_at).getTime() < Date.now());
  const isUpcoming = !attempt && !isMissed;

  const answeredCount = answers.filter(a => a !== null).length;
  const allAnswered = answeredCount === quiz.questions.length && quiz.questions.length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allAnswered) return;
    setBusy(true);
    setError(null);
    try {
      await api<{ score: number; total: number }>(`/student/quizzes/${quiz.id}/attempt`, {
        body: { answers: answers.map(a => a ?? 0) },
      });
      // Fetch full solutions right away so the student can review
      try {
        const sol = await api<{
          score: number;
          total: number;
          submitted_at?: string | null;
          answers?: number[];
          questions: QuizQuestion[];
        }>(`/student/quizzes/${quiz.id}/solutions`);
        setSolutions(sol);
        setShowSolutions(true);
      } catch {
        // Fallback
      }
      setIsTaking(false);
      onDone();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSolutions() {
    if (showSolutions) {
      setShowSolutions(false);
      return;
    }
    // Check if questions already have answer_index
    const hasAnswers = quiz.questions.some(q => q.answer_index !== undefined);
    if (hasAnswers) {
      setShowSolutions(true);
      return;
    }
    // Fetch solutions from endpoint
    setLoadingSolutions(true);
    try {
      const sol = await api<{
        score: number;
        total: number;
        submitted_at?: string | null;
        answers?: number[];
        questions: QuizQuestion[];
      }>(`/student/quizzes/${quiz.id}/solutions`);
      setSolutions(sol);
      setShowSolutions(true);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setLoadingSolutions(false);
    }
  }

  const questionsToReview = solutions?.questions || quiz.questions;
  const scorePercent = attempt && attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;

  return (
    <div className={`p-quiz-card ${attempt ? 'p-quiz-card--completed' : isMissed ? 'p-quiz-card--missed' : 'p-quiz-card--upcoming'}`}>
      <div className="p-quiz-header">
        <div className="p-quiz-title-group">
          <div className="p-quiz-meta-row">
            {quiz.batch_name && <span className="p-quiz-batch-badge">{quiz.batch_name}</span>}
            <span className="p-quiz-qcount-badge">{quiz.questions.length} Questions</span>
          </div>
          <h2 className="p-quiz-title">{quiz.title}</h2>
          <div className="p-quiz-due-row">
            <Clock size={13} className="inline opacity-70" />
            {attempt ? (
              <span>Completed {attempt.submitted_at ? fmtDateTime(attempt.submitted_at) : ''}</span>
            ) : isMissed ? (
              <span className="p-quiz-missed-text">Deadline passed {quiz.due_at ? fmtDateTime(quiz.due_at) : ''}</span>
            ) : (
              <span>Due {quiz.due_at ? fmtDateTime(quiz.due_at) : 'Open submission'}</span>
            )}
          </div>
        </div>

        <div className="p-quiz-status-box">
          {attempt ? (
            <StatusChip
              text={`Score ${attempt.score} / ${attempt.total}`}
              tone={scorePercent >= 75 ? 'good' : scorePercent >= 50 ? 'warn' : 'bad'}
            />
          ) : isMissed ? (
            <StatusChip text="Missed" tone="bad" />
          ) : (
            <StatusChip text="Upcoming" tone="warn" />
          )}
        </div>
      </div>

      {/* When Completed: View Score Banner & Detailed Answers Toggle */}
      {attempt && (
        <div className="p-quiz-completed-body">
          <div className="p-quiz-score-summary">
            <div className="p-quiz-score-pill">
              <CheckCircle2 size={18} className="p-quiz-check-icon" />
              <span>
                You scored <strong>{attempt.score}</strong> out of <strong>{attempt.total}</strong> ({scorePercent}%). Your trainer can see your attempt.
              </span>
            </div>
            <button
              type="button"
              className="p-btn p-btn-ghost p-btn-small"
              onClick={toggleSolutions}
              disabled={loadingSolutions}
            >
              {loadingSolutions ? (
                'Loading answers…'
              ) : showSolutions ? (
                <>
                  <EyeOff size={14} className="mr-1 inline" /> Hide Solutions
                </>
              ) : (
                <>
                  <Eye size={14} className="mr-1 inline" /> View Score & Correct Answers
                </>
              )}
            </button>
          </div>

          {/* Detailed Question Review */}
          {showSolutions && (
            <div className="p-quiz-solutions-pane">
              <div className="p-quiz-solutions-head-row">
                <h3 className="p-quiz-solutions-heading">Question-by-Question Review</h3>
                <span className="p-quiz-solutions-score-tag">
                  Score: {attempt.score} / {attempt.total} ({scorePercent}%)
                </span>
              </div>
              <div className="p-quiz-solutions-list">
                {questionsToReview.map((q, qIndex) => {
                  const isCorrect = q.user_answer !== undefined && q.user_answer !== null && q.user_answer === q.answer_index;
                  return (
                    <div
                      key={qIndex}
                      className={`p-quiz-sol-card ${isCorrect ? 'p-quiz-sol-card--correct' : 'p-quiz-sol-card--wrong'}`}
                    >
                      <div className="p-quiz-sol-header">
                        <span className="p-quiz-sol-num">Question {qIndex + 1}</span>
                        <span className={`p-quiz-sol-tag ${isCorrect ? 'p-quiz-sol-tag--good' : 'p-quiz-sol-tag--bad'}`}>
                          {isCorrect ? '✓ Correct (+1)' : '✗ Incorrect (0)'}
                        </span>
                      </div>
                      <p className="p-quiz-sol-text">{q.q}</p>
                      <div className="p-quiz-sol-options">
                        {q.options.map((opt, oIndex) => {
                          const isCorrectChoice = oIndex === q.answer_index;
                          const isUserChoice = oIndex === q.user_answer;
                          let choiceClass = 'p-quiz-sol-opt';
                          if (isCorrectChoice) choiceClass += ' p-quiz-sol-opt--correct';
                          if (isUserChoice && !isCorrectChoice) choiceClass += ' p-quiz-sol-opt--wrong';

                          return (
                            <div key={oIndex} className={choiceClass}>
                              <span className="p-quiz-sol-letter">{String.fromCharCode(65 + oIndex)}</span>
                              <span className="p-quiz-sol-opt-text">{opt}</span>
                              {isCorrectChoice && <span className="p-quiz-ans-badge p-quiz-ans-badge--correct">Correct Answer</span>}
                              {isUserChoice && !isCorrectChoice && <span className="p-quiz-ans-badge p-quiz-ans-badge--wrong">Your Answer</span>}
                              {isUserChoice && isCorrectChoice && <span className="p-quiz-ans-badge p-quiz-ans-badge--user">Your Answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* When Upcoming: Take Quiz Interface */}
      {isUpcoming && (
        <div className="p-quiz-upcoming-body">
          <ErrorNotice error={error} />
          {!isTaking ? (
            <div className="p-quiz-preview-bar">
              <p className="p-quiz-preview-desc">
                Short multiple-choice check from your trainer. You can submit once, so verify your answers before submitting.
              </p>
              <button
                type="button"
                className="p-btn p-btn-small"
                onClick={() => setIsTaking(true)}
              >
                <PlayCircle size={15} className="mr-1 inline" /> Take Quiz
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="p-quiz-taking-form">
              <div className="p-quiz-progress-head">
                <span className="font-semibold text-sm">
                  {answeredCount} of {quiz.questions.length} questions answered
                </span>
                <span className="text-xs text-muted">
                  {allAnswered ? 'All answered! Ready to submit.' : 'Please select an option for each question.'}
                </span>
              </div>
              <ProgressBar value={answeredCount} max={quiz.questions.length} />

              <div className="p-quiz-questions-stack">
                {quiz.questions.map((question, qIndex) => (
                  <fieldset key={qIndex} className="p-quiz-q-box">
                    <legend className="p-quiz-q-legend">
                      <strong>Question {qIndex + 1}.</strong> {question.q}
                    </legend>
                    <div className="p-quiz-radio-list">
                      {question.options.map((option, oIndex) => {
                        const isSelected = answers[qIndex] === oIndex;
                        return (
                          <label
                            key={oIndex}
                            className={`p-quiz-radio-card ${isSelected ? 'p-quiz-radio-card--selected' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`quiz-${quiz.id}-q-${qIndex}`}
                              checked={isSelected}
                              onChange={() =>
                                setAnswers(curr =>
                                  curr.map((val, idx) => (idx === qIndex ? oIndex : val))
                                )
                              }
                            />
                            <span className="p-quiz-radio-letter">{String.fromCharCode(65 + oIndex)}</span>
                            <span className="p-quiz-radio-text">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="p-quiz-form-actions">
                <button
                  type="submit"
                  className="p-btn"
                  disabled={busy || !allAnswered}
                >
                  {busy ? 'Submitting…' : 'Submit Answers'}
                </button>
                <button
                  type="button"
                  className="p-btn p-btn-ghost"
                  onClick={() => setIsTaking(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* When Missed: Notice */}
      {isMissed && (
        <div className="p-quiz-missed-body">
          <Notice tone="danger">
            The deadline for this quiz closed on {quiz.due_at ? fmtDateTime(quiz.due_at) : 'the scheduled date'}. Please contact your trainer if you need an evaluation unlock.
          </Notice>
        </div>
      )}
    </div>
  );
}

function Quizzes() {
  const list = useApi<{ items: QuizRowData[] }>('/student/quizzes');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'missed'>('all');

  const items = list.data?.items ?? [];

  function getStatus(q: QuizRowData): 'completed' | 'upcoming' | 'missed' {
    if (q.attempt) return 'completed';
    if (q.due_at && new Date(q.due_at).getTime() < Date.now()) return 'missed';
    return 'upcoming';
  }

  const allCount = items.length;
  const upcomingCount = items.filter(q => getStatus(q) === 'upcoming').length;
  const completedCount = items.filter(q => getStatus(q) === 'completed').length;
  const missedCount = items.filter(q => getStatus(q) === 'missed').length;

  const filteredItems = items.filter(q => {
    if (filter === 'all') return true;
    return getStatus(q) === filter;
  });

  return (
    <>
      <div className="p-quiz-page-head">
        <h1 className="p-quiz-page-title">Quizzes & Knowledge Checks</h1>
        <p className="p-quiz-page-desc">
          Short multiple-choice checks from your trainer. Filter by upcoming, completed, or missed, and review solutions after submission.
        </p>

        {/* Status Filter Tabs Bar */}
        <div className="p-tabs-bar" role="tablist" aria-label="Quiz status filters">
          <button
            type="button"
            className={`p-tab-btn ${filter === 'all' ? 'p-tab-btn--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All <span className="p-tab-count">{allCount}</span>
          </button>
          <button
            type="button"
            className={`p-tab-btn ${filter === 'upcoming' ? 'p-tab-btn--active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming <span className="p-tab-count">{upcomingCount}</span>
          </button>
          <button
            type="button"
            className={`p-tab-btn ${filter === 'completed' ? 'p-tab-btn--active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed <span className="p-tab-count">{completedCount}</span>
          </button>
          <button
            type="button"
            className={`p-tab-btn ${filter === 'missed' ? 'p-tab-btn--active' : ''}`}
            onClick={() => setFilter('missed')}
          >
            Missed <span className="p-tab-count">{missedCount}</span>
          </button>
        </div>
      </div>

      <ErrorNotice error={list.error} />

      {filteredItems.length === 0 && list.data && (
        <Empty>
          {filter === 'all'
            ? 'No quizzes yet.'
            : filter === 'upcoming'
            ? 'No upcoming quizzes. You are all caught up!'
            : filter === 'completed'
            ? 'No completed quizzes yet. Complete an upcoming quiz to view your score and solutions here.'
            : 'No missed quizzes. You have stayed on top of all deadlines!'}
        </Empty>
      )}

      <div className="p-quiz-list">
        {filteredItems.map(q => (
          <QuizCard key={q.id} quiz={q} onDone={list.reload} />
        ))}
      </div>
    </>
  );
}

interface InProgressCourse {
  enrolment_id: number;
  programme: string;
  batch: string;
  classes_ended: number;
  classes_total: number;
  attendance_rate: number | null;
  attendance_threshold: number;
  fee_balance_inr: number;
  fees_cleared: boolean;
  status: string;
}

function Certificates() {
  const list = useApi<{
    items: { id: number; number: string; programme: string; batch: string; issued_at: string }[];
    in_progress?: InProgressCourse[];
  }>('/student/certificates');

  const earned = list.data?.items ?? [];
  const inProgress = list.data?.in_progress ?? [];

  return (
    <>
      <PageHead
        title="Certificates"
        text="Official Certificates of Completion are issued once you fully complete all scheduled classes of your course and satisfy attendance & fee criteria."
      />
      <ErrorNotice error={list.error} />

      {/* Earned & Verified Certificates */}
      {earned.length > 0 && (
        <div className="p-cert-grid">
          {earned.map(c => (
            <Card
              key={c.id}
              title={c.programme}
              actions={<StatusChip text={c.number} tone="good" />}
            >
              <p className="p-muted">{c.batch} · Issued {fmtDateTime(c.issued_at)}</p>
              <div style={{ marginTop: 14 }}>
                <a className="p-btn" href={`/v1/student/certificates/${c.id}`} target="_blank" rel="noreferrer">
                  View and print
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Courses in progress where certificate is locked until full course completion */}
      {inProgress.map(p => {
        const progressPct = p.classes_total > 0 ? Math.round((p.classes_ended / p.classes_total) * 100) : 0;
        return (
          <div key={p.enrolment_id} className="p-card p-cert-locked-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">{p.programme}</h3>
                <p className="p-course-batch">{p.batch}</p>
              </div>
              <StatusChip text="Course In Progress" tone="warn" />
            </div>

            <div className="p-cert-lock-banner">
              <div className="p-cert-lock-icon">🔒</div>
              <div className="p-cert-lock-text">
                <strong>Certificate Locked: Available only after completing the course fully</strong>
                <p>
                  Your certificate of completion will be unlocked and available here once all <strong>{p.classes_total}</strong> scheduled classes are concluded.
                </p>
              </div>
            </div>

            <div className="p-course-progress-section">
              <ProgressBar
                value={progressPct}
                max={100}
                label={`Class Completion Progress (${p.classes_ended} of ${p.classes_total} classes concluded)`}
              />
            </div>

            <div className="p-stats">
              <Stat label="Classes Finished" value={`${p.classes_ended} / ${p.classes_total}`} />
              <Stat
                label="Attendance Rate"
                value={p.attendance_rate === null ? '—' : `${p.attendance_rate}% (min ${p.attendance_threshold}%)`}
              />
              <Stat
                label="Fee Clearance"
                value={p.fees_cleared ? 'Cleared in full' : fmtInr(p.fee_balance_inr)}
              />
              <Stat label="Certification Status" value="Locked (Pending classes)" />
            </div>

            <div className="p-course-footer">
              <Link className="p-btn p-btn-ghost" to="/app/classes">
                View Class Schedule <ArrowRight size={14} className="inline ml-1" />
              </Link>
            </div>
          </div>
        );
      })}

      {earned.length === 0 && inProgress.length === 0 && list.data && (
        <Empty>No certificate yet. Finish every class and clear your fees, and the academy will issue it here.</Empty>
      )}
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
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="*" element={<Empty>This page does not exist.</Empty>} />
          </Routes>
        </>
      )}
    </PanelFrame>
  );
}
