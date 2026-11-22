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
  Eye,
  Download,
  ExternalLink,
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
  CurvedSelect,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/trainer', label: 'Overview', end: true },
  { to: '/trainer/classes', label: 'Classes' },
  { to: '/trainer/batches', label: 'My batches' },
  { to: '/trainer/assignments', label: 'Assignments' },
  { to: '/trainer/quizzes', label: 'Quizzes' },
  { to: '/trainer/leaves', label: 'Leaves' },
];

interface ClassRow { id: number; batch_id: number; batch: string; sequence: number; starts_at: string; ends_at: string; status: string; meeting_url: string; recording_url: string }
interface BatchRow { id: number; name: string; programme: string; days: string; start_time: string; duration_minutes: number; students: number }
interface AssignmentRow { id: number; title: string; brief: string; due_at: string | null; submissions: number; graded: number }
interface SubmissionRow { id: number; name: string; email: string; kind: string; link: string; file_name: string; has_file: boolean; note: string; submitted_at: string; score: number | null; feedback: string }
interface QuizRow { id: number; title: string; questions: number; attempts: number }

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
    <CurvedSelect
      value={value}
      onChange={onChange}
      options={(batches.data?.items ?? []).map(b => ({ value: String(b.id), label: b.name }))}
      placeholder="Choose a batch"
    />
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
          rows={(classes.data?.items ?? []).map(c => {
            const nowMs = Date.now();
            const startMs = new Date(c.starts_at).getTime();
            const diffMinutes = Math.round((startMs - nowMs) / 60000);
            const canStart = diffMinutes <= 10;
            return [
              c.batch,
              c.sequence,
              fmtDateTime(c.starts_at),
              <StatusChip key="s" text={c.status} tone={c.status === 'live' ? 'warn' : c.status === 'ended' ? 'good' : 'neutral'} />,
              <div key="a" className="p-row">
                {c.status !== 'ended' && c.status !== 'live' && (
                  canStart ? (
                    <button
                      type="button"
                      className="p-btn p-btn-small"
                      disabled={change.busy}
                      onClick={() => change.run(() => api(`/trainer/classes/${c.id}/start`, { method: 'POST' }), 'Class started. Students can now join.')}
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="p-btn p-btn-small"
                      disabled
                      title={`Classes can only be started 10 minutes prior to scheduled time (${diffMinutes}m remaining)`}
                      style={{ opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      Start ({diffMinutes > 0 ? `${diffMinutes}m` : 'Soon'})
                    </button>
                  )
                )}
                {c.status === 'live' && (
                  <button type="button" className="p-btn p-btn-small p-btn-danger" disabled={change.busy} onClick={() => change.run(() => api(`/trainer/classes/${c.id}/end`, { method: 'POST' }), 'Class ended.')}>End class</button>
                )}
                <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => choose(c)}>Details</button>
              </div>,
            ];
          })}
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="p-input"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={links.meeting_url}
                    onChange={e => setLinks({ ...links, meeting_url: e.target.value })}
                  />
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => window.open('https://meet.google.com/new', '_blank')}
                    title="Launch a new Google Meet space in a new tab"
                  >
                    + New Google Meet
                  </button>
                </div>
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
        head={['Student', 'Submitted', 'Work', 'Preview / Open', 'Grade']}
        rows={(list.data?.items ?? []).map(s => [
          <div key="n"><strong>{s.name}</strong><div className="p-muted">{s.email}</div></div>,
          fmtDateTime(s.submitted_at),
          <div key="w">
            {s.kind === 'file' && s.has_file ? (
              <a
                className="p-link"
                href={`/v1/trainer/submissions/${s.id}/file?inline=true`}
                target="_blank"
                rel="noreferrer"
                title="Click to preview file"
              >
                {s.file_name}
              </a>
            ) : (
              <a
                className="p-link"
                href={s.link}
                target="_blank"
                rel="noreferrer"
                title="Click to open link"
              >
                {s.link}
              </a>
            )}
            {s.note && <div className="p-muted text-xs" style={{ marginTop: 2 }}>Note: {s.note}</div>}
          </div>,
          <div key="prev" className="p-row" style={{ gap: 6 }}>
            {s.kind === 'file' && s.has_file ? (
              <>
                <a
                  className="p-btn p-btn-small"
                  href={`/v1/trainer/submissions/${s.id}/file?inline=true`}
                  target="_blank"
                  rel="noreferrer"
                  title="Preview student file in new tab"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Eye size={13} />
                  <span>Preview</span>
                </a>
                <a
                  className="p-btn p-btn-ghost p-btn-small"
                  href={`/v1/trainer/submissions/${s.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  title="Download file"
                >
                  <Download size={13} />
                </a>
              </>
            ) : (
              <a
                className="p-btn p-btn-small"
                href={s.link}
                target="_blank"
                rel="noreferrer"
                title="Open student link"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <ExternalLink size={13} />
                <span>Open Link</span>
              </a>
            )}
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
            {openId && (
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '2px dashed var(--border-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    Student Submissions & Grading
                  </h3>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => setOpenId(null)}
                  >
                    Close Review ✕
                  </button>
                </div>
                <Submissions assignmentId={openId} />
              </div>
            )}
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
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: '2px dashed var(--border-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    Student Quiz Attempts
                  </h3>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => setOpenId(null)}
                  >
                    Close ✕
                  </button>
                </div>
                <ErrorNotice error={attempts.error} />
                <Table
                  head={['Student', 'Score', 'Submitted']}
                  rows={(attempts.data?.items ?? []).map(a => [a.name, `${a.score} / ${a.total}`, fmtDateTime(a.submitted_at)])}
                  empty="No attempts yet."
                />
              </div>
            )}
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
  const quizzes = useApi<{ items: QuizRow[] }>('/trainer/quizzes');

  const liveClass = (classes.data?.items ?? []).find(c => c.status === 'live');
  const upcomingClasses = (classes.data?.items ?? []).filter(c => c.status !== 'ended');
  const batchList = batches.data?.items ?? [];
  const totalStudents = batchList.reduce((acc, b) => acc + (b.students || 0), 0);
  const pendingSubmissions = (assignments.data?.items ?? []).reduce(
    (acc, a) => acc + Math.max(0, (a.submissions || 0) - (a.graded || 0)),
    0,
  );
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
        <div className="p-live-card" style={{ marginBottom: 24 }}>
          <div className="p-live-header">
            <div className="p-live-tag">
              <span className="p-beacon-ping" />
              <span className="p-beacon-dot" />
              <span>LIVE CLASS IN PROGRESS</span>
            </div>
            <span className="p-live-seq">Class #{liveClass.sequence}</span>
          </div>
          <div className="p-live-content">
            <div className="p-live-info">
              <h2 className="p-live-title">
                Class {liveClass.sequence} · {liveClass.batch} is in session
              </h2>
              <p className="p-live-desc">
                Students are joining and attendance is automatically recorded.
              </p>
            </div>
            <div className="p-live-action" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to="/trainer/classes" className="p-btn p-btn-live">
                Manage live class
              </Link>
              {liveClass.meeting_url && (
                <a
                  href={liveClass.meeting_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-btn p-btn-ghost p-btn-small"
                  style={{ textDecoration: 'none' }}
                >
                  Join meeting link ↗
                </a>
              )}
            </div>
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
          label="Active Quizzes"
          value={`${quizzesCount} Quizzes`}
          trend="Published for your cohorts"
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
              <Link to="/trainer/leaves" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Submit leave request to manager</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface LeaveRow {
  id: number;
  batch_id: number | null;
  batch: string;
  class_id: number | null;
  class_sequence: number | null;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at: string | null;
}

function Leaves() {
  const leaves = useApi<{ items: LeaveRow[] }>('/trainer/leaves');
  const batches = useApi<{ items: BatchRow[] }>('/trainer/batches');
  const change = useChange(leaves.reload);

  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    change.run(
      () =>
        api('/trainer/leaves', {
          body: {
            batch_id: batchId ? Number(batchId) : null,
            date,
            reason,
          },
        }),
      'Leave request submitted to academy manager.',
    ).then(() => {
      setBatchId('');
      setDate('');
      setReason('');
    });
  }

  return (
    <>
      <PageHead
        title="Leave Requests"
        text="Submit a leave request to the academy manager. The manager reviews your request and can reschedule affected classes."
      />
      <ErrorNotice error={leaves.error} />
      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}

      <Card title="Request Leave">
        <form onSubmit={submit} className="p-form-grid">
          <Field label="Batch (optional)" hint="Select batch if requesting leave for a specific scheduled batch">
            <CurvedSelect
              value={batchId}
              onChange={setBatchId}
              options={[
                { value: '', label: 'All batches / General leave' },
                ...(batches.data?.items ?? []).map(b => ({ value: String(b.id), label: b.name })),
              ]}
              placeholder="Select batch (optional)"
            />
          </Field>
          <Field label="Leave Date">
            <input
              type="date"
              className="p-input"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </Field>
          <div className="span-2">
            <Field label="Reason for Leave" hint="Explain why you are requesting leave so the manager can approve and adjust timings">
              <textarea
                className="p-textarea"
                rows={3}
                required
                placeholder="e.g., Unwell / personal emergency. Please reschedule the session."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </Field>
          </div>
          <div className="span-2">
            <button className="p-btn" type="submit" disabled={change.busy || !date || !reason}>
              {change.busy ? 'Submitting…' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="My Leave History & Status">
        <Table
          head={['Date', 'Batch', 'Reason', 'Status', 'Requested On']}
          rows={(leaves.data?.items ?? []).map(l => [
            fmtDate(l.date),
            l.batch,
            l.reason,
            <StatusChip
              key="s"
              text={l.status.toUpperCase()}
              tone={l.status === 'approved' ? 'good' : l.status === 'rejected' ? 'bad' : 'warn'}
            />,
            fmtDateTime(l.created_at),
          ])}
          empty="No leave requests submitted yet."
        />
      </Card>
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
          <Route path="leaves" element={<Leaves />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
