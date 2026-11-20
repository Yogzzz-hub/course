import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { Card, Empty, ErrorNotice, Loading, PageHead, Stat, StatusChip, fmtDate, fmtInr } from '../ui';
import { PanelShell, useMe } from '../PanelShell';

export interface Overview {
  enquiries: number | null; registrations: number | null; sessionsBooked: number | null; sessionsHeld: number | null;
  plansSent: number | null; enrolments: number | null; collected: number | null; outstanding: number | null;
  alerts: { id: string; text: string; href: string }[];
}
export interface LeadRow { id: string; name: string; email: string; programme: string | null; status: string; owner: string | null; source: string | null; nextFollowUpAt: string | null }
export interface LeadDetail { lead: LeadRow & { phone: string | null; lostReason: string | null }; timeline: { id: string; type: string; body: string; actor: string; at: string }[] }
export interface PaymentRow { id: string; learner: string; amount: number; method: string; status: string; capturedAt: string | null; source: string }
export interface AuditRow { id: string; actor: string; action: string; entity: string; at: string }

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'REGISTERED', 'SESSION_BOOKED', 'SESSION_COMPLETED', 'NO_SHOW', 'OFFER_SENT', 'PAYMENT_PENDING', 'WON', 'NURTURE', 'LOST'];

const navItems = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/audit-log', label: 'Audit log' },
];

/** Staff operations console (spec §19). The server checks every role on every request. */
export default function AdminPanel() {
  const { data: me, error, unauthorised, loading } = useMe();
  if (unauthorised) return <Navigate to="/login?next=/admin/overview" replace />;
  return (
    <PanelShell brand="Academy Admin" items={navItems} me={me}>
      {loading && <Loading />}
      {error && !unauthorised && <ErrorNotice error={error} />}
      <Routes>
        <Route path="overview" element={<OverviewPage />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:leadId" element={<LeadDetailPage />} />
        <Route path="payments" element={<Payments />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Routes>
    </PanelShell>
  );
}

function OverviewPage() {
  const { data, error, loading, reload } = useApi<Overview>('/admin/overview');
  return (
    <>
      <PageHead title="Overview" description="The funnel, money and alerts for this period. A dash means there is not enough data yet." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="p-stats">
            <Stat label="Enquiries" value={data.enquiries} />
            <Stat label="Registrations" value={data.registrations} />
            <Stat label="Sessions booked" value={data.sessionsBooked} />
            <Stat label="Sessions held" value={data.sessionsHeld} />
            <Stat label="Plans sent" value={data.plansSent} />
            <Stat label="Enrolments" value={data.enrolments} />
            <Stat label="Collected" value={data.collected === null ? null : fmtInr(data.collected)} />
            <Stat label="Outstanding" value={data.outstanding === null ? null : fmtInr(data.outstanding)} />
          </div>
          <Card title="Alerts">
            {data.alerts.length === 0 ? <Empty title="No alerts">Missed response windows, missing outcomes and failed payments show here.</Empty> : (
              <ul className="p-list">{data.alerts.map(a => <li key={a.id}><span>{a.text}</span><a className="p-btn p-btn-ghost" href={a.href}>Open</a></li>)}</ul>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function Leads() {
  const [status, setStatus] = useState<string>('');
  const path = `/admin/leads${status ? `?status=${status}` : ''}`;
  const { data, error, loading, reload } = useApi<LeadRow[]>(path);
  return (
    <>
      <PageHead title="Leads" description="Every enquiry and registration, with its owner and next follow-up." />
      <div className="p-tabs" role="group" aria-label="Filter by status">
        <button type="button" aria-pressed={status === ''} onClick={() => setStatus('')}>All</button>
        {LEAD_STATUSES.slice(0, 7).map(s => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s.replace(/_/g, ' ').toLowerCase()}</button>
        ))}
      </div>
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No leads here">Enquiries and registrations appear here as they come in.</Empty>}
      {data && data.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Programme</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Source</th><th scope="col">Next follow-up</th></tr></thead>
            <tbody>
              {data.map(lead => (
                <tr key={lead.id}>
                  <td><a href={`/admin/leads/${lead.id}`}>{lead.name}</a><br /><small className="p-muted">{lead.email}</small></td>
                  <td>{lead.programme ?? '—'}</td>
                  <td><StatusChip status={lead.status} /></td>
                  <td>{lead.owner ?? 'Unassigned'}</td>
                  <td>{lead.source ?? '—'}</td>
                  <td>{fmtDate(lead.nextFollowUpAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function LeadDetailPage() {
  const { leadId } = useParams();
  const { data, error, loading, reload } = useApi<LeadDetail>(leadId ? `/admin/leads/${leadId}` : null);
  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  async function changeStatus() {
    if (!leadId || !nextStatus) return;
    setBusy(true);
    setNotice(null);
    try {
      await api(`/admin/leads/${leadId}`, { method: 'PATCH', body: { status: nextStatus, reason: reason || undefined } });
      setNotice({ tone: 'success', text: 'Status updated and recorded in the timeline.' });
      setNextStatus('');
      setReason('');
      reload();
    } catch (caught) {
      const e = caught as ApiError;
      setNotice({ tone: 'danger', text: e.code === 'NETWORK' ? 'The service is not connected yet, so nothing was changed.' : e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={data?.lead.name ?? 'Lead'} description={data ? `${data.lead.email}${data.lead.phone ? ` · ${data.lead.phone}` : ''}` : undefined} />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {notice && <p className={`p-alert p-alert-${notice.tone}`} role="status">{notice.text}</p>}
      {data && (
        <div className="p-grid">
          <Card title="Status">
            <p><StatusChip status={data.lead.status} /></p>
            <div className="p-field">
              <label htmlFor="new-status">Change status</label>
              <select id="new-status" className="p-select" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>
                <option value="">Keep as it is</option>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toLowerCase()}</option>)}
              </select>
            </div>
            {(nextStatus === 'LOST' || nextStatus === 'NURTURE') && (
              <div className="p-field">
                <label htmlFor="status-reason">Reason (required)</label>
                <input id="status-reason" className="p-input" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
            )}
            <button className="p-btn" disabled={!nextStatus || busy} onClick={changeStatus}>{busy ? 'Saving…' : 'Save status'}</button>
          </Card>
          <Card title="Timeline">
            {data.timeline.length === 0 ? <Empty title="No activity yet">Calls, emails, sessions and offers appear here.</Empty> : (
              <ul className="p-list">{data.timeline.map(item => <li key={item.id}><div><strong>{item.type.replace(/_/g, ' ')}</strong><small>{item.body}</small></div><small>{item.actor} · {fmtDate(item.at)}</small></li>)}</ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Payments() {
  const { data, error, loading, reload } = useApi<PaymentRow[]>('/admin/payments');
  return (
    <>
      <PageHead title="Payments & invoices" description="Captured payments, offline receipts and anything waiting for a second approval." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No payments yet">Payments appear here once the gateway confirms them.</Empty>}
      {data && data.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead><tr><th scope="col">Learner</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Source</th><th scope="col">Status</th><th scope="col">Captured</th></tr></thead>
            <tbody>{data.map(p => <tr key={p.id}><td>{p.learner}</td><td>{fmtInr(p.amount)}</td><td>{p.method}</td><td>{p.source}</td><td><StatusChip status={p.status} /></td><td>{fmtDate(p.capturedAt)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AuditLog() {
  const { data, error, loading, reload } = useApi<AuditRow[]>('/admin/audit-logs');
  return (
    <>
      <PageHead title="Audit log" description="A read-only record of sensitive actions: who did what, and when." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="Nothing recorded yet" />}
      {data && data.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">On</th></tr></thead>
            <tbody>{data.map(r => <tr key={r.id}><td>{fmtDate(r.at)}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.entity}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
