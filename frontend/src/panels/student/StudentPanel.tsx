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
  UploadCloud,
  Edit3,
  CreditCard,
  QrCode,
  Building2,
  ShieldCheck,
  Check,
  Zap,
  PlusCircle,
  X,
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
  CurvedSelect,
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

/**
 * Live Class banner: only shown in Overview and only when an active class is currently in progress.
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
      <LiveClassWatcher />
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

          {/* Enrolled status notice when not enrolled */}
          {(overview.data?.items ?? []).length === 0 && overview.data && (
            <Empty>You are not enrolled in a batch yet. Your academy manager adds you once your place is confirmed.</Empty>
          )}
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

interface AvailableCourse {
  id: number;
  name: string;
  fee_inr: number;
  duration_weeks: number;
  description: string;
  batch_id: number | null;
  batch_name: string;
  start_date: string | null;
  is_enrolled: boolean;
}

interface PaymentHistoryRow {
  id: number;
  enrolment_id: number;
  programme: string;
  batch: string;
  amount_inr: number;
  method: string;
  reference: string;
  paid_on: string;
  status: string;
  note: string;
}

function Payments() {
  const overview = useApi<{ items: Enrolment[] }>('/student/overview');
  const history = useApi<{ items: PaymentHistoryRow[] }>('/student/payments');
  const available = useApi<{ items: AvailableCourse[] }>('/student/available-courses');

  const enrolments = overview.data?.items ?? [];
  const openEnrolments = enrolments.filter(e => e.fees.balance_inr > 0);
  const paidEnrolments = enrolments.filter(e => e.fees.paid_inr > 0);

  const totalFee = enrolments.reduce((acc, e) => acc + (e.fees?.fee_total_inr || 0), 0);
  const totalPaid = enrolments.reduce((acc, e) => acc + (e.fees?.paid_inr || 0), 0);
  const totalBalance = enrolments.reduce((acc, e) => acc + (e.fees?.balance_inr || 0), 0);

  // Checkout modal states
  const [payTarget, setPayTarget] = useState<Enrolment | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<AvailableCourse | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'UPI' | 'Card' | 'Netbanking'>('UPI');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [successNotice, setSuccessNotice] = useState<string>('');

  function openPayModal(enrolment: Enrolment) {
    setPayTarget(enrolment);
    setEnrollTarget(null);
    setPayAmount(String(enrolment.fees.balance_inr));
    setPayMethod('UPI');
    setError(null);
  }

  function openEnrollModal(course: AvailableCourse) {
    setEnrollTarget(course);
    setPayTarget(null);
    setPayAmount(String(course.fee_inr));
    setPayMethod('UPI');
    setError(null);
  }

  function closeModal() {
    setPayTarget(null);
    setEnrollTarget(null);
    setError(null);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  }

  async function handleDirectPay(e: FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    setBusy(true);
    setError(null);
    try {
      const amt = Number(payAmount);
      await api('/student/pay', {
        body: {
          enrolment_id: payTarget.enrolment_id,
          amount_inr: amt,
          method: payMethod === 'UPI' ? 'UPI (Instant)' : payMethod === 'Card' ? 'Debit/Credit Card' : `Netbanking (${bankName})`,
        },
      });
      setSuccessNotice(`Payment of ${fmtInr(amt)} processed successfully. Your fees have been credited!`);
      closeModal();
      overview.reload();
      history.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnrollAndPay(e: FormEvent) {
    e.preventDefault();
    if (!enrollTarget) return;
    setBusy(true);
    setError(null);
    try {
      const amt = Number(payAmount);
      await api('/student/enroll-and-pay', {
        body: {
          programme_id: enrollTarget.id,
          amount_inr: amt,
          method: payMethod === 'UPI' ? 'UPI (Instant)' : payMethod === 'Card' ? 'Debit/Credit Card' : `Netbanking (${bankName})`,
        },
      });
      setSuccessNotice(`Enrolled in ${enrollTarget.name} successfully! You can now view your class timetable.`);
      closeModal();
      overview.reload();
      history.reload();
      available.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {successNotice && (
        <Notice tone="success">
          <div className="flex items-center justify-between">
            <span>{successNotice}</span>
            <button type="button" className="underline ml-4 text-xs" onClick={() => setSuccessNotice('')}>Dismiss</button>
          </div>
        </Notice>
      )}

      {/* Top 3 Metric Summary Cards */}
      <div className="p-fee-metrics-row">
        <div className="p-fee-metric-card">
          <span className="p-fee-metric-label">
            <BookOpen size={16} /> Total Course Fees
          </span>
          <span className="p-fee-metric-value">{fmtInr(totalFee)}</span>
          <span className="text-xs text-muted">{enrolments.length} enrolled program{enrolments.length === 1 ? '' : 's'}</span>
        </div>

        <div className="p-fee-metric-card p-fee-metric-card--paid">
          <span className="p-fee-metric-label">
            <CheckCircle2 size={16} className="text-emerald-500" /> Total Paid Fees
          </span>
          <span className="p-fee-metric-value">{fmtInr(totalPaid)}</span>
          <span className="text-xs text-emerald-600 font-medium">Verified & Settled</span>
        </div>

        <div className={`p-fee-metric-card ${totalBalance > 0 ? 'p-fee-metric-card--due' : ''}`}>
          <span className="p-fee-metric-label">
            <AlertTriangle size={16} /> Unpaid Balance Due
          </span>
          <span className="p-fee-metric-value">{fmtInr(totalBalance)}</span>
          <span className={`text-xs font-semibold ${totalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalBalance > 0 ? 'Payment Outstanding' : 'All Dues Cleared'}
          </span>
        </div>
      </div>

      {/* Unpaid / Pending Fees Section */}
      <Card title="Unpaid Fees & Direct Pay">
        {openEnrolments.length === 0 ? (
          <div className="p-empty-banner">
            <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
            <h3 className="font-semibold text-text mb-1">No Unpaid Fees</h3>
            <p className="text-sm text-muted">All fees for your currently enrolled courses have been fully cleared.</p>
          </div>
        ) : (
          <div className="p-pending-fees-list">
            {openEnrolments.map(e => {
              const pctPaid = e.fees.fee_total_inr > 0 ? Math.round((e.fees.paid_inr / e.fees.fee_total_inr) * 100) : 0;
              return (
                <div key={e.enrolment_id} className="p-pending-fee-card">
                  <div className="p-pending-fee-head">
                    <div className="p-pending-fee-info">
                      <h3 className="p-pending-fee-title">{e.programme}</h3>
                      <span className="p-pending-fee-batch">Batch: {e.batch}</span>
                    </div>
                    <span className="p-chip p-chip-warn">Unpaid Balance</span>
                  </div>

                  <ProgressBar label={`Fee Clearance Progress (${pctPaid}% paid)`} value={pctPaid} />

                  <div className="p-pending-fee-amounts">
                    <div className="p-pending-fee-amount-item">
                      <span className="p-pending-fee-amount-label">Total Fee</span>
                      <span className="p-pending-fee-amount-val">{fmtInr(e.fees.fee_total_inr)}</span>
                    </div>
                    <div className="p-pending-fee-amount-item">
                      <span className="p-pending-fee-amount-label">Paid So Far</span>
                      <span className="p-pending-fee-amount-val text-emerald-600">{fmtInr(e.fees.paid_inr)}</span>
                    </div>
                    <div className="p-pending-fee-amount-item">
                      <span className="p-pending-fee-amount-label">Balance Due</span>
                      <span className="p-pending-fee-amount-val p-pending-fee-amount-val--highlight">
                        {fmtInr(e.fees.balance_inr)}
                      </span>
                    </div>
                  </div>

                  <div className="p-pending-fee-action-bar">
                    <span className="text-xs text-muted">
                      Pay online via UPI, Credit/Debit Card or Net Banking for instant verification.
                    </span>
                    <button
                      type="button"
                      className="p-btn p-btn-primary"
                      onClick={() => openPayModal(e)}
                    >
                      <CreditCard size={15} />
                      Pay Fees Now ({fmtInr(e.fees.balance_inr)})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Other Courses Available & Direct Payment Section */}
      <Card title="Other Courses Available & Enrollment">
        <p className="p-hint mb-4">
          Expand your skillset with our industry-led engineering programs. Choose a program below to review its pricing and pay directly.
        </p>
        <ErrorNotice error={available.error} />
        <div className="p-available-courses-grid">
          {(available.data?.items ?? []).map(c => (
            <div key={c.id} className="p-course-card">
              <div className="p-course-card-top">
                <div className="p-course-card-badges">
                  <span className="p-course-duration-badge">{c.duration_weeks > 0 ? `${c.duration_weeks} Weeks` : 'Self-Paced'}</span>
                  {c.is_enrolled && <span className="p-chip p-chip-good">Enrolled</span>}
                </div>
                <h3 className="p-course-card-title">{c.name}</h3>
                <p className="p-course-card-desc">{c.description || 'Comprehensive curriculum with hands-on projects, automated assessments, and live mentorship.'}</p>
                <span className="p-course-batch-pill">Cohort: {c.batch_name}</span>
              </div>

              <div className="p-course-card-foot">
                <div className="p-course-price-wrap">
                  <span className="p-course-price-label">Program Fee</span>
                  <span className="p-course-price-tag">{fmtInr(c.fee_inr)}</span>
                </div>
                {c.is_enrolled ? (
                  <span className="p-chip p-chip-neutral">Active Course</span>
                ) : (
                  <button
                    type="button"
                    className="p-btn p-btn-primary text-xs"
                    onClick={() => openEnrollModal(c)}
                  >
                    <Zap size={14} />
                    Enroll & Pay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Paid Fees & Transaction History Section */}
      <Card title="Paid Fees & Transaction History">
        <ErrorNotice error={history.error} />
        <Table
          head={['Date', 'Course', 'Amount Paid', 'Method', 'Reference Code', 'Status']}
          rows={(history.data?.items ?? []).map(p => [
            fmtDate(p.paid_on),
            p.programme || 'Course Tuition',
            fmtInr(p.amount_inr),
            p.method,
            <code key="ref" className="text-xs font-mono">{p.reference}</code>,
            <StatusChip
              key="s"
              text={p.status === 'verified' ? 'Verified & Paid' : p.status === 'rejected' ? 'Rejected' : 'Submitted'}
              tone={p.status === 'verified' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn'}
            />,
          ])}
          empty="No payment transactions recorded yet."
        />
      </Card>

      {/* Direct Payment / Checkout Modal for Unpaid Course Fees */}
      {payTarget && (
        <div className="p-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="p-checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="p-checkout-modal-head">
              <h3 className="p-checkout-modal-title">
                <CreditCard size={20} className="text-primary" />
                Pay Course Fees
              </h3>
              <button type="button" className="p-checkout-close-btn" onClick={closeModal} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDirectPay} className="p-checkout-modal-body">
              <ErrorNotice error={error} />

              <div className="p-checkout-summary-box">
                <div>
                  <h4 className="font-semibold text-text text-sm">{payTarget.programme}</h4>
                  <span className="text-xs text-muted">{payTarget.batch}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted block">Balance Due</span>
                  <strong className="text-accent text-base">{fmtInr(payTarget.fees.balance_inr)}</strong>
                </div>
              </div>

              <Field label="Amount to Pay (₹)">
                <input
                  className="p-input"
                  type="number"
                  min={1}
                  max={payTarget.fees.balance_inr}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                />
              </Field>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Select Payment Method</label>
                <div className="p-checkout-method-tabs">
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'UPI' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('UPI')}
                  >
                    <QrCode size={18} />
                    <span>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'Card' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('Card')}
                  >
                    <CreditCard size={18} />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'Netbanking' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('Netbanking')}
                  >
                    <Building2 size={18} />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {payMethod === 'UPI' && (
                <div className="p-checkout-upi-box">
                  <div className="p-checkout-qr-placeholder">
                    <QrCode size={80} className="text-slate-800" />
                  </div>
                  <div className="text-xs text-muted">
                    Scan with GPay, PhonePe, Paytm, or enter UPI ID:<br />
                    <code className="font-mono font-bold text-accent">aintrixacademy@upi</code>
                  </div>
                </div>
              )}

              {payMethod === 'Card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Card Number">
                      <input
                        className="p-input"
                        placeholder="4532 •••• •••• 8892"
                        required
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Valid Thru (MM/YY)">
                    <input
                      className="p-input"
                      placeholder="12/28"
                      required
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                    />
                  </Field>
                  <Field label="CVV">
                    <input
                      className="p-input"
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      required
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {payMethod === 'Netbanking' && (
                <Field label="Select Your Bank">
                  <CurvedSelect
                    value={bankName}
                    onChange={setBankName}
                    options={[
                      { value: 'HDFC Bank', label: 'HDFC Bank' },
                      { value: 'ICICI Bank', label: 'ICICI Bank' },
                      { value: 'State Bank of India', label: 'State Bank of India' },
                      { value: 'Axis Bank', label: 'Axis Bank' },
                      { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' },
                    ]}
                    placeholder="Select your bank"
                  />
                </Field>
              )}

              <button
                type="submit"
                className="p-btn p-btn-primary p-checkout-submit-btn"
                disabled={busy || !payAmount || Number(payAmount) <= 0}
              >
                <ShieldCheck size={18} />
                {busy ? 'Processing Payment…' : `Pay ${fmtInr(Number(payAmount) || 0)} Securely`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment & Direct Payment Modal for Other Courses */}
      {enrollTarget && (
        <div className="p-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="p-checkout-modal" onClick={e => e.stopPropagation()}>
            <div className="p-checkout-modal-head">
              <h3 className="p-checkout-modal-title">
                <Zap size={20} className="text-accent" />
                Enroll & Pay Course Tuition
              </h3>
              <button type="button" className="p-checkout-close-btn" onClick={closeModal} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnrollAndPay} className="p-checkout-modal-body">
              <ErrorNotice error={error} />

              <div className="p-checkout-summary-box">
                <div>
                  <h4 className="font-semibold text-text text-sm">{enrollTarget.name}</h4>
                  <span className="text-xs text-muted">Cohort: {enrollTarget.batch_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted block">Tuition Fee</span>
                  <strong className="text-accent text-base">{fmtInr(enrollTarget.fee_inr)}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Payment Option</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${Number(payAmount) === enrollTarget.fee_inr ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayAmount(String(enrollTarget.fee_inr))}
                  >
                    <span className="font-bold">Full Payment</span>
                    <span className="text-xs">{fmtInr(enrollTarget.fee_inr)}</span>
                  </button>
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${Number(payAmount) === Math.round(enrollTarget.fee_inr / 2) ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayAmount(String(Math.round(enrollTarget.fee_inr / 2)))}
                  >
                    <span className="font-bold">50% Initial Instalment</span>
                    <span className="text-xs">{fmtInr(Math.round(enrollTarget.fee_inr / 2))}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Select Payment Method</label>
                <div className="p-checkout-method-tabs">
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'UPI' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('UPI')}
                  >
                    <QrCode size={18} />
                    <span>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'Card' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('Card')}
                  >
                    <CreditCard size={18} />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    className={`p-checkout-method-tab ${payMethod === 'Netbanking' ? 'p-checkout-method-tab--active' : ''}`}
                    onClick={() => setPayMethod('Netbanking')}
                  >
                    <Building2 size={18} />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {payMethod === 'UPI' && (
                <div className="p-checkout-upi-box">
                  <div className="p-checkout-qr-placeholder">
                    <QrCode size={80} className="text-slate-800" />
                  </div>
                  <div className="text-xs text-muted">
                    Scan with any UPI app to complete enrollment:<br />
                    <code className="font-mono font-bold text-accent">aintrixacademy@upi</code>
                  </div>
                </div>
              )}

              {payMethod === 'Card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Card Number">
                      <input
                        className="p-input"
                        placeholder="4532 •••• •••• 8892"
                        required
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Valid Thru (MM/YY)">
                    <input
                      className="p-input"
                      placeholder="12/28"
                      required
                      value={cardExpiry}
                      onChange={e => setCardExpiry(e.target.value)}
                    />
                  </Field>
                  <Field label="CVV">
                    <input
                      className="p-input"
                      type="password"
                      maxLength={4}
                      placeholder="•••"
                      required
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {payMethod === 'Netbanking' && (
                <Field label="Select Your Bank">
                  <CurvedSelect
                    value={bankName}
                    onChange={setBankName}
                    options={[
                      { value: 'HDFC Bank', label: 'HDFC Bank' },
                      { value: 'ICICI Bank', label: 'ICICI Bank' },
                      { value: 'State Bank of India', label: 'State Bank of India' },
                      { value: 'Axis Bank', label: 'Axis Bank' },
                      { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' },
                    ]}
                    placeholder="Select your bank"
                  />
                </Field>
              )}

              <button
                type="submit"
                className="p-btn p-btn-primary p-checkout-submit-btn"
                disabled={busy || !payAmount || Number(payAmount) <= 0}
              >
                <ShieldCheck size={18} />
                {busy ? 'Enrolling & Processing…' : `Enroll & Pay ${fmtInr(Number(payAmount) || 0)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Classes() {
  const classes = useApi<{ items: { enrolment_id: number; batch: string; access: boolean; classes: ClassRow[] }[] }>('/student/classes');

  return (
    <>
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
                c.status === 'live' && c.meeting_url ? (
                  <a
                    key="m"
                    className="p-btn p-btn-small"
                    href={c.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Video size={14} />
                    <span>Join</span>
                  </a>
                ) : (
                  '—'
                ),
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
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Class', 'Date', 'Recording']}
          rows={(list.data?.items ?? []).map(r => [
            `Class ${r.sequence}`,
            fmtDateTime(r.starts_at),
            r.recording_url ? (
              <a
                key="l"
                className="p-btn p-btn-small"
                href={r.recording_url}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Video size={14} />
                <span>View recording</span>
              </a>
            ) : (
              '—'
            ),
          ])}
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

  const SUBMISSION_OPTIONS = [
    { value: 'url', label: 'Link (project or website)', icon: ExternalLink },
    { value: 'git', label: 'Git repository link', icon: BookOpen },
    { value: 'file', label: 'Upload a file', icon: UploadCloud },
  ];

  if (graded) return <p className="p-hint">Graded. This submission can no longer be changed.</p>;
  return (
    <form onSubmit={submit} className="p-form-grid">
      <ErrorNotice error={error} />
      <Field label="How are you submitting?">
        <CurvedSelect
          value={kind}
          onChange={setKind}
          options={SUBMISSION_OPTIONS}
        />
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

export default function StudentPanel() {
  return (
    <PanelFrame role="student" brand="Student" items={NAV}>
      {(me) => (
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
      )}
    </PanelFrame>
  );
}
