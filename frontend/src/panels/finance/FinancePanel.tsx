import { useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  CreditCard,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
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
} from '../ui';

const NAV: NavItem[] = [
  { to: '/finance', label: 'Overview' },
  { to: '/finance/payments', label: 'Payments to verify' },
  { to: '/finance/expenses', label: 'Expenses' },
  { to: '/finance/ledger', label: 'Ledger' },
];

interface PaymentRow {
  id: number; name: string; email: string; batch: string; amount_inr: number; method: string; reference: string; paid_on: string;
  status: string; note: string; fee_total_inr: number | null; paid_inr: number | null; balance_inr: number | null;
}

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

function Overview({ me }: { me: Me }) {
  const { data, error } = useApi<Record<string, number>>('/finance/overview');

  const income = data?.income_inr ?? 0;
  const feesTotal = data?.fees_total_inr ?? 0;
  const expenses = data?.expenses_inr ?? 0;
  const net = data?.net_inr ?? 0;
  const outstanding = data?.outstanding_inr ?? 0;
  const toVerify = data?.payments_to_verify ?? 0;

  const collectionRate = feesTotal > 0 ? Math.min(100, Math.round((income / feesTotal) * 100)) : 100;

  const chartData = [
    { name: 'Verified', value: Math.round(income / 1000), secondary: fmtInr(income) },
    { name: 'Outstanding', value: Math.round(outstanding / 1000), secondary: fmtInr(outstanding) },
    { name: 'Expenses', value: Math.round(expenses / 1000), secondary: fmtInr(expenses) },
    { name: 'Net Cash', value: Math.max(0, Math.round(net / 1000)), secondary: fmtInr(net) },
  ];

  const activities: ActivityItem[] = [
    {
      id: 'income-verified',
      title: `${fmtInr(income)} total verified fee collections`,
      subtitle: 'Bank transactions confirmed and credited',
      time: 'Verified',
      icon: CheckCircle2,
      tone: 'green',
    },
    {
      id: 'to-verify',
      title: `${toVerify} payment submissions awaiting verification`,
      subtitle: 'Match against bank statement to activate access',
      time: 'Action',
      icon: Clock,
      tone: toVerify > 0 ? 'amber' : 'green',
    },
    {
      id: 'outstanding-dues',
      title: `${fmtInr(outstanding)} remaining student dues`,
      subtitle: 'Pending fee balance to be collected',
      time: 'Dues',
      icon: AlertCircle,
      tone: 'purple',
    },
    {
      id: 'finance-synced',
      title: 'Financial ledger synchronized',
      subtitle: me.email,
      time: 'Live',
      icon: ShieldCheck,
      tone: 'blue',
    },
  ];

  return (
    <>
      <WelcomeBanner
        name={me.name}
        role="Financier"
        message="Financial health overview: fee collections, pending verifications, and operating expenses."
      />
      <ErrorNotice error={error} />

      {/* Top Metric Overview Cards */}
      <div className="p-metric-grid">
        <MetricCard
          icon={Receipt}
          variant={1}
          label="Verified Income"
          value={fmtInr(income)}
          trend="+18.4% Collections"
          trendPositive={true}
        />
        <MetricCard
          icon={Clock}
          variant={2}
          label="Still Outstanding"
          value={fmtInr(outstanding)}
          trend="Pending balance"
          trendPositive={false}
        />
        <MetricCard
          icon={CreditCard}
          variant={3}
          label="Operating Expenses"
          value={fmtInr(expenses)}
          trend="Trainers, Tools, Rent"
          trendPositive={false}
        />
        <MetricCard
          icon={TrendingUp}
          variant={4}
          label="Net Position"
          value={fmtInr(net)}
          trend="Operating Surplus"
          trendPositive={net >= 0}
        />
      </div>

      {/* Main Split Layout */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <CourseEngagementChart
            title="Financial Breakdown (₹ in Thousands)"
            data={chartData}
            totalLabel="Total Academy Fee Value"
            totalValue={fmtInr(feesTotal)}
            trendText={`${collectionRate}% Collected`}
          />

          <div className="p-course-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">Fee Collection Ratio</h3>
                <p className="p-course-batch">Realized revenue vs academy total contracted fee value</p>
              </div>
              <span className="p-chip p-chip-good">{collectionRate}% Realized</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                label="Overall Fee Collection Rate"
                value={income}
                max={feesTotal || 1}
              />
            </div>
          </div>
        </div>

        <div className="p-dashboard-side">
          {toVerify > 0 && (
            <div className="p-live-beacon-card mb-4">
              <div className="p-live-pulse-badge">
                <Clock size={12} className="inline mr-1" />
                <span>Action Required</span>
              </div>
              <h3 className="p-live-title">{toVerify} payment{toVerify === 1 ? '' : 's'} awaiting review</h3>
              <p className="p-live-subtitle">Students have uploaded transfer references.</p>
              <Link to="/finance/payments" className="p-live-btn">
                Verify payments now
              </Link>
            </div>
          )}

          <ActivityTimeline title="Financial Ledger Activity" items={activities} />

          <div className="p-todo-card">
            <h3 className="p-todo-title">Finance Navigation</h3>
            <div className="p-todo-list">
              <Link to="/finance/payments" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Review and verify submitted payments</span>
              </Link>
              <Link to="/finance/expenses" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Record expense (trainers, tools, rent)</span>
              </Link>
              <Link to="/finance/ledger" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>View full financial ledger & audit trail</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Payments() {
  const [status, setStatus] = useState('submitted');
  const allList = useApi<{ items: PaymentRow[] }>('/finance/payments?status=all');
  const list = useApi<{ items: PaymentRow[] }>(`/finance/payments?status=${status}`);
  const change = useChange(() => {
    list.reload();
    allList.reload();
  });
  const [notes, setNotes] = useState<Record<number, string>>({});

  const allItems = allList.data?.items ?? [];
  const toVerifyCount = allItems.filter(p => p.status === 'submitted').length;
  const verifiedCount = allItems.filter(p => p.status === 'verified').length;
  const rejectedCount = allItems.filter(p => p.status === 'rejected').length;
  const totalCount = allItems.length;

  const currentItems = list.data?.items ?? [];

  return (
    <>
      <PageHead
        title="Payments"
        text="Check each payment against your bank statement, then verify it. Verified payments count towards the student's fees."
      />

      {/* Metric summary strip */}
      <div className="p-metric-grid" style={{ marginBottom: 20 }}>
        <MetricCard
          icon={Clock}
          variant={toVerifyCount > 0 ? 1 : 2}
          label="Pending Verification"
          value={`${toVerifyCount} Submissions`}
          trend={toVerifyCount > 0 ? 'Requires attention' : 'All clear'}
          trendPositive={toVerifyCount === 0}
        />
        <MetricCard
          icon={CheckCircle2}
          variant={2}
          label="Verified Payments"
          value={`${verifiedCount} Completed`}
          trend="Credited to student fees"
          trendPositive={true}
        />
        <MetricCard
          icon={CreditCard}
          variant={3}
          label="Total Payment Records"
          value={`${totalCount} Total`}
          trend={rejectedCount > 0 ? `${rejectedCount} rejected` : '0 rejected'}
          trendPositive={rejectedCount === 0}
        />
      </div>

      <Card>
        {/* Quick Filter Tabs with Live Badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {[
            { id: 'submitted', label: 'To verify', count: toVerifyCount },
            { id: 'verified', label: 'Verified', count: verifiedCount },
            { id: 'rejected', label: 'Rejected', count: rejectedCount },
            { id: 'all', label: 'All Payments', count: totalCount },
          ].map(tab => {
            const active = status === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: active ? '1.5px solid var(--accent)' : '1px solid var(--border-strong)',
                  background: active ? 'var(--accent)' : 'var(--surface-alt)',
                  color: active ? '#ffffff' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: active
                      ? 'rgba(255, 255, 255, 0.28)'
                      : 'color-mix(in srgb, var(--border) 80%, transparent)',
                    color: active ? '#ffffff' : 'var(--muted)',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <ErrorNotice error={list.error || allList.error} />
        <ErrorNotice error={change.error} />
        {change.message && <Notice tone="success">{change.message}</Notice>}

        {currentItems.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '42px 20px',
              background: 'var(--surface-alt)',
              borderRadius: 18,
              border: '1.5px dashed var(--border-strong)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
              {status === 'submitted' ? 'All payments are verified' : 'No payments found'}
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', maxWidth: 440 }}>
              {status === 'submitted'
                ? 'Great job! There are currently no student payments waiting for verification.'
                : `No payment records match the "${status}" status.`}
            </p>
            {verifiedCount > 0 && status !== 'verified' && (
              <button
                type="button"
                className="p-btn p-btn-small"
                style={{ marginTop: 10 }}
                onClick={() => setStatus('verified')}
              >
                View {verifiedCount} verified payment{verifiedCount === 1 ? '' : 's'} →
              </button>
            )}
          </div>
        ) : (
          <Table
            head={['Student', 'Batch', 'Amount', 'Method & reference', 'Paid on', 'Balance', 'Status', 'Decision']}
            rows={currentItems.map(p => [
              <div key="n">
                <strong>{p.name}</strong>
                <div className="p-muted">{p.email}</div>
              </div>,
              p.batch,
              fmtInr(p.amount_inr),
              <div key="m">
                {p.method} · {p.reference}
              </div>,
              fmtDate(p.paid_on),
              p.balance_inr === null ? '—' : fmtInr(p.balance_inr),
              <StatusChip
                key="s"
                text={p.status}
                tone={p.status === 'verified' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn'}
              />,
              p.status === 'submitted' ? (
                <div key="d" className="p-cards">
                  <button
                    type="button"
                    className="p-btn p-btn-small"
                    disabled={change.busy}
                    onClick={() =>
                      change.run(
                        () =>
                          api(`/finance/payments/${p.id}/verify`, {
                            method: 'POST',
                            body: { note: notes[p.id] ?? '' },
                          }),
                        'Payment verified.'
                      )
                    }
                  >
                    Verify
                  </button>
                  <input
                    className="p-input"
                    placeholder="Reason if rejecting"
                    value={notes[p.id] ?? ''}
                    onChange={e => setNotes({ ...notes, [p.id]: e.target.value })}
                    aria-label="Reason for rejecting"
                  />
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    disabled={change.busy || !(notes[p.id] ?? '').trim()}
                    onClick={() =>
                      change.run(
                        () =>
                          api(`/finance/payments/${p.id}/reject`, {
                            method: 'POST',
                            body: { note: notes[p.id] },
                          }),
                        'Payment rejected. The student has been told why.'
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              ) : (
                p.note || '—'
              ),
            ])}
            empty="No payments match this filter."
          />
        )}
      </Card>
    </>
  );
}

function Expenses() {
  const list = useApi<{ items: { id: number; category: string; description: string; amount_inr: number; spent_on: string }[] }>('/finance/expenses');
  const [form, setForm] = useState({ category: '', description: '', amount_inr: '', spent_on: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      await api('/finance/expenses', { body: { ...form, amount_inr: Number(form.amount_inr) } });
      setMessage('Expense recorded.');
      setForm({ category: '', description: '', amount_inr: '', spent_on: '' });
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
      <PageHead title="Expenses" text="Record money going out: trainers, tools, rent, marketing." />
      <Card title="Record an expense">
        <ErrorNotice error={error} />
        {message && <Notice tone="success">{message}</Notice>}
        <form onSubmit={submit} className="p-form-grid">
          <Field label="Category" error={fe.category}><input className="p-input" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Trainer payout" /></Field>
          <Field label="Amount (₹)" error={fe.amount_inr}><input className="p-input" type="number" min={1} required value={form.amount_inr} onChange={e => setForm({ ...form, amount_inr: e.target.value })} /></Field>
          <Field label="Date" error={fe.spent_on}><input className="p-input" type="date" required value={form.spent_on} onChange={e => setForm({ ...form, spent_on: e.target.value })} /></Field>
          <Field label="Note"><input className="p-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="span-2"><button className="p-btn" type="submit" disabled={busy}>Record expense</button></div>
        </form>
      </Card>
      <Card title="Expenses">
        <ErrorNotice error={list.error} />
        <Table
          head={['Date', 'Category', 'Note', 'Amount']}
          rows={(list.data?.items ?? []).map(e => [fmtDate(e.spent_on), e.category, e.description || '—', fmtInr(e.amount_inr)])}
          empty="No expenses recorded yet."
        />
      </Card>
    </>
  );
}

function Ledger() {
  const list = useApi<{ items: { date: string; kind: string; description: string; amount_inr: number; balance_inr: number }[] }>('/finance/ledger');
  return (
    <>
      <PageHead title="Ledger" text="Every income and outflow in date order, with the running balance." />
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Date', 'Type', 'Description', 'Amount', 'Balance']}
          rows={(list.data?.items ?? []).map(r => [
            fmtDate(r.date),
            <StatusChip key="t" text={r.kind === 'income' ? 'In' : 'Out'} tone={r.kind === 'income' ? 'good' : 'warn'} />,
            r.description,
            fmtInr(r.amount_inr),
            fmtInr(r.balance_inr),
          ])}
          empty="No income or expenses yet."
        />
      </Card>
    </>
  );
}

export default function FinancePanel() {
  return (
    <PanelFrame role="financier" brand="Finance" items={NAV}>
      {me => (
        <Routes>
          <Route index element={<Overview me={me} />} />
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
