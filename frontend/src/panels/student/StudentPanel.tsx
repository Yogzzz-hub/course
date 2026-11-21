import { useEffect, useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, StatusChip, Table, fmtDate, fmtDateTime, fmtInr } from '../ui';
import { Spinner } from '../../components/loading/Loaders';

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

function Home() {
  const overview = useApi<{ items: Enrolment[]; payment_instructions: string; attendance_threshold_percent: number }>('/student/overview');
  const assignments = useApi<{ items: { id: number; submission: unknown }[] }>('/student/assignments');
  const tasks = useApi<{ items: { id: number; done: boolean }[] }>('/student/tasks');
  const enrolments = overview.data?.items ?? [];
  const toSubmit = (assignments.data?.items ?? []).filter(a => !a.submission).length;
  const toTick = (tasks.data?.items ?? []).filter(t => !t.done).length;
  const nextClass = enrolments.find(e => e.next_class_at)?.next_class_at ?? null;
  const todo: { label: string; to: string }[] = [];
  for (const e of enrolments) {
    if (e.status === 'awaiting_payment') todo.push({ label: `Pay your fee for ${e.batch} (${fmtInr(e.fees.balance_inr)})`, to: '/app/payments' });
    else if (e.fees.balance_inr > 0) todo.push({ label: `Clear the balance of ${fmtInr(e.fees.balance_inr)}`, to: '/app/payments' });
  }
  if (toSubmit) todo.push({ label: `Submit ${toSubmit} assignment${toSubmit === 1 ? '' : 's'}`, to: '/app/assignments' });
  if (toTick) todo.push({ label: `Tick off ${toTick} task${toTick === 1 ? '' : 's'}`, to: '/app/tasks' });
  if (nextClass) todo.push({ label: `Next class: ${fmtDateTime(nextClass)}`, to: '/app/classes' });

  return (
    <>
      <PageHead title="Your learning" text="Where you stand in each course: fees, classes and your certificate." />
      <ErrorNotice error={overview.error} />
      {enrolments.length > 0 && (
        <Card title="What's next">
          {todo.length === 0 ? (
            <Empty>You are all caught up. Nothing is waiting for you right now.</Empty>
          ) : (
            <ul className="p-checks">
              {todo.map(item => (
                <li key={item.label}>
                  <span aria-hidden="true">→</span>
                  <Link className="p-link" to={item.to}>{item.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {(overview.data?.items ?? []).length === 0 && overview.data && (
        <Empty>You are not enrolled in a batch yet. Your academy manager adds you once your place is confirmed.</Empty>
      )}
      {(overview.data?.items ?? []).map(e => (
        <Card key={e.enrolment_id} title={`${e.programme} · ${e.batch}`} actions={<StatusChip text={e.status.replace('_', ' ')} tone={e.status === 'awaiting_payment' ? 'warn' : 'good'} />}>
          {e.status === 'awaiting_payment' && (
            <>
              <p>Pay your fee to unlock classes, recordings and assignments for this batch.</p>
              <div className="p-stats">
                <Stat label="Course fee" value={fmtInr(e.fees.fee_total_inr)} />
                <Stat label="Paid so far" value={fmtInr(e.fees.paid_inr)} />
                <Stat label="Balance" value={fmtInr(e.fees.balance_inr)} />
              </div>
              {overview.data?.payment_instructions ? (
                <p className="p-hint" style={{ whiteSpace: 'pre-line' }}>{overview.data.payment_instructions}</p>
              ) : (
                <p className="p-hint">Payment details will be shared by the finance team. You can tell us about your payment as soon as you make it.</p>
              )}
              <Link className="p-btn" to="/app/payments">Tell us about a payment</Link>
            </>
          )}
          {e.status !== 'awaiting_payment' && (
            <>
              <div className="p-stats">
                <Stat label="Balance" value={fmtInr(e.fees.balance_inr)} />
                <Stat label="Next class" value={e.next_class_at ? fmtDateTime(e.next_class_at) : '—'} />
                <Stat label="Attendance" value={e.attendance.rate_percent === null ? '—' : `${e.attendance.rate_percent}%`} />
                <Stat label="Classes attended" value={`${e.attendance.attended_classes} of ${e.attendance.ended_classes}`} />
              </div>
              {e.certificate_id ? <Link className="p-btn" to="/app/certificates">View your certificate</Link> : <p className="p-hint">Your certificate appears here once your academy issues it.</p>}
            </>
          )}
        </Card>
      ))}
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
            <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? <><Spinner />Sending…</> : 'Send payment details'}</button></div>
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
      <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? <><Spinner />Submitting…</> : assignment.submission ? 'Replace my submission' : 'Submit'}</button></div>
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
          <button className="p-btn" type="submit" disabled={busy || answers.some(a => a === null)}>{busy ? <><Spinner />Submitting…</> : 'Submit answers'}</button>
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
 * Watches for a live class on every student page, so the Join button shows wherever the student is
 * and connected time keeps counting when they move between pages.
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
    <Card title="Live now">
      <p>Class {liveRow.sequence} is live. {heartbeat.percent !== null && `Your attendance so far: ${heartbeat.percent}% of this class.`}</p>
      {heartbeat.problem && <Notice tone="danger">{heartbeat.problem}</Notice>}
      {liveRow.meeting_url ? (
        <a className="p-btn" href={liveRow.meeting_url} target="_blank" rel="noreferrer">Join class</a>
      ) : (
        <p className="p-hint">The trainer has not added the meeting link yet. Please wait a moment.</p>
      )}
    </Card>
  );
}

export default function StudentPanel() {
  return (
    <PanelFrame role="student" brand="Student" items={NAV}>
      {() => (
        <>
          <LiveClassWatcher />
          <Routes>
            <Route index element={<Home />} />
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
