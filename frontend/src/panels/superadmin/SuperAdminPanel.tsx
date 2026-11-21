import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { RolesAccess } from './RolesAccess';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, Table, fmtDateTime } from '../ui';

const NAV: NavItem[] = [
  { to: '/superadmin', label: 'Overview' },
  { to: '/superadmin/roles', label: 'Roles & access' },
  { to: '/superadmin/settings', label: 'Settings' },
  { to: '/superadmin/audit-log', label: 'Audit log' },
  { to: '/superadmin/panels', label: 'Open any panel' },
];

function Overview() {
  const { data, error } = useApi<{ users: number; batches: number; enrolments: number; verified_income_inr: number }>('/superadmin/overview');
  return (
    <>
      <PageHead title="Super admin" text="Full control: roles, settings, every panel and the complete audit trail." />
      <ErrorNotice error={error} />
      <div className="p-stats">
        <Stat label="Accounts" value={data?.users} />
        <Stat label="Batches" value={data?.batches} />
        <Stat label="Enrolments" value={data?.enrolments} />
        <Stat label="Verified income" value={data ? `₹${data.verified_income_inr.toLocaleString('en-IN')}` : null} />
      </div>
    </>
  );
}

function Settings() {
  const current = useApi<{ attendance_threshold_percent: number; require_fees_cleared: boolean; academy_name: string; payment_instructions: string }>('/superadmin/settings');
  const [draft, setDraft] = useState<Partial<NonNullable<typeof current.data>>>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');
  const values = { ...current.data, ...draft } as NonNullable<typeof current.data>;

  async function save() {
    setError(null);
    setMessage('');
    try {
      await api('/superadmin/settings', { method: 'PUT', body: values });
      setDraft({});
      setMessage('Settings saved.');
      current.reload();
    } catch (caught) {
      setError(caught as ApiError);
    }
  }

  if (!current.data) return <ErrorNotice error={current.error} />;
  return (
    <>
      <PageHead title="Settings" text="Rules that apply across the academy." />
      <Card>
        <ErrorNotice error={error} />
        {message && <Notice tone="success">{message}</Notice>}
        <div className="p-form-grid">
          <Field label="Attendance needed to count a class (%)" hint="A student attends a class when connected for at least this share of its length.">
            <input className="p-input" type="number" min={1} max={100} value={values.attendance_threshold_percent} onChange={e => setDraft({ ...draft, attendance_threshold_percent: Number(e.target.value) })} />
          </Field>
          <Field label="Certificates need all fees paid">
            <label className="p-row"><input type="checkbox" checked={values.require_fees_cleared} onChange={e => setDraft({ ...draft, require_fees_cleared: e.target.checked })} /> Yes, fees must be cleared</label>
          </Field>
          <Field label="Academy name"><input className="p-input" value={values.academy_name} onChange={e => setDraft({ ...draft, academy_name: e.target.value })} /></Field>
          <Field label="Payment instructions" hint="Shown to students on their fee page before they pay. Leave empty until finance is ready.">
            <textarea className="p-textarea" rows={4} value={values.payment_instructions} onChange={e => setDraft({ ...draft, payment_instructions: e.target.value })} />
          </Field>
        </div>
        <div className="p-row" style={{ marginTop: 12 }}>
          <button className="p-btn" type="button" onClick={save} disabled={Object.keys(draft).length === 0}>Save settings</button>
        </div>
      </Card>
    </>
  );
}

function AuditLog() {
  const list = useApi<{ items: { at: string; actor: string; action: string; entity: string; entity_id: string }[] }>('/superadmin/audit-log?limit=300');
  return (
    <>
      <PageHead title="Audit log" text="Every change on the platform, in order." />
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['When', 'Who', 'Action', 'Record']}
          rows={(list.data?.items ?? []).map(a => [fmtDateTime(a.at), a.actor, a.action, `${a.entity} #${a.entity_id}`])}
          empty="No activity yet."
        />
      </Card>
    </>
  );
}

function Panels() {
  const links = [
    { to: '/manager', label: 'Manager' },
    { to: '/trainer', label: 'Trainer' },
    { to: '/finance', label: 'Financier' },
    { to: '/admin/overview', label: 'Admin' },
    { to: '/app', label: 'Student' },
  ];
  return (
    <>
      <PageHead title="Open any panel" text="As super admin you can open every panel to check exactly what each role sees." />
      <Card>
        <div className="p-row">
          {links.map(link => <Link key={link.to} className="p-btn" to={link.to}>{link.label}</Link>)}
        </div>
      </Card>
    </>
  );
}

export default function SuperAdminPanel() {
  return (
    <PanelFrame role="super_admin" brand="Super admin" items={NAV}>
      {() => (
        <Routes>
          <Route index element={<Overview />} />
          <Route path="roles" element={<RolesAccess />} />
          <Route path="settings" element={<Settings />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="panels" element={<Panels />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
