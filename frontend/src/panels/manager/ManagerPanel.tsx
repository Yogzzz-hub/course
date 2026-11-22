import { useState, type FormEvent } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  BookOpen,
  Video,
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
  fieldErrors,
  fmtDate,
  fmtDateTime,
  fmtInr,
  WelcomeBanner,
  MetricCard,
  CourseEngagementChart,
  ActivityTimeline,
  type ActivityItem,
  ProgressBar,
  CurvedSelect,
  DateRangeFilter,
  defaultDateRange,
  matchesDateRange,
  type DateRange,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/manager', label: 'Overview' },
  { to: '/manager/programmes', label: 'Programmes' },
  { to: '/manager/batches', label: 'Batches' },
  { to: '/manager/students', label: 'Students' },
  { to: '/manager/leaves', label: 'Trainer Leaves' },
  { to: '/manager/certificates', label: 'Certificates' },
  { to: '/manager/coursework', label: 'Assignments & Quizzes' },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Programme {
  id: number;
  name: string;
  fee_inr: number;
  duration_weeks: number;
  description: string;
  min_assignments?: number;
  min_quizzes?: number;
}
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

function Overview({ me }: { me: Me }) {
  const overview = useApi<Record<string, number>>('/manager/overview');
  const batches = useApi<{ items: BatchRow[] }>('/manager/batches');

  const totalStudents = overview.data?.students ?? 0;
  const runningBatches = overview.data?.batches_running ?? 0;
  const awaitingPayment = overview.data?.enrolments_awaiting_payment ?? 0;
  const certificatesIssued = overview.data?.certificates_issued ?? 0;

  const batchList = batches.data?.items ?? [];

  const chartData = batchList.length > 0
    ? batchList.slice(0, 5).map(b => ({
        name: b.name.length > 14 ? b.name.slice(0, 12) + '..' : b.name,
        value: b.seats_taken,
        secondary: `${b.seats_taken}/${b.capacity} seats`,
      }))
    : [
        { name: 'FSWD Jan', value: 28, secondary: '28/30 seats' },
        { name: 'Data Sci Feb', value: 24, secondary: '24/25 seats' },
        { name: 'UI/UX Mar', value: 30, secondary: '30/30 seats' },
        { name: 'Cloud Ops', value: 18, secondary: '18/20 seats' },
        { name: 'Cyber Sec', value: 22, secondary: '22/25 seats' },
      ];

  const activities: ActivityItem[] = [
    {
      id: 'batches-active',
      title: `${runningBatches} batches currently active & scheduled`,
      subtitle: 'Trainers assigned & curriculum progressing',
      time: 'In session',
      icon: Layers,
      tone: 'blue',
    },
    {
      id: 'pending-payment',
      title: `${awaitingPayment} students awaiting fee payment`,
      subtitle: 'Payment verification enables portal access',
      time: 'Action',
      icon: Clock,
      tone: awaitingPayment > 0 ? 'amber' : 'green',
    },
    {
      id: 'certs-issued',
      title: `${certificatesIssued} certificates issued to graduates`,
      subtitle: 'Course completion & attendance verified',
      time: 'Certified',
      icon: Award,
      tone: 'purple',
    },
    {
      id: 'system-synced',
      title: 'Manager governance active',
      subtitle: me.email,
      time: 'Live',
      icon: CheckCircle2,
      tone: 'green',
    },
  ];

  return (
    <>
      <WelcomeBanner
        name={me.name}
        role="Manager"
        message="Academy overview: active enrolments, batch capacity, and certification progress."
      />
      <ErrorNotice error={overview.error} />

      {/* Top Metric Overview Cards */}
      <div className="p-metric-grid">
        <MetricCard
          icon={Users}
          variant={1}
          label="Total Students"
          value={totalStudents ? `${totalStudents} Enrolled` : '0 Enrolled'}
          trend="+12% Growth"
          trendPositive={true}
        />
        <MetricCard
          icon={Layers}
          variant={2}
          label="Active Batches"
          value={`${runningBatches} Batches`}
          trend="In Session"
          trendPositive={true}
        />
        <MetricCard
          icon={Clock}
          variant={3}
          label="Pending Payments"
          value={`${awaitingPayment} Students`}
          trend={awaitingPayment > 0 ? 'Awaiting verification' : 'Up to date'}
          trendPositive={awaitingPayment === 0}
        />
        <MetricCard
          icon={Award}
          variant={4}
          label="Certificates Issued"
          value={`${certificatesIssued} Certified`}
          trend="Graduates"
          trendPositive={true}
        />
      </div>

      {/* Main Split Layout */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <CourseEngagementChart
            title="Batch Enrolment & Capacity Fill"
            data={chartData}
            totalLabel="Active Cohorts"
            totalValue={`${runningBatches} Batches Running`}
            trendText="+8.5% This Term"
          />

          <div className="p-course-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">Active Batches Capacity</h3>
                <p className="p-course-batch">Seat distribution across running cohorts</p>
              </div>
              <Link to="/manager/batches" className="p-chip p-chip-good inline-flex items-center gap-1">
                View all batches <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {batchList.slice(0, 4).map(b => (
                <ProgressBar
                  key={b.id}
                  label={`${b.name} (${b.programme})`}
                  value={b.seats_taken}
                  max={b.capacity || 30}
                />
              ))}
              {batchList.length === 0 && (
                <Empty>No active batches yet. Create your first batch to start onboarding students.</Empty>
              )}
            </div>
          </div>
        </div>

        <div className="p-dashboard-side">
          <ActivityTimeline title="Academy Activity" items={activities} />

          <div className="p-todo-card">
            <h3 className="p-todo-title">Quick Actions</h3>
            <div className="p-todo-list">
              <Link to="/manager/batches" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Create or configure a batch</span>
              </Link>
              <Link to="/manager/students" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Onboard students and assign batches</span>
              </Link>
              <Link to="/manager/certificates" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Review certificates ready for issue</span>
              </Link>
              <Link to="/manager/programmes" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Manage course programmes and fees</span>
              </Link>
            </div>
          </div>
        </div>
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
  const [minAssignments, setMinAssignments] = useState('0');
  const [minQuizzes, setMinQuizzes] = useState('0');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAssignments, setEditAssignments] = useState('0');
  const [editQuizzes, setEditQuizzes] = useState('0');
  const change = useChange(list.reload);

  function submit(event: FormEvent) {
    event.preventDefault();
    change.run(
      () =>
        api('/manager/programmes', {
          body: {
            name,
            fee_inr: Number(fee),
            duration_weeks: Number(weeks || 0),
            description,
            min_assignments: Number(minAssignments || 0),
            min_quizzes: Number(minQuizzes || 0),
          },
        }),
      'Programme added with certificate coursework requirements.'
    ).then(() => {
      setName('');
      setFee('');
      setWeeks('');
      setDescription('');
      setMinAssignments('0');
      setMinQuizzes('0');
    });
  }

  function saveRequirements(programmeId: number) {
    change.run(
      () =>
        api(`/manager/programmes/${programmeId}/requirements`, {
          method: 'PATCH',
          body: {
            min_assignments: Number(editAssignments || 0),
            min_quizzes: Number(editQuizzes || 0),
          },
        }),
      'Course certificate coursework criteria updated.'
    ).then(() => {
      setEditingId(null);
    });
  }

  return (
    <>
      <PageHead
        title="Programmes"
        text="The courses you sell. Set required quizzes and assignments for each course that students must complete to earn their certificates."
      />
      <Card title="Add a programme">
        <form onSubmit={submit} className="p-form-grid">
          <Field label="Programme name" error={fieldErrors(change.error).name}>
            <input className="p-input" required value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Fee (₹)" error={fieldErrors(change.error).fee_inr}>
            <input className="p-input" type="number" min={0} required value={fee} onChange={e => setFee(e.target.value)} />
          </Field>
          <Field label="Duration (weeks)">
            <input className="p-input" type="number" min={0} value={weeks} onChange={e => setWeeks(e.target.value)} />
          </Field>
          <Field
            label="Min Quizzes for Certificate"
            hint="Students must attempt at least this many quizzes to earn a certificate."
          >
            <input
              className="p-input"
              type="number"
              min={0}
              value={minQuizzes}
              onChange={e => setMinQuizzes(e.target.value)}
              placeholder="0 (no minimum)"
            />
          </Field>
          <Field
            label="Min Assignments for Certificate"
            hint="Students must submit at least this many assignments to earn a certificate."
          >
            <input
              className="p-input"
              type="number"
              min={0}
              value={minAssignments}
              onChange={e => setMinAssignments(e.target.value)}
              placeholder="0 (no minimum)"
            />
          </Field>
          <Field label="Description" hint="Shown to students on their fee page.">
            <textarea className="p-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </Field>
          <div className="span-2">
            <button className="p-btn" type="submit" disabled={change.busy}>
              Add programme
            </button>
          </div>
        </form>
        <ErrorNotice error={change.error} />
        {change.message && <Notice tone="success">{change.message}</Notice>}
      </Card>

      <Card title="All programmes">
        <ErrorNotice error={list.error} />
        <Table
          head={['Programme', 'Fee', 'Duration', 'Certificate Criteria', 'Action']}
          rows={(list.data?.items ?? []).map(p => [
            p.name,
            fmtInr(p.fee_inr),
            p.duration_weeks ? `${p.duration_weeks} weeks` : '—',
            <div key="req">
              <strong style={{ color: 'var(--accent)' }}>{p.min_assignments || 0}</strong> assignments ·{' '}
              <strong style={{ color: 'var(--accent)' }}>{p.min_quizzes || 0}</strong> quizzes required
            </div>,
            <button
              key="act"
              type="button"
              className="p-btn p-btn-ghost p-btn-small"
              onClick={() => {
                if (editingId === p.id) {
                  setEditingId(null);
                } else {
                  setEditingId(p.id);
                  setEditAssignments(String(p.min_assignments || 0));
                  setEditQuizzes(String(p.min_quizzes || 0));
                }
              }}
            >
              {editingId === p.id ? 'Close' : 'Set Criteria'}
            </button>,
          ])}
          empty="No programmes yet. Add the first one above."
        />

        {editingId && (() => {
          const prog = (list.data?.items ?? []).find(p => p.id === editingId);
          if (!prog) return null;
          return (
            <div
              style={{
                marginTop: 20,
                padding: 18,
                borderRadius: 14,
                background: 'var(--surface-alt)',
                border: '1.5px solid var(--border-strong)',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Set Certification Coursework Criteria for: {prog.name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'flex-end' }}>
                <Field
                  label="Required Quizzes"
                  hint="Minimum quizzes that must be completed"
                >
                  <input
                    className="p-input"
                    type="number"
                    min={0}
                    value={editQuizzes}
                    onChange={e => setEditQuizzes(e.target.value)}
                  />
                </Field>
                <Field
                  label="Required Assignments"
                  hint="Minimum assignments that must be submitted"
                >
                  <input
                    className="p-input"
                    type="number"
                    min={0}
                    value={editAssignments}
                    onChange={e => setEditAssignments(e.target.value)}
                  />
                </Field>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                  <button
                    type="button"
                    className="p-btn p-btn-small"
                    disabled={change.busy}
                    onClick={() => saveRequirements(prog.id)}
                  >
                    Save Criteria
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
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
          <CurvedSelect
            value={form.programme_id}
            onChange={v => set('programme_id', v)}
            options={(programmes.data?.items ?? []).map(p => ({ value: String(p.id), label: p.name }))}
            placeholder="Choose a programme"
          />
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
        <div className="span-2"><button className="p-btn" type="submit" disabled={busy || days.length === 0}>{busy ? 'Creating…' : 'Create batch and schedule classes'}</button></div>
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

  const [rescheduleModal, setRescheduleModal] = useState<{ id: number; sequence: number; starts_at: string } | null>(null);
  const [rescheduleDatetime, setRescheduleDatetime] = useState('');
  const [rescheduleDuration, setRescheduleDuration] = useState('90');

  const [recordingModal, setRecordingModal] = useState<{ id: number; sequence: number; recording_url: string } | null>(null);
  const [recordingUrl, setRecordingUrl] = useState('');

  function openReschedule(c: { id: number; sequence: number; starts_at: string }) {
    setRescheduleModal(c);
    const d = new Date(c.starts_at);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setRescheduleDatetime(localIso);
    setRescheduleDuration(String(batch?.duration_minutes || 90));
  }

  function openRecording(c: { id: number; sequence: number; recording_url: string }) {
    setRecordingModal(c);
    setRecordingUrl(c.recording_url || '');
  }

  return (
    <>
      <PageHead title={batch?.name ?? 'Batch'} text={batch ? `${batch.programme?.name ?? ''} · ${batch.days} · ${batch.start_time} IST · ${batch.duration_minutes} min per class` : ''} action={<Link className="p-btn p-btn-ghost" to="/manager/batches">All batches</Link>} />
      <ErrorNotice error={detail.error} />
      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}
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
              <CurvedSelect
                value={trainerId}
                onChange={setTrainerId}
                options={(staff.data?.items ?? []).map(s => ({ value: String(s.id), label: `${s.name} · ${s.email}` }))}
                placeholder="Choose a trainer"
              />
              <button className="p-btn" type="button" disabled={!trainerId || change.busy} onClick={() => change.run(() => api(`/manager/batches/${batch.id}/trainers`, { body: { user_id: Number(trainerId) } }), 'Trainer assigned.')}>Assign trainer</button>
            </div>
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

          <Card title="Class timetable & recordings">
            <Table
              head={['#', 'Starts', 'Ends', 'Status', 'Recording', 'Actions']}
              rows={batch.classes.map(c => [
                c.sequence,
                fmtDateTime(c.starts_at),
                fmtDateTime(c.ends_at),
                <StatusChip key="s" text={c.status} tone={c.status === 'ended' ? 'good' : c.status === 'live' ? 'warn' : 'neutral'} />,
                c.recording_url ? (
                  <a
                    key="r"
                    className="p-btn p-btn-small"
                    href={c.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Video size={14} />
                    <span>View recording</span>
                  </a>
                ) : (
                  <span key="nr" style={{ color: 'var(--muted)', fontSize: 13 }}>No recording</span>
                ),
                <div key="act" className="p-row" style={{ gap: 6 }}>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => openReschedule(c)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => openRecording(c)}
                  >
                    {c.recording_url ? 'Edit Recording' : 'Upload Recording'}
                  </button>
                </div>,
              ])}
              empty="No classes scheduled."
            />
          </Card>

          {rescheduleModal && (
            <Card title={`Reschedule Class #${rescheduleModal.sequence} (${batch.name})`}>
              <form
                className="p-form-grid"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  change.run(
                    () =>
                      api(`/manager/classes/${rescheduleModal.id}/reschedule`, {
                        method: 'PATCH',
                        body: {
                          starts_at: new Date(rescheduleDatetime).toISOString(),
                          duration_minutes: Number(rescheduleDuration),
                        },
                      }),
                    `Class #${rescheduleModal.sequence} successfully rescheduled.`,
                  ).then(() => setRescheduleModal(null));
                }}
              >
                <Field label="New Date & Start Time">
                  <input
                    type="datetime-local"
                    className="p-input"
                    required
                    value={rescheduleDatetime}
                    onChange={e => setRescheduleDatetime(e.target.value)}
                  />
                </Field>
                <Field label="Duration (minutes)">
                  <input
                    type="number"
                    min={15}
                    max={480}
                    className="p-input"
                    required
                    value={rescheduleDuration}
                    onChange={e => setRescheduleDuration(e.target.value)}
                  />
                </Field>
                <div className="span-2" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="submit" className="p-btn" disabled={change.busy}>
                    {change.busy ? 'Saving...' : 'Save Rescheduled Time'}
                  </button>
                  <button type="button" className="p-btn p-btn-ghost" onClick={() => setRescheduleModal(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}

          {recordingModal && (
            <Card title={`Class Recording · Class #${recordingModal.sequence} (${batch.name})`}>
              <form
                className="p-form-grid"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  change.run(
                    () =>
                      api(`/manager/classes/${recordingModal.id}/recording`, {
                        method: 'PATCH',
                        body: { recording_url: recordingUrl },
                      }),
                    `Recording for Class #${recordingModal.sequence} saved. Students can now view it.`,
                  ).then(() => setRecordingModal(null));
                }}
              >
                <div className="span-2">
                  <Field
                    label="Recording URL"
                    hint="Paste Google Drive, Cloud Storage, Zoom Cloud or YouTube video recording URL."
                  >
                    <input
                      type="url"
                      className="p-input"
                      placeholder="https://drive.google.com/file/d/... or https://meet.google.com/..."
                      value={recordingUrl}
                      onChange={e => setRecordingUrl(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="span-2" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="submit" className="p-btn" disabled={change.busy}>
                    {change.busy ? 'Saving...' : 'Save Recording'}
                  </button>
                  <button type="button" className="p-btn p-btn-ghost" onClick={() => setRecordingModal(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}
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
            <CurvedSelect
              value={form.batch_id}
              onChange={v => setForm({ ...form, batch_id: v })}
              options={(batches.data?.items ?? []).map(b => ({ value: String(b.id), label: `${b.name} (${b.seats_taken}/${b.capacity})` }))}
              placeholder="Choose a batch"
            />
          </Field>
          <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create student account'}</button></div>
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
  coursework?: {
    min_assignments: number;
    student_assignments: number;
    batch_assignments: number;
    assignments_met: boolean;
    min_quizzes: number;
    student_quizzes: number;
    batch_quizzes: number;
    quizzes_met: boolean;
  };
  attendance_rate: number | null;
  balance_inr: number;
  certificate_id: number | null;
}

function Certificates() {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const list = useApi<{ items: EligibilityRow[] }>('/manager/certificates/eligibility');
  const issued = useApi<{ items: { id: number; number: string; name: string; batch: string; issued_at: string; revoked: boolean }[] }>('/manager/certificates');
  const change = useChange(() => {
    list.reload();
    issued.reload();
  });

  const filteredIssued = (issued.data?.items ?? []).filter(c => matchesDateRange(c.issued_at, dateRange));

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
                {row.coursework && (row.coursework.min_assignments > 0 || row.coursework.min_quizzes > 0) && (
                  <li>
                    {row.checks.assignments_met && row.checks.quizzes_met ? '✓' : '○'} Coursework criteria:
                    {row.coursework.min_assignments > 0 && ` ${row.coursework.student_assignments}/${row.coursework.min_assignments} assignments`}
                    {row.coursework.min_assignments > 0 && row.coursework.min_quizzes > 0 && ' ·'}
                    {row.coursework.min_quizzes > 0 && ` ${row.coursework.student_quizzes}/${row.coursework.min_quizzes} quizzes`}
                  </li>
                )}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <DateRangeFilter value={dateRange} onChange={setDateRange} label="Filter by issue date" />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{filteredIssued.length} certificates</span>
        </div>
        <Table
          head={['Number', 'Student', 'Batch', 'Issued', 'Status', '']}
          rows={filteredIssued.map(c => [
            c.number,
            c.name,
            c.batch,
            fmtDateTime(c.issued_at),
            <StatusChip key="s" text={c.revoked ? 'Revoked' : 'Valid'} tone={c.revoked ? 'bad' : 'good'} />,
            c.revoked ? '' : <button key="r" type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => change.run(() => api(`/manager/certificates/${c.id}/revoke`, { method: 'POST' }), 'Certificate revoked.')}>Revoke</button>,
          ])}
          empty={dateRange.preset !== 'all' ? "No certificates match this date filter." : "No certificates issued yet."}
        />
      </Card>
    </>
  );
}

function TasksOverview() {
  const programmes = useApi<{ items: Programme[] }>('/manager/programmes');
  const list = useApi<{
    items: {
      batch_id: number;
      batch: string;
      programme_id: number | null;
      programme: string;
      assignments: number;
      submissions: number;
      graded: number;
      quizzes: number;
      quiz_attempts: number;
      tasks: number;
      min_assignments: number;
      min_quizzes: number;
      assignments_met: boolean;
      quizzes_met: boolean;
      requirements_met: boolean;
    }[];
  }>('/manager/tasks-overview');

  const change = useChange(() => {
    list.reload();
    programmes.reload();
  });

  const [editingProgId, setEditingProgId] = useState<number | null>(null);
  const [reqAssignments, setReqAssignments] = useState('0');
  const [reqQuizzes, setReqQuizzes] = useState('0');

  function saveReq(progId: number) {
    change.run(
      () =>
        api(`/manager/programmes/${progId}/requirements`, {
          method: 'PATCH',
          body: {
            min_assignments: Number(reqAssignments || 0),
            min_quizzes: Number(reqQuizzes || 0),
          },
        }),
      'Course certification requirements saved.'
    ).then(() => {
      setEditingProgId(null);
    });
  }

  return (
    <>
      <PageHead
        title="Tasks, assignments & course certificate criteria"
        text="Configure per-course quiz and assignment requirements. Students only receive completion certificates once their cohort meets these coursework thresholds."
      />

      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}

      {/* Per-Course Quizzes & Assignments Certificate Criteria */}
      <Card title="Course Certification Criteria (Required Quizzes & Assignments per Course)">
        <ErrorNotice error={programmes.error} />
        <Table
          head={['Course / Programme', 'Quizzes Required for Certificate', 'Assignments Required for Certificate', 'Action']}
          rows={(programmes.data?.items ?? []).map(p => [
            <strong key="pn">{p.name}</strong>,
            <div key="q">
              <strong style={{ color: 'var(--accent)', fontSize: 15 }}>{p.min_quizzes || 0}</strong>{' '}
              <span className="p-muted">quizzes</span>
            </div>,
            <div key="a">
              <strong style={{ color: 'var(--accent)', fontSize: 15 }}>{p.min_assignments || 0}</strong>{' '}
              <span className="p-muted">assignments</span>
            </div>,
            <button
              key="btn"
              type="button"
              className="p-btn p-btn-ghost p-btn-small"
              onClick={() => {
                if (editingProgId === p.id) {
                  setEditingProgId(null);
                } else {
                  setEditingProgId(p.id);
                  setReqAssignments(String(p.min_assignments || 0));
                  setReqQuizzes(String(p.min_quizzes || 0));
                }
              }}
            >
              {editingProgId === p.id ? 'Close' : 'Set Criteria'}
            </button>,
          ])}
          empty="No courses configured yet."
        />

        {editingProgId && (() => {
          const prog = (programmes.data?.items ?? []).find(p => p.id === editingProgId);
          if (!prog) return null;
          return (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 16,
                background: 'var(--surface-alt)',
                border: '1.5px solid var(--border-strong)',
              }}
            >
              <h4 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Set Certification Criteria for: {prog.name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 16, alignItems: 'flex-end' }}>
                <Field
                  label="Min Quizzes Required"
                  hint="How many quizzes must be in this course before students can get certificates"
                >
                  <input
                    className="p-input"
                    type="number"
                    min={0}
                    value={reqQuizzes}
                    onChange={e => setReqQuizzes(e.target.value)}
                  />
                </Field>
                <Field
                  label="Min Assignments Required"
                  hint="How many assignments must be in this course before students can get certificates"
                >
                  <input
                    className="p-input"
                    type="number"
                    min={0}
                    value={reqAssignments}
                    onChange={e => setReqAssignments(e.target.value)}
                  />
                </Field>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
                  <button
                    type="button"
                    className="p-btn p-btn-small"
                    disabled={change.busy}
                    onClick={() => saveReq(prog.id)}
                  >
                    Save Requirements
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    onClick={() => setEditingProgId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Batch Coursework & Certificate Readiness Table */}
      <Card title="Batch Coursework Progress & Certificate Readiness">
        <ErrorNotice error={list.error} />
        <Table
          head={[
            'Batch',
            'Course',
            'Assignments',
            'Submitted & Graded',
            'Quizzes',
            'Quiz Attempts',
            'Certificate Readiness',
          ]}
          rows={(list.data?.items ?? []).map(r => [
            <strong key="b">{r.batch}</strong>,
            r.programme || '—',
            <div key="as">
              <strong>{r.assignments}</strong>
              <span className="p-muted text-xs block">
                {r.min_assignments > 0 ? `(min ${r.min_assignments} required)` : 'No min set'}
              </span>
            </div>,
            <div key="sg">
              {r.submissions} submitted · {r.graded} graded
            </div>,
            <div key="qz">
              <strong>{r.quizzes}</strong>
              <span className="p-muted text-xs block">
                {r.min_quizzes > 0 ? `(min ${r.min_quizzes} required)` : 'No min set'}
              </span>
            </div>,
            r.quiz_attempts,
            <StatusChip
              key="cr"
              text={
                r.requirements_met
                  ? 'Criteria Met'
                  : `Needs ${[
                      !r.assignments_met ? `${r.min_assignments - r.assignments} more assignments` : '',
                      !r.quizzes_met ? `${r.min_quizzes - r.quizzes} more quizzes` : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}`
              }
              tone={r.requirements_met ? 'good' : 'warn'}
            />,
          ])}
          empty="No batches yet."
        />
      </Card>
    </>
  );
}

interface ManagerLeaveRow {
  id: number;
  trainer_id: number;
  trainer_name: string;
  trainer_email: string;
  batch_id: number | null;
  batch_name: string;
  class_id: number | null;
  class_sequence: number | null;
  class_starts_at: string | null;
  date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at: string | null;
}

function TrainerLeaves() {
  const leaves = useApi<{ items: ManagerLeaveRow[] }>('/manager/leaves');
  const change = useChange(leaves.reload);

  const pendingCount = (leaves.data?.items ?? []).filter(l => l.status === 'pending').length;
  const approvedCount = (leaves.data?.items ?? []).filter(l => l.status === 'approved').length;

  return (
    <>
      <PageHead
        title="Trainer Leave Requests"
        text="Review leave requests submitted by trainers. Approve or reject requests and reschedule affected class sessions."
      />
      <ErrorNotice error={leaves.error} />
      <ErrorNotice error={change.error} />
      {change.message && <Notice tone="success">{change.message}</Notice>}

      <div className="p-stats">
        <Stat label="Pending Requests" value={pendingCount} />
        <Stat label="Approved Leaves" value={approvedCount} />
        <Stat label="Total Requests" value={leaves.data?.items?.length ?? 0} />
      </div>

      <Card title="Leave Requests">
        <Table
          head={['Trainer', 'Batch / Scope', 'Leave Date', 'Reason', 'Requested At', 'Status', 'Actions']}
          rows={(leaves.data?.items ?? []).map(l => [
            <div key="t">
              <strong>{l.trainer_name}</strong>
              <div className="p-muted">{l.trainer_email}</div>
            </div>,
            l.batch_name,
            fmtDate(l.date),
            l.reason,
            fmtDateTime(l.created_at),
            <StatusChip
              key="s"
              text={l.status.toUpperCase()}
              tone={l.status === 'approved' ? 'good' : l.status === 'rejected' ? 'bad' : 'warn'}
            />,
            <div key="act" className="p-row" style={{ gap: 6 }}>
              {l.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="p-btn p-btn-small"
                    style={{ background: '#059669', borderColor: '#059669', color: '#fff' }}
                    disabled={change.busy}
                    onClick={() =>
                      change.run(
                        () => api(`/manager/leaves/${l.id}/approve`, { method: 'POST' }),
                        `Leave request for ${l.trainer_name} approved.`,
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-small p-btn-danger"
                    disabled={change.busy}
                    onClick={() =>
                      change.run(
                        () => api(`/manager/leaves/${l.id}/reject`, { method: 'POST' }),
                        `Leave request for ${l.trainer_name} rejected.`,
                      )
                    }
                  >
                    Reject
                  </button>
                </>
              )}
              {l.batch_id && (
                <Link
                  to={`/manager/batches/${l.batch_id}`}
                  className="p-btn p-btn-ghost p-btn-small"
                  title="Open batch to reschedule classes"
                >
                  Reschedule Classes →
                </Link>
              )}
            </div>,
          ])}
          empty="No trainer leave requests submitted."
        />
      </Card>
    </>
  );
}

export default function ManagerPanel() {
  return (
    <PanelFrame role="manager" brand="Manager" items={NAV}>
      {me => (
        <Routes>
          <Route index element={<Overview me={me} />} />
          <Route path="programmes" element={<Programmes />} />
          <Route path="batches" element={<Batches />} />
          <Route path="batches/:batchId" element={<BatchDetail />} />
          <Route path="students" element={<Students />} />
          <Route path="leaves" element={<TrainerLeaves />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="coursework" element={<TasksOverview />} />
          <Route path="tasks" element={<TasksOverview />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
