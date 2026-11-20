import { useState, type FormEvent } from 'react';
import { Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, StatusChip, Table, fieldErrors, fmtDate, fmtDateTime, fmtInr } from '../ui';

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

function Overview() {
  const { data, error } = useApi<Record<string, number>>('/finance/overview');
  return (
    <>
      <PageHead title="Overview" text="Money in, money out, and what students still owe." />
      <ErrorNotice error={error} />
      <div className="p-stats">
        <Stat label="Fees across the academy" value={fmtInr(data?.fees_total_inr)} />
        <Stat label="Income (verified)" value={fmtInr(data?.income_inr)} />
        <Stat label="Expenses" value={fmtInr(data?.expenses_inr)} />
        <Stat label="Net" value={fmtInr(data?.net_inr)} />
        <Stat label="Still outstanding" value={fmtInr(data?.outstanding_inr)} />
        <Stat label="Payments to verify" value={data?.payments_to_verify} />
      </div>
    </>
  );
}

function Payments() {
  const [status, setStatus] = useState('submitted');
  const list = useApi<{ items: PaymentRow[] }>(`/finance/payments?status=${status}`);
  const change = useChange(list.reload);
  const [notes, setNotes] = useState<Record<number, string>>({});

  return (
    <>
      <PageHead title="Payments" text="Check each payment against your bank statement, then verify it. Verified payments count towards the student's fees." />
      <Card>
        <div className="p-row" style={{ marginBottom: 12 }}>
          <select className="p-select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="submitted">To verify</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
        <ErrorNotice error={list.error} />
        <ErrorNotice error={change.error} />
        {change.message && <Notice tone="success">{change.message}</Notice>}
        <Table
          head={['Student', 'Batch', 'Amount', 'Method & reference', 'Paid on', 'Balance', 'Status', 'Decision']}
          rows={(list.data?.items ?? []).map(p => [
            <div key="n"><strong>{p.name}</strong><div className="p-muted">{p.email}</div></div>,
            p.batch,
            fmtInr(p.amount_inr),
            <div key="m">{p.method} · {p.reference}</div>,
            fmtDate(p.paid_on),
            p.balance_inr === null ? '—' : fmtInr(p.balance_inr),
            <StatusChip key="s" text={p.status} tone={p.status === 'verified' ? 'good' : p.status === 'rejected' ? 'bad' : 'warn'} />,
            p.status === 'submitted' ? (
              <div key="d" className="p-cards">
                <button type="button" className="p-btn p-btn-small" disabled={change.busy} onClick={() => change.run(() => api(`/finance/payments/${p.id}/verify`, { method: 'POST', body: { note: notes[p.id] ?? '' } }), 'Payment verified.')}>Verify</button>
                <input className="p-input" placeholder="Reason if rejecting" value={notes[p.id] ?? ''} onChange={e => setNotes({ ...notes, [p.id]: e.target.value })} aria-label="Reason for rejecting" />
                <button type="button" className="p-btn p-btn-ghost p-btn-small" disabled={change.busy || !(notes[p.id] ?? '').trim()} onClick={() => change.run(() => api(`/finance/payments/${p.id}/reject`, { method: 'POST', body: { note: notes[p.id] } }), 'Payment rejected. The student has been told why.')}>Reject</button>
              </div>
            ) : (
              p.note || '—'
            ),
          ])}
          empty="Nothing here right now."
        />
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
      {() => (
        <Routes>
          <Route index element={<Overview />} />
          <Route path="payments" element={<Payments />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
