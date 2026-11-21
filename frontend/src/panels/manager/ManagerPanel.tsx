import { useState, type FormEvent } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, StatusChip, Table, fieldErrors, fmtDate, fmtDateTime, fmtInr } from '../ui';
import { Spinner } from '../../components/loading/Loaders';

const NAV: NavItem[] = [
  { to: '/manager', label: 'Overview' },
  { to: '/manager/programmes', label: 'Programmes' },
  { to: '/manager/batches', label: 'Batches' },
  { to: '/manager/students', label: 'Students' },
  { to: '/manager/certificates', label: 'Certificates' },
  { to: '/manager/tasks', label: 'Tasks & assignments' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Programme { id: number; name: string; fee_inr: number; duration_weeks: number; description: string }
interface BatchRow { id: number; name: string; programme: string; start_date: string; days: string; start_time: string; capacity: number; seats_taken: number; trainers: number; last_class_date: string | null; status: string }
interface Staff { id: number; name: string; email: string }

/** Hook that runs a change, shows the result and reloads the screen's data. */
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
  return { busy, error, message, run, setError };
}

function Overview() {
  const { data, error } = useApi<Record<string, number>>('/manager/overview');
  return (
    <>
      <PageHead title="Overview" text="The academy at a glance." />
      <ErrorNotice error={error} />
      <div className="p-stats">
        <Stat label="Students" value={data?.students} />
        <Stat label="Trainers" value={data?.trainers} />
        <Stat label="Batches running" value={data?.batches_running} />
        <Stat label="Awaiting first payment" value={data?.enrolments_awaiting_payment} />
        <Stat label="Certificates issued" value={data?.certificates_issued} />
      </div>
    </>
  );
}

function Programmes() {
  const list = useApi<{ items: Programme[] }>('/manager/programmes');
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [weeks, setWeeks] = useState('');
  const [description, setDescription] = useState('');
  const change = useChange(list.reload);

  function submit(event: FormEvent) {
    event.preventDefault();
    change.run(
      () => api('/manager/programmes', { body: { name, fee_inr: Number(fee), duration_weeks: Number(weeks || 0), description } }),
      'Programme added.',
    ).then(() => {
      setName(''); setFee(''); setWeeks(''); setDescription('');
    });
  }

  return (
    <>
      <PageHead title="Programmes" text="The courses you sell. The fee here is the default for every batch of that programme." />
      <Card title="Add a programme">
        <form onSubmit={submit} className="p-form-grid">
          <Field label="Programme name" error={fieldErrors(change.error).name}><input className="p-input" required value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Fee (₹)" error={fieldErrors(change.error).fee_inr}><input className="p-input" type="number" min={0} required value={fee} onChange={e => setFee(e.target.value)} /></Field>
          <Field label="Duration (weeks)"><input className="p-input" type="number" min={0} value={weeks} onChange={e => setWeeks(e.target.value)} /></Field>
          <Field label="Description" hint="Shown to students on their fee page."><textarea className="p-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></Field>
          <div className="span-2"><button className="p-btn" type="submit" disabled={change.busy}>Add programme</button></div>
        </form>
        <ErrorNotice error={change.error} />
        {change.message && <Notice tone="success">{change.message}</Notice>}
      </Card>
      <Card title="All programmes">
        <ErrorNotice error={list.error} />
        <Table
          head={['Programme', 'Fee', 'Duration']}
          rows={(list.data?.items ?? []).map(p => [p.name, fmtInr(p.fee_inr), p.duration_weeks ? `${p.duration_weeks} weeks` : '—'])}
          empty="No programmes yet. Add the first one above."
        />
      </Card>
    </>
  );
}

function BatchCreate({ onCreated }: { onCreated: (id: number) => void }) {
  const programmes = useApi<{ items: Programme[] }>('/manager/programmes');
  const [form, setForm] = useState({ programme_id: '', name: '', start_date: '', start_time: '19:00', duration_minutes: '90', classes_total: '12', capacity: '20' });
  const [days, setDays] = useState<string[]>(['Mon', 'Wed']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ id: number }>('/manager/batches', {
        body: {
          programme_id: Number(form.programme_id),
          name: form.name,
          start_date: form.start_date,
          days,
          start_time: form.start_time,
          duration_minutes: Number(form.duration_minutes),
          classes_total: Number(form.classes_total),
          capacity: Number(form.capacity),
        },
      });
      onCreated(result.id);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const fe = fieldErrors(error);
  return (
    <Card title="Create a batch">
      <ErrorNotice error={error} />
      <form onSubmit={submit} className="p-form-grid">
        <Field label="Programme" error={fe.programme_id}>
          <select className="p-select" required value={form.programme_id} onChange={e => set('programme_id', e.target.value)}>
            <option value="">Choose a programme</option>
            {(programmes.data?.items ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Batch name"><input className="p-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Jan 2027 evening" /></Field>
        <Field label="First class date" error={fe.start_date}><input className="p-input" type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
        <Field label="Class start time (IST)" error={fe.start_time}><input className="p-input" type="time" required value={form.start_time} onChange={e => set('start_time', e.target.value)} /></Field>
        <Field label="Class days" error={fe.days}>
          <div className="p-row">
            {DAYS.map(day => (
              <label key={day} className="p-row" style={{ gap: 4 }}>
                <input type="checkbox" checked={days.includes(day)} onChange={e => setDays(current => e.target.checked ? [...current, day] : current.filter(d => d !== day))} />
                {day}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Length of each class (minutes)" error={fe.duration_minutes}><input className="p-input" type="number" min={15} max={480} required value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} /></Field>
        <Field label="Number of classes" error={fe.classes_total}><input className="p-input" type="number" min={1} max={200} required value={form.classes_total} onChange={e => set('classes_total', e.target.value)} /></Field>
        <Field label="Seats" error={fe.capacity}><input className="p-input" type="number" min={1} max={500} required value={form.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
        <div className="span-2"><button className="p-btn" type="submit" disabled={busy || days.length === 0}>{busy ? <><Spinner />Creating…</> : 'Create batch and schedule classes'}</button></div>
      </form>
    </Card>
  );
}

function Batches() {
  const navigate = useNavigate();
  const list = useApi<{ items: BatchRow[] }>('/manager/batches');
  return (
    <>
      <PageHead title="Batches" text="Create a batch, set its days and timing, then assign trainers and onboard students." />
      <BatchCreate onCreated={id => navigate(`/manager/batches/${id}`)} />
      <Card title="All batches">
        <ErrorNotice error={list.error} />
        <Table
          head={['Batch', 'Programme', 'Schedule', 'Seats', 'Trainers', 'Status', '']}
          rows={(list.data?.items ?? []).map(b => [
            b.name,
            b.programme,
            `${b.days} · ${b.start_time} IST · from ${fmtDate(b.start_date)}`,
            `${b.seats_taken} / ${b.capacity}`,
            b.trainers,
            <StatusChip key="s" text={b.status} />,
            <Link key="l" className="p-btn p-btn-ghost p-btn-small" to={`/manager/batches/${b.id}`}>Open</Link>,
          ])}
          empty="No batches yet. Create the first one above."
        />
      </Card>
    </>
  );
}

interface BatchDetailData {
  id: number;
  name: string;
  programme: { id: number; name: string; fee_inr: number } | null;
  start_date: string;
  days: string;
  start_time: string;
  duration_minutes: number;
  classes_total: number;
  capacity: number;
  seats_taken: number;
  attendance_threshold_percent: number;
  trainers: { user_id: number; name: string; email: string }[];
  students: { enrolment_id: number; name: string; email: string; status: string; fee_total_inr: number; paid_inr: number; balance_inr: number; attendance_rate: number | null }[];
  classes: { id: number; sequence: number; starts_at: string; ends_at: string; status: string; recording_url: string }[];
  assignments: number;
  quizzes: number;
}

function BatchDetail() {
  const { batchId } = useParams();
  const detail = useApi<BatchDetailData>(`/manager/batches/${batchId}`);
  const staff = useApi<{ items: Staff[] }>('/manager/staff?role=trainer');
  const [trainerId, setTrainerId] = useState('');
  const change = useChange(detail.reload);
  const batch = detail.data;

  return (
    <>
      <PageHead showTitle title={batch?.name ?? 'Batch'} text={batch ? `${batch.programme?.name ?? ''} · ${batch.days} · ${batch.start_time} IST · ${batch.duration_minutes} min per class` : ''} action={<Link className="p-btn p-btn-ghost" to="/manager/batches">All batches</Link>} />
      <ErrorNotice error={detail.error} />
      {batch && (
        <>
          <div className="p-stats">
            <Stat label="Seats taken" value={`${batch.seats_taken} / ${batch.capacity}`} />
            <Stat label="Classes" value={batch.classes_total} />
            <Stat label="Assignments" value={batch.assignments} />
            <Stat label="Quizzes" value={batch.quizzes} />
            <Stat label="Attendance rule" value={`${batch.attendance_threshold_percent}% of class`} />
          </div>

          <Card title="Trainers">
            <div className="p-row" style={{ marginBottom: 12 }}>
              <select className="p-select" value={trainerId} onChange={e => setTrainerId(e.target.value)}>
                <option value="">Choose a trainer</option>
                {(staff.data?.items ?? []).map(s => <option key={s.id} value={s.id}>{s.name} · {s.email}</option>)}
              </select>
              <button className="p-btn" type="button" disabled={!trainerId || change.busy} onClick={() => change.run(() => api(`/manager/batches/${batch.id}/trainers`, { body: { user_id: Number(trainerId) } }), 'Trainer assigned.')}>Assign trainer</button>
            </div>
            <ErrorNotice error={change.error} />
            {change.message && <Notice tone="success">{change.message}</Notice>}
            <Table
              head={['Trainer', 'Email', '']}
              rows={batch.trainers.map(t => [
                t.name,
                t.email,
                <button key="r" type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => change.run(() => api(`/manager/batches/${batch.id}/trainers/${t.user_id}`, { method: 'DELETE' }), 'Trainer removed.')}>Remove</button>,
              ])}
              empty="No trainer assigned yet. Students cannot join classes until a trainer is assigned."
            />
          </Card>

          <Card title="Students" actions={<Link className="p-btn p-btn-small" to="/manager/students">Onboard a student</Link>}>
            <Table
              head={['Student', 'Status', 'Fees', 'Paid', 'Balance', 'Attendance']}
              rows={batch.students.map(s => [
                <div key="n"><strong>{s.name}</strong><div className="p-muted">{s.email}</div></div>,
                <StatusChip key="s" text={s.status.replace('_', ' ')} tone={s.status === 'active' || s.status === 'completed' ? 'good' : 'warn'} />,
                fmtInr(s.fee_total_inr),
                fmtInr(s.paid_inr),
                fmtInr(s.balance_inr),
                s.attendance_rate === null ? '—' : `${s.attendance_rate}%`,
              ])}
              empty="No students in this batch yet."
            />
          </Card>

          <Card title="Class timetable">
            <Table
              head={['#', 'Starts', 'Ends', 'Status', 'Recording']}
              rows={batch.classes.map(c => [
                c.sequence,
                fmtDateTime(c.starts_at),
                fmtDateTime(c.ends_at),
                <StatusChip key="s" text={c.status} tone={c.status === 'ended' ? 'good' : c.status === 'live' ? 'warn' : 'neutral'} />,
                c.recording_url ? <a key="r" className="p-link" href={c.recording_url} target="_blank" rel="noreferrer">Watch</a> : '—',
              ])}
              empty="No classes scheduled."
            />
          </Card>
        </>
      )}
    </>
  );
}

function Students() {
  const list = useApi<{ items: { user_id: number; name: string; email: string; phone: string; enrolments: { id: number; batch: string; status: string }[] }[] }>('/manager/students');
  const batches = useApi<{ items: BatchRow[] }>('/manager/batches');
  const [form, setForm] = useState({ name: '', email: '', phone: '', batch_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCredentials(null);
    try {
      const result = await api<{ temporary_password: string }>('/manager/students', { body: { ...form, batch_id: Number(form.batch_id) } });
      setCredentials({ email: form.email, password: result.temporary_password });
      setForm({ name: '', email: '', phone: '', batch_id: '' });
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const fe = fieldErrors(error);
  return (
    <>
      <PageHead title="Students" text="Onboard a student into a batch. They pay the fee from their own page; you see their status here." />
      <Card title="Onboard a student">
        <ErrorNotice error={error} />
        {credentials && (
          <Notice tone="success">
            Account created for {credentials.email}. Temporary password (shown once, share it privately): <strong>{credentials.password}</strong>
          </Notice>
        )}
        <form onSubmit={submit} className="p-form-grid">
          <Field label="Full name" error={fe.name}><input className="p-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" error={fe.email}><input className="p-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="p-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Batch" error={fe.batch_id}>
            <select className="p-select" required value={form.batch_id} onChange={e => setForm({ ...form, batch_id: e.target.value })}>
              <option value="">Choose a batch</option>
              {(batches.data?.items ?? []).map(b => <option key={b.id} value={b.id}>{b.name} ({b.seats_taken}/{b.capacity})</option>)}
            </select>
          </Field>
          <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? <><Spinner />Creating…</> : 'Create student account'}</button></div>
        </form>
      </Card>
      <Card title="All students">
        <ErrorNotice error={list.error} />
        <Table
          head={['Name', 'Email', 'Enrolments']}
          rows={(list.data?.items ?? []).map(s => [
            s.name,
            s.email,
            s.enrolments.map(e => `${e.batch}: ${e.status.replace('_', ' ')}`).join(' · ') || '—',
          ])}
          empty="No students yet."
        />
      </Card>
    </>
  );
}

interface EligibilityRow {
  enrolment_id: number;
  name: string;
  email: string;
  batch: string;
  status: string;
  checks: Record<string, boolean>;
  attendance_rate: number | null;
  balance_inr: number;
  certificate_id: number | null;
}

function Certificates() {
  const list = useApi<{ items: EligibilityRow[] }>('/manager/certificates/eligibility');
  const issued = useApi<{ items: { id: number; number: string; name: string; batch: string; issued_at: string; revoked: boolean }[] }>('/manager/certificates');
  const change = useChange(() => {
    list.reload();
    issued.reload();
  });

  return (
    <>
      <PageHead title="Certificates" text="A certificate is issued by you, once every condition below is met for that student." />
      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}
      <Card title="Students who can receive a certificate">
        <ErrorNotice error={list.error} />
        {(list.data?.items ?? []).length === 0 ? (
          <Empty>No active students yet.</Empty>
        ) : (
          <Table
            head={['Student', 'Batch', 'Conditions', 'Action']}
            rows={(list.data?.items ?? []).map(row => [
              <div key="n"><strong>{row.name}</strong><div className="p-muted">{row.email}</div></div>,
              row.batch,
              <ul key="c" className="p-checks">
                <li>{row.checks.all_classes_ended ? '✓' : '○'} All classes finished</li>
                <li>{row.checks.attendance_ok ? '✓' : '○'} Attendance {row.attendance_rate === null ? '—' : `${row.attendance_rate}%`} meets the rule</li>
                <li>{row.checks.fees_cleared ? '✓' : '○'} Fees cleared{row.balance_inr > 0 ? ` (balance ${fmtInr(row.balance_inr)})` : ''}</li>
              </ul>,
              row.certificate_id ? (
                <StatusChip key="s" text="Issued" tone="good" />
              ) : (
                <button key="b" type="button" className="p-btn p-btn-small" disabled={!row.checks.eligible || change.busy} onClick={() => change.run(() => api(`/manager/enrolments/${row.enrolment_id}/certificate`, { method: 'POST' }), 'Certificate issued.')}>
                  Issue certificate
                </button>
              ),
            ])}
            empty="No students to show."
          />
        )}
      </Card>
      <Card title="Issued certificates">
        <Table
          head={['Number', 'Student', 'Batch', 'Issued', 'Status', '']}
          rows={(issued.data?.items ?? []).map(c => [
            c.number,
            c.name,
            c.batch,
            fmtDateTime(c.issued_at),
            <StatusChip key="s" text={c.revoked ? 'Revoked' : 'Valid'} tone={c.revoked ? 'bad' : 'good'} />,
            c.revoked ? '' : <button key="r" type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => change.run(() => api(`/manager/certificates/${c.id}/revoke`, { method: 'POST' }), 'Certificate revoked.')}>Revoke</button>,
          ])}
          empty="No certificates issued yet."
        />
      </Card>
    </>
  );
}

function TasksOverview() {
  const list = useApi<{ items: { batch_id: number; batch: string; assignments: number; submissions: number; graded: number; quizzes: number; quiz_attempts: number; tasks: number }[] }>('/manager/tasks-overview');
  return (
    <>
      <PageHead title="Tasks & assignments" text="How trainers and students are working in each batch. Trainers create the work; you watch it move." />
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Batch', 'Assignments', 'Submitted', 'Graded', 'Quizzes', 'Quiz attempts', 'Tasks']}
          rows={(list.data?.items ?? []).map(r => [r.batch, r.assignments, r.submissions, r.graded, r.quizzes, r.quiz_attempts, r.tasks])}
          empty="No batches yet."
        />
      </Card>
    </>
  );
}

export default function ManagerPanel() {
  return (
    <PanelFrame role="manager" brand="Manager" items={NAV}>
      {() => (
        <Routes>
          <Route index element={<Overview />} />
          <Route path="programmes" element={<Programmes />} />
          <Route path="batches" element={<Batches />} />
          <Route path="batches/:batchId" element={<BatchDetail />} />
          <Route path="students" element={<Students />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="tasks" element={<TasksOverview />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
