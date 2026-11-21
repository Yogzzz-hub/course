import { useState, type FormEvent } from 'react';
import { Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, StatusChip, Table, fieldErrors, fmtDateTime } from '../ui';
import { Spinner } from '../../components/loading/Loaders';

const NAV: NavItem[] = [
  { to: '/admin/overview', label: 'Overview' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/audit-log', label: 'Audit log' },
];
const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'trainer', label: 'Trainer' },
  { value: 'manager', label: 'Manager' },
  { value: 'financier', label: 'Financier' },
  { value: 'admin', label: 'Admin' },
];

interface UserRow { id: number; name: string; email: string; phone: string; status: string; roles: string[] }

function Overview() {
  const { data, error } = useApi<{ users_by_role: Record<string, number>; enrolments_by_status: Record<string, number>; batches: number }>('/admin/overview');
  return (
    <>
      <PageHead title="Overview" text="Accounts and enrolments across the academy." />
      <ErrorNotice error={error} />
      <div className="p-stats">
        {data && Object.entries(data.users_by_role).map(([role, count]) => <Stat key={role} label={role.replace('_', ' ')} value={count} />)}
        {data && Object.entries(data.enrolments_by_status).map(([status, count]) => <Stat key={status} label={`Enrolments: ${status.replace('_', ' ')}`} value={count} />)}
        <Stat label="Batches" value={data?.batches} />
      </div>
    </>
  );
}

function Users() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const path = `/admin/users?${role ? `role=${role}&` : ''}${q ? `q=${encodeURIComponent(q)}` : ''}`;
  const list = useApi<{ items: UserRow[] }>(path);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [roles, setRoles] = useState<string[]>(['trainer']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const result = await api<{ temporary_password: string }>('/admin/users', { body: { ...form, roles } });
      setCreated({ email: form.email, password: result.temporary_password });
      setForm({ name: '', email: '', phone: '' });
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(user: UserRow, status: string) {
    setError(null);
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: { status } });
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    }
  }

  const fe = fieldErrors(error);
  return (
    <>
      <PageHead title="Users" text="Create staff and student accounts. The super admin grants the super admin role." />
      <Card title="Add a user">
        <ErrorNotice error={error} />
        {created && <Notice tone="success">Account created for {created.email}. Temporary password (shown once, share it privately): <strong>{created.password}</strong></Notice>}
        <form onSubmit={create} className="p-form-grid">
          <Field label="Full name" error={fe.name}><input className="p-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email" error={fe.email}><input className="p-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><input className="p-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Roles" error={fe.roles}>
            <div className="p-row">
              {ROLE_OPTIONS.map(option => (
                <label key={option.value} className="p-row" style={{ gap: 4 }}>
                  <input type="checkbox" checked={roles.includes(option.value)} onChange={e => setRoles(current => e.target.checked ? [...current, option.value] : current.filter(r => r !== option.value))} />
                  {option.label}
                </label>
              ))}
            </div>
          </Field>
          <div className="span-2"><button className="p-btn" type="submit" disabled={busy || roles.length === 0}>{busy ? <><Spinner />Creating…</> : 'Create account'}</button></div>
        </form>
      </Card>
      <Card title="Everyone">
        <div className="p-row" style={{ marginBottom: 12 }}>
          <select className="p-select" value={role} onChange={e => setRole(e.target.value)} aria-label="Filter by role">
            <option value="">All roles</option>
            {ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input className="p-input" placeholder="Search name or email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
        </div>
        <ErrorNotice error={list.error} />
        <Table
          head={['Name', 'Email', 'Roles', 'Status', '']}
          rows={(list.data?.items ?? []).map(u => [
            u.name,
            u.email,
            u.roles.join(', ') || '—',
            <StatusChip key="s" text={u.status} tone={u.status === 'active' ? 'good' : 'bad'} />,
            u.roles.includes('super_admin') ? '' : (
              <button key="b" type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => setStatus(u, u.status === 'active' ? 'disabled' : 'active')}>
                {u.status === 'active' ? 'Disable' : 'Enable'}
              </button>
            ),
          ])}
          empty="No accounts match."
        />
      </Card>
    </>
  );
}

function AuditLog() {
  const list = useApi<{ items: { at: string; actor: string; action: string; entity: string; entity_id: string }[] }>('/admin/audit-log?limit=200');
  return (
    <>
      <PageHead title="Audit log" text="Who changed what, and when. Nothing here can be edited." />
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

export default function AdminPanel() {
  return (
    <PanelFrame role="admin" brand="Admin" items={NAV}>
      {() => (
        <Routes>
          <Route index element={<Overview />} />
          <Route path="overview" element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
