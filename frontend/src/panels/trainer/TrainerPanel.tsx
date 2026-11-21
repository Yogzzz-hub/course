import { useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  Users,
  Video,
  FileText,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  ArrowRight,
  TrendingUp,
  HelpCircle,
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
  StatusChip,
  Table,
  fieldErrors,
  fmtDate,
  fmtDateTime,
  WelcomeBanner,
  MetricCard,
  CourseEngagementChart,
  ActivityTimeline,
  type ActivityItem,
  ProgressBar,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/trainer', label: 'Overview', end: true },
  { to: '/trainer/classes', label: 'Classes' },
  { to: '/trainer/batches', label: 'My batches' },
  { to: '/trainer/assignments', label: 'Assignments' },
  { to: '/trainer/quizzes', label: 'Quizzes' },
  { to: '/trainer/tasks', label: 'Tasks' },
];

interface ClassRow { id: number; batch_id: number; batch: string; sequence: number; starts_at: string; ends_at: string; status: string; meeting_url: string; recording_url: string }
interface BatchRow { id: number; name: string; programme: string; days: string; start_time: string; duration_minutes: number; students: number }
interface AssignmentRow { id: number; title: string; brief: string; due_at: string | null; submissions: number; graded: number }
interface SubmissionRow { id: number; name: string; email: string; kind: string; link: string; file_name: string; has_file: boolean; note: string; submitted_at: string; score: number | null; feedback: string }
interface QuizRow { id: number; title: string; questions: number; attempts: number }
interface TaskRow { id: number; title: string; detail: string; due_at: string | null; for: string; done: number }

/** Runs one change, shows the outcome, then reloads. */
function useChange(reload: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');
  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await action();
      setMessage(done);
      reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, message, run };
}

function BatchPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const batches = useApi<{ items: BatchRow[] }>('/trainer/batches');
  return (
    <select className="p-select" value={value} onChange={e => onChange(e.target.value)} aria-label="Batch">
      <option value="">Choose a batch</option>
      {(batches.data?.items ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
}

function Classes() {
  const classes = useApi<{ items: ClassRow[] }>('/trainer/classes');
  const [selected, setSelected] = useState<ClassRow | null>(null);
  const change = useChange(classes.reload);
  const roster = useApi<{ threshold_percent: number; items: { name: string; email: string; minutes_connected: number; percent: number; attended: boolean }[] }>(
    selected ? `/trainer/classes/${selected.id}/roster` : null,
  );
  const [links, setLinks] = useState({ meeting_url: '', recording_url: '' });

  function choose(row: ClassRow) {
    setSelected(row);
    setLinks({ meeting_url: row.meeting_url, recording_url: row.recording_url });
  }

  return (
    <>
      <PageHead title="Classes" text="Start and end your classes. Attendance is recorded automatically from each student's connection, so there is nothing to mark." />
      <ErrorNotice error={classes.error} />
      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}
      <Card title="Your timetable">
        <Table
          head={['Batch', '#', 'Starts', 'Status', 'Actions']}
          rows={(classes.data?.items ?? []).map(c => [
            c.batch,
            c.sequence,
            fmtDateTime(c.starts_at),
            <StatusChip key="s" text={c.status} tone={c.status === 'live' ? 'warn' : c.status === 'ended' ? 'good' : 'neutral'} />,
            <div key="a" className="p-row">
              {c.status !== 'ended' && c.status !== 'live' && (
                <button type="button" className="p-btn p-btn-small" disabled={change.busy} onClick={() => change.run(() => api(`/trainer/classes/${c.id}/start`, { method: 'POST' }), 'Class started. Students can now join.')}>Start</button>
              )}
              {c.status === 'live' && (
                <button type="button" className="p-btn p-btn-small p-btn-danger" disabled={change.busy} onClick={() => change.run(() => api(`/trainer/classes/${c.id}/end`, { method: 'POST' }), 'Class ended.')}>End class</button>
              )}
              <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => choose(c)}>Details</button>
            </div>,
          ])}
          empty="No classes on your timetable yet. The manager schedules batches and assigns you to them."
        />
      </Card>

      {selected && (
        <>
          <Card title={`Class ${selected.sequence} · ${selected.batch}`}>
            <form
              className="p-form-grid"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                change.run(() => api(`/trainer/classes/${selected.id}`, { method: 'PATCH', body: links }), 'Links saved.');
              }}
            >
              <Field label="Meeting link" hint="Students see this link while the class is live.">
                <input className="p-input" type="url" value={links.meeting_url} onChange={e => setLinks({ ...links, meeting_url: e.target.value })} />
              </Field>
              <Field label="Recording link" hint="Added after the class so students can watch it later.">
                <input className="p-input" type="url" value={links.recording_url} onChange={e => setLinks({ ...links, recording_url: e.target.value })} />
              </Field>
              <div className="span-2"><button className="p-btn" type="submit" disabled={change.busy}>Save links</button></div>
            </form>
          </Card>
          <Card title={`Who is connected (attendance counts at ${roster.data?.threshold_percent ?? '—'}% of the class)`}>
            <ErrorNotice error={roster.error} />
            <Table
              head={['Student', 'Minutes connected', 'Share of class', 'Attendance']}
              rows={(roster.data?.items ?? []).map(r => [
                <div key="n"><strong>{r.name}</strong><div className="p-muted">{r.email}</div></div>,
                r.minutes_connected,
                `${r.percent}%`,
                <StatusChip key="s" text={r.attended ? 'Attended' : 'Below the rule'} tone={r.attended ? 'good' : 'warn'} />,
              ])}
              empty="No students enrolled in this batch have paid yet."
            />
          </Card>
        </>
      )}
    </>
  );
}

function MyBatches() {
  const batches = useApi<{ items: BatchRow[] }>('/trainer/batches');
  return (
    <>
      <PageHead title="My batches" text="The batches you are assigned to." />
      <Card>
        <ErrorNotice error={batches.error} />
        <Table
          head={['Batch', 'Programme', 'Schedule', 'Students']}
          rows={(batches.data?.items ?? []).map(b => [b.name, b.programme, `${b.days} · ${b.start_time} IST · ${b.duration_minutes} min`, b.students])}
          empty="You are not assigned to any batch yet."
        />
      </Card>
    </>
  );
}

function SubmissionGrader({ row, onSaved }: { row: SubmissionRow; onSaved: () => void }) {
  const [score, setScore] = useState(row.score === null ? '' : String(row.score));
  const [feedback, setFeedback] = useState(row.feedback);
  const change = useChange(onSaved);
  return (
    <div className="p-cards">
      <div className="p-row">
        <input className="p-input" style={{ maxWidth: 110 }} type="number" min={0} max={100} placeholder="Score" value={score} onChange={e => setScore(e.target.value)} aria-label="Score out of 100" />
        <input className="p-input" placeholder="Feedback" value={feedback} onChange={e => setFeedback(e.target.value)} aria-label="Feedback" />
        <button type="button" className="p-btn p-btn-small" disabled={change.busy || score === ''} onClick={() => change.run(() => api(`/trainer/submissions/${row.id}`, { method: 'PATCH', body: { score: Number(score), feedback } }), 'Graded.')}>Save grade</button>
      </div>
      <ErrorNotice error={change.error} />
    </div>
  );
}

function Submissions({ assignmentId }: { assignmentId: number }) {
  const list = useApi<{ items: SubmissionRow[] }>(`/trainer/assignments/${assignmentId}/submissions`);
  return (
    <>
      <ErrorNotice error={list.error} />
      <Table
        head={['Student', 'Submitted', 'Work', 'Grade']}
        rows={(list.data?.items ?? []).map(s => [
          <div key="n"><strong>{s.name}</strong><div className="p-muted">{s.email}</div></div>,
          fmtDateTime(s.submitted_at),
          <div key="w">
            {s.kind === 'file' && s.has_file ? (
              <a className="p-link" href={`/v1/trainer/submissions/${s.id}/file`}>{s.file_name}</a>
            ) : (
              <a className="p-link" href={s.link} target="_blank" rel="noreferrer">{s.link}</a>
            )}
            {s.note && <div className="p-muted">{s.note}</div>}
          </div>,
          <SubmissionGrader key={`g-${s.id}-${s.score ?? 'none'}`} row={s} onSaved={list.reload} />,
        ])}
        empty="Nothing submitted yet."
      />
    </>
  );
}

function DeadlineEditor({ assignment, onDone }: { assignment: AssignmentRow; onDone: () => void }) {
  const [dueAt, setDueAt] = useState(assignment.due_at ? assignment.due_at.slice(0, 16) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/trainer/assignments/${assignment.id}`, {
        method: 'PATCH',
        body: { due_at: dueAt ? new Date(dueAt).toISOString() : null },
      });
      onDone();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, background: 'var(--surface-sunken)', borderRadius: 10, flexWrap: 'wrap' }}>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Set Deadline for "{assignment.title}":</label>
      <input
        type="datetime-local"
        className="p-input"
        value={dueAt}
        onChange={e => setDueAt(e.target.value)}
        style={{ width: 'auto', minWidth: 220 }}
      />
      <button type="submit" className="p-btn p-btn-small" disabled={busy}>
        {busy ? 'Saving…' : 'Save Deadline'}
      </button>
      <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={onDone} disabled={busy}>
        Cancel
      </button>
      {error && <span className="p-hint text-red-500">{error.message}</span>}
    </form>
  );
}

function Assignments() {
  const [batchId, setBatchId] = useState('');
  const list = useApi<{ items: AssignmentRow[] }>(batchId ? `/trainer/batches/${batchId}/assignments` : null);
  const [form, setForm] = useState({ title: '', brief: '', due_at: '' });
  const [openId, setOpenId] = useState<number | null>(null);
  const [editingDeadlineId, setEditingDeadlineId] = useState<number | null>(null);
  const change = useChange(list.reload);

  function submit(event: FormEvent) {
    event.preventDefault();
    change.run(
      () => api(`/trainer/batches/${batchId}/assignments`, { body: { title: form.title, brief: form.brief, due_at: form.due_at ? new Date(form.due_at).toISOString() : null } }),
      'Assignment published to the batch.',
    );
    setForm({ title: '', brief: '', due_at: '' });
  }

  return (
    <>
      <PageHead title="Assignments" text="Publish work for a batch, fix deadlines, then review and grade what students submit." />
      <Card title="Batch">
        <BatchPicker value={batchId} onChange={value => { setBatchId(value); setOpenId(null); setEditingDeadlineId(null); }} />
      </Card>
      {batchId && (
        <>
          <Card title="New assignment">
            <ErrorNotice error={change.error} />
            {change.message && <Notice tone="success">{change.message}</Notice>}
            <form onSubmit={submit} className="p-form-grid">
              <Field label="Title" error={fieldErrors(change.error).title}><input className="p-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Due date (optional)"><input className="p-input" type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} /></Field>
              <Field label="Brief"><textarea className="p-textarea" rows={3} value={form.brief} onChange={e => setForm({ ...form, brief: e.target.value })} /></Field>
              <div className="span-2"><button className="p-btn" type="submit" disabled={change.busy || !form.title}>Publish assignment</button></div>
            </form>
          </Card>
          <Card title="Assignments in this batch">
            <ErrorNotice error={list.error} />
            <Table
              head={['Title', 'Due Deadline', 'Submitted', 'Graded', 'Actions']}
              rows={(list.data?.items ?? []).map(a => [
                a.title,
                a.due_at ? fmtDateTime(a.due_at) : 'No deadline',
                `${a.submissions} submissions`,
                `${a.graded} graded`,
                <div key="act" style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => setOpenId(openId === a.id ? null : a.id)}>{openId === a.id ? 'Hide' : 'Review'}</button>
                  <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => setEditingDeadlineId(editingDeadlineId === a.id ? null : a.id)}>{editingDeadlineId === a.id ? 'Close' : 'Fix Deadline'}</button>
                </div>,
              ])}
              empty="No assignments yet."
            />
            {editingDeadlineId && (() => {
              const targetAssn = (list.data?.items ?? []).find(a => a.id === editingDeadlineId);
              return targetAssn ? (
                <DeadlineEditor
                  assignment={targetAssn}
                  onDone={() => {
                    setEditingDeadlineId(null);
                    list.reload();
                  }}
                />
              ) : null;
            })()}
            {openId && <Submissions assignmentId={openId} />}
          </Card>
        </>
      )}
    </>
  );
}

interface QuestionDraft { q: string; options: string; answer: number }

function Quizzes() {
  const [batchId, setBatchId] = useState('');
  const list = useApi<{ items: QuizRow[] }>(batchId ? `/trainer/batches/${batchId}/quizzes` : null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ q: '', options: '', answer: 0 }]);
  const [openId, setOpenId] = useState<number | null>(null);
  const attempts = useApi<{ title: string; items: { name: string; email: string; score: number; total: number; submitted_at: string }[] }>(openId ? `/trainer/quizzes/${openId}/attempts` : null);
  const change = useChange(list.reload);

  function update(index: number, patch: Partial<QuestionDraft>) {
    setQuestions(current => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = {
      title,
      questions: questions.map(item => ({ q: item.q, options: item.options.split('\n').map(o => o.trim()).filter(Boolean), answer_index: item.answer })),
    };
    change.run(() => api(`/trainer/batches/${batchId}/quizzes`, { body }), 'Quiz published.');
    setTitle('');
    setQuestions([{ q: '', options: '', answer: 0 }]);
  }

  return (
    <>
      <PageHead title="Quizzes" text="Write multiple-choice quizzes for a batch. Students see the score after they submit; the answer key stays with you." />
      <Card title="Batch">
        <BatchPicker value={batchId} onChange={value => { setBatchId(value); setOpenId(null); }} />
      </Card>
      {batchId && (
        <>
          <Card title="New quiz">
            <ErrorNotice error={change.error} />
            {change.message && <Notice tone="success">{change.message}</Notice>}
            <form onSubmit={submit}>
              <Field label="Quiz title"><input className="p-input" required value={title} onChange={e => setTitle(e.target.value)} /></Field>
              {questions.map((item, index) => (
                <div key={index} className="p-card" style={{ marginTop: 12, padding: 14 }}>
                  <Field label={`Question ${index + 1}`}><input className="p-input" required value={item.q} onChange={e => update(index, { q: e.target.value })} /></Field>
                  <Field label="Options (one per line)" hint="At least two options. Write the correct one as its line number below.">
                    <textarea className="p-textarea" rows={3} required value={item.options} onChange={e => update(index, { options: e.target.value })} />
                  </Field>
                  <Field label="Correct option number">
                    <input className="p-input" style={{ maxWidth: 120 }} type="number" min={1} required value={item.answer + 1} onChange={e => update(index, { answer: Math.max(0, Number(e.target.value) - 1) })} />
                  </Field>
                </div>
              ))}
              <div className="p-row" style={{ marginTop: 12 }}>
                {questions.length < 20 && <button type="button" className="p-btn p-btn-ghost" onClick={() => setQuestions(current => [...current, { q: '', options: '', answer: 0 }])}>Add question</button>}
                <button className="p-btn" type="submit" disabled={change.busy || !title}>Publish quiz</button>
              </div>
            </form>
          </Card>
          <Card title="Quizzes in this batch">
            <ErrorNotice error={list.error} />
            <Table
              head={['Quiz', 'Questions', 'Attempts', '']}
              rows={(list.data?.items ?? []).map(q => [
                q.title,
                q.questions,
                q.attempts,
                <button key="v" type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => setOpenId(openId === q.id ? null : q.id)}>{openId === q.id ? 'Hide' : 'View attempts'}</button>,
              ])}
              empty="No quizzes yet."
            />
            {openId && (
              <>
                <ErrorNotice error={attempts.error} />
                <Table
                  head={['Student', 'Score', 'Submitted']}
                  rows={(attempts.data?.items ?? []).map(a => [a.name, `${a.score} / ${a.total}`, fmtDateTime(a.submitted_at)])}
                  empty="No attempts yet."
                />
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function Tasks() {
  const [batchId, setBatchId] = useState('');
  const list = useApi<{ items: TaskRow[] }>(batchId ? `/trainer/batches/${batchId}/tasks` : null);
  const [form, setForm] = useState({ title: '', detail: '', due_at: '' });
  const change = useChange(list.reload);

  function submit(event: FormEvent) {
    event.preventDefault();
    change.run(
      () => api(`/trainer/batches/${batchId}/tasks`, { body: { title: form.title, detail: form.detail, due_at: form.due_at ? new Date(form.due_at).toISOString() : null } }),
      'Task sent to the batch.',
    );
    setForm({ title: '', detail: '', due_at: '' });
  }

  return (
    <>
      <PageHead title="Tasks" text="Practical tasks for the whole batch. Students tick them off when done." />
      <Card title="Batch">
        <BatchPicker value={batchId} onChange={setBatchId} />
      </Card>
      {batchId && (
        <>
          <Card title="New task">
            <ErrorNotice error={change.error} />
            {change.message && <Notice tone="success">{change.message}</Notice>}
            <form onSubmit={submit} className="p-form-grid">
              <Field label="Task"><input className="p-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Due date (optional)"><input className="p-input" type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} /></Field>
              <Field label="Details"><textarea className="p-textarea" rows={3} value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} /></Field>
              <div className="span-2"><button className="p-btn" type="submit" disabled={change.busy || !form.title}>Send task</button></div>
            </form>
          </Card>
          <Card title="Tasks in this batch">
            <ErrorNotice error={list.error} />
            <Table
              head={['Task', 'For', 'Due', 'Done by']}
              rows={(list.data?.items ?? []).map(t => [t.title, t.for, fmtDate(t.due_at?.slice(0, 10)), t.done])}
              empty="No tasks yet."
            />
          </Card>
        </>
      )}
    </>
  );
}

function TrainerHome({ me }: { me: Me }) {
  const classes = useApi<{ items: ClassRow[] }>('/trainer/classes');
  const batches = useApi<{ items: BatchRow[] }>('/trainer/batches');
  const assignments = useApi<{ items: AssignmentRow[] }>('/trainer/assignments');
  const tasks = useApi<{ items: TaskRow[] }>('/trainer/tasks');
  const quizzes = useApi<{ items: QuizRow[] }>('/trainer/quizzes');

  const liveClass = (classes.data?.items ?? []).find(c => c.status === 'live');
  const upcomingClasses = (classes.data?.items ?? []).filter(c => c.status !== 'ended');
  const batchList = batches.data?.items ?? [];
  const totalStudents = batchList.reduce((acc, b) => acc + (b.students || 0), 0);
  const pendingSubmissions = (assignments.data?.items ?? []).reduce(
    (acc, a) => acc + Math.max(0, (a.submissions || 0) - (a.graded || 0)),
    0,
  );
  const tasksCount = (tasks.data?.items ?? []).length;
  const quizzesCount = (quizzes.data?.items ?? []).length;

  const chartData = batchList.length > 0
    ? batchList.slice(0, 5).map(b => ({
        name: b.name.length > 14 ? b.name.slice(0, 12) + '..' : b.name,
        value: b.students,
        secondary: `${b.students} students`,
      }))
    : [
        { name: 'Batch Alpha', value: 24, secondary: '24 students' },
        { name: 'Batch Beta', value: 20, secondary: '20 students' },
        { name: 'Batch Gamma', value: 28, secondary: '28 students' },
      ];

  const activities: ActivityItem[] = [
    {
      id: 'trainer-active',
      title: 'Trainer teaching console active',
      subtitle: me.email,
      time: 'Live',
      icon: CheckCircle2,
      tone: 'blue',
    },
    {
      id: 'upcoming-classes',
      title: `${upcomingClasses.length} upcoming classes scheduled`,
      subtitle: 'Automatic student connection tracking',
      time: 'Schedule',
      icon: CalendarCheck,
      tone: 'green',
    },
    {
      id: 'pending-reviews',
      title: `${pendingSubmissions} student submissions awaiting grading`,
      subtitle: 'Evaluate work and submit feedback scores',
      time: 'Review',
      icon: FileText,
      tone: pendingSubmissions > 0 ? 'amber' : 'green',
    },
    {
      id: 'batch-count',
      title: `${batchList.length} assigned batches with ${totalStudents} students`,
      subtitle: 'Timetables and coursework active',
      time: 'Cohorts',
      icon: Users,
      tone: 'purple',
    },
  ];

  return (
    <>
      <WelcomeBanner
        name={me.name}
        role="Trainer"
        message="Here is your teaching schedule, active batches, and submissions awaiting review."
      />
      <ErrorNotice error={classes.error || batches.error} />

      {/* Pulsing Live Class Beacon if a class is currently live */}
      {liveClass && (
        <div className="p-live-beacon-card">
          <div className="p-live-pulse-badge">
            <span className="p-live-pulse-dot" />
            <span>Class is Live</span>
          </div>
          <h3 className="p-live-title">
            Class {liveClass.sequence} · {liveClass.batch} is in session
          </h3>
          <p className="p-live-subtitle">Students are joining and attendance is automatically recorded.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link to="/trainer/classes" className="p-live-btn">
              Manage live class
            </Link>
            {liveClass.meeting_url && (
              <a
                href={liveClass.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="p-btn p-btn-ghost p-btn-small"
              >
                Join meeting link ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Top Metric Overview Cards */}
      <div className="p-metric-grid">
        <MetricCard
          icon={Users}
          variant={1}
          label="Assigned Batches"
          value={`${batchList.length} Batches`}
          trend={`${totalStudents} Students`}
          trendPositive={true}
        />
        <MetricCard
          icon={Video}
          variant={2}
          label="Upcoming Classes"
          value={`${upcomingClasses.length} Scheduled`}
          trend={liveClass ? '1 Class live now' : 'Next on schedule'}
          trendPositive={true}
        />
        <MetricCard
          icon={FileText}
          variant={3}
          label="Pending Reviews"
          value={`${pendingSubmissions} Submissions`}
          trend={pendingSubmissions > 0 ? 'Needs grading' : 'All graded'}
          trendPositive={pendingSubmissions === 0}
        />
        <MetricCard
          icon={HelpCircle}
          variant={4}
          label="Active Tasks & Quizzes"
          value={`${tasksCount + quizzesCount} Items`}
          trend={`${quizzesCount} Quizzes, ${tasksCount} Tasks`}
          trendPositive={true}
        />
      </div>

      {/* Main Split Layout */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <CourseEngagementChart
            title="Batch Enrolment & Student Distribution"
            data={chartData}
            totalLabel="Total Students Mentored"
            totalValue={`${totalStudents} Students`}
            trendText="Active Cohorts"
          />

          <div className="p-course-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">Next Scheduled Classes</h3>
                <p className="p-course-batch">Upcoming timetable for your assigned cohorts</p>
              </div>
              <Link to="/trainer/classes" className="p-chip p-chip-good inline-flex items-center gap-1">
                View full timetable <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {upcomingClasses.slice(0, 3).map(c => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>
                      Class {c.sequence} · {c.batch}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Starts: {fmtDateTime(c.starts_at)}
                    </span>
                  </div>
                  <StatusChip
                    text={c.status}
                    tone={c.status === 'live' ? 'warn' : c.status === 'ended' ? 'good' : 'neutral'}
                  />
                </div>
              ))}
              {upcomingClasses.length === 0 && (
                <Empty>No upcoming classes scheduled right now.</Empty>
              )}
            </div>
          </div>
        </div>

        <div className="p-dashboard-side">
          <ActivityTimeline title="Teaching Activity Feed" items={activities} />

          <div className="p-todo-card">
            <h3 className="p-todo-title">Trainer Quick Actions</h3>
            <div className="p-todo-list">
              <Link to="/trainer/classes" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Open timetable to start a class</span>
              </Link>
              <Link to="/trainer/assignments" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Grade pending student assignments</span>
              </Link>
              <Link to="/trainer/quizzes" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Publish new quiz for your batch</span>
              </Link>
              <Link to="/trainer/tasks" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Assign practical task to students</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TrainerPanel() {
  return (
    <PanelFrame role="trainer" brand="Trainer" items={NAV}>
      {me => (
        <Routes>
          <Route index element={<TrainerHome me={me} />} />
          <Route path="classes" element={<Classes />} />
          <Route path="batches" element={<MyBatches />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="quizzes" element={<Quizzes />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
