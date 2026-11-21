import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  Layers,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem, type Me } from '../PanelShell';
import { AuditLogView } from '../AuditLogView';
import { RolesAccess } from './RolesAccess';
import './superadmin-mobile.css';
import { SettingsPage } from './SettingsPage';
import {
  Card,
  Empty,
  ErrorNotice,
  Field,
  Notice,
  PageHead,
  Stat,
  Table,
  fmtDateTime,
  WelcomeBanner,
  MetricCard,
  CourseEngagementChart,
  ActivityTimeline,
  type ActivityItem,
} from '../ui';

const NAV: NavItem[] = [
  { to: '/superadmin', label: 'Overview' },
  { to: '/superadmin/roles', label: 'Roles & access' },
  { to: '/superadmin/settings', label: 'Settings' },
  { to: '/superadmin/audit-log', label: 'Audit log' },
  { to: '/superadmin/panels', label: 'Open any panel' },
];
const ROLE_OPTIONS = ['super_admin', 'admin', 'manager', 'financier', 'trainer', 'student'];

interface UserRow { id: number; name: string; email: string; status: string; roles: string[] }

function Overview({ me }: { me: Me }) {
  const { data, error } = useApi<{
    users: number;
    batches: number;
    enrolments: number;
    verified_income_inr: number;
  }>('/superadmin/overview');

  const chartData = [
    { name: 'Accounts', value: data?.users ?? 0, secondary: 'Total users' },
    { name: 'Batches', value: data?.batches ?? 0, secondary: 'Active batches' },
    { name: 'Enrolments', value: data?.enrolments ?? 0, secondary: 'Active students' },
    { name: 'Revenue (k)', value: Math.round((data?.verified_income_inr ?? 0) / 1000), secondary: `₹${((data?.verified_income_inr ?? 0) / 1000).toFixed(0)}k verified` },
  ];

  const activities: ActivityItem[] = [
    {
      id: 'super-admin-active',
      title: 'Full platform governance active',
      subtitle: `Master session authenticated: ${me.email}`,
      time: 'Live',
      icon: ShieldCheck,
      tone: 'purple',
    },
    {
      id: 'batches-running',
      title: `${data?.batches ?? 0} batches operating across all programmes`,
      subtitle: 'Classes, timetables and attendance recorded',
      time: 'Running',
      icon: Layers,
      tone: 'blue',
    },
    {
      id: 'enrolments-total',
      title: `${data?.enrolments ?? 0} student enrolments actively monitored`,
      subtitle: 'Complete student lifecycle tracked',
      time: 'Tracked',
      icon: Users,
      tone: 'green',
    },
    {
      id: 'revenue-verified',
      title: `₹${(data?.verified_income_inr ?? 0).toLocaleString('en-IN')} verified total collections`,
      subtitle: 'Financial ledger reconciled',
      time: 'Verified',
      icon: CreditCard,
      tone: 'amber',
    },
  ];

  return (
    <>
      <WelcomeBanner
        name={me.name}
        role="Super Admin"
        message="Master academy console: complete role access, global platform settings, and live system audit."
      />
      <ErrorNotice error={error} />

      {/* Top Metric Overview Cards */}
      <div className="p-metric-grid">
        <MetricCard
          icon={Users}
          variant={1}
          label="Total Accounts"
          value={`${data?.users ?? 0} Users`}
          trend="All Roles"
          trendPositive={true}
        />
        <MetricCard
          icon={Layers}
          variant={2}
          label="Academy Batches"
          value={`${data?.batches ?? 0} Batches`}
          trend="Running"
          trendPositive={true}
        />
        <MetricCard
          icon={GraduationCap}
          variant={3}
          label="Enrolments"
          value={`${data?.enrolments ?? 0} Students`}
          trend="Active Lifecycle"
          trendPositive={true}
        />
        <MetricCard
          icon={CreditCard}
          variant={4}
          label="Verified Revenue"
          value={data ? `₹${data.verified_income_inr.toLocaleString('en-IN')}` : '—'}
          trend="Total Collections"
          trendPositive={true}
        />
      </div>

      {/* Main Split Layout */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <CourseEngagementChart
            title="Academy Platform Metrics"
            data={chartData}
            totalLabel="Verified Revenue Collected"
            totalValue={data ? `₹${data.verified_income_inr.toLocaleString('en-IN')}` : '—'}
            trendText="Platform Wide"
          />

          <div className="p-course-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">Portal Quick Launch</h3>
                <p className="p-course-batch">Access any panel with your Super Admin permissions</p>
              </div>
            </div>
            <div className="p-portal-links-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
              <Link to="/manager" className="p-btn p-btn-ghost text-left" style={{ display: 'block', padding: '12px 16px' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>Manager Portal</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Courses, batches & certs</span>
              </Link>
              <Link to="/trainer" className="p-btn p-btn-ghost text-left" style={{ display: 'block', padding: '12px 16px' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>Trainer Portal</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Classes & assignments</span>
              </Link>
              <Link to="/finance" className="p-btn p-btn-ghost text-left" style={{ display: 'block', padding: '12px 16px' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>Finance Portal</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Fees, payments & ledger</span>
              </Link>
              <Link to="/admin" className="p-btn p-btn-ghost text-left" style={{ display: 'block', padding: '12px 16px' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>Admin Portal</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Users & system audit</span>
              </Link>
              <Link to="/app" className="p-btn p-btn-ghost text-left" style={{ display: 'block', padding: '12px 16px' }}>
                <strong style={{ display: 'block', color: 'var(--text)' }}>Student Portal</strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Student learning view</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-dashboard-side">
          <ActivityTimeline title="Master Governance Feed" items={activities} />

          <div className="p-todo-card">
            <h3 className="p-todo-title">Super Admin Tools</h3>
            <div className="p-todo-list">
              <Link to="/superadmin/roles" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Manage roles and permission access</span>
              </Link>
              <Link to="/superadmin/settings" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Update academy-wide configuration rules</span>
              </Link>
              <Link to="/superadmin/audit-log" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Inspect complete master audit trail</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Roles() {
  const list = useApi<{ items: UserRow[] }>('/superadmin/users');
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState('');

  function rolesFor(user: UserRow): string[] {
    return draft[user.id] ?? user.roles;
  }

  function toggle(user: UserRow, role: string, checked: boolean) {
    const current = rolesFor(user);
    setDraft({ ...draft, [user.id]: checked ? [...current, role] : current.filter(r => r !== role) });
  }

  async function save(user: UserRow) {
    setError(null);
    setMessage('');
    try {
      await api(`/superadmin/users/${user.id}/roles`, { method: 'PUT', body: { roles: rolesFor(user) } });
      setMessage(`Roles saved for ${user.name}.`);
      setDraft(({ [user.id]: _saved, ...rest }) => rest);
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    }
  }

  return (
    <>
      <PageHead title="Roles & access" text="Grant or remove roles. A person can hold several roles at once." />
      <ErrorNotice error={error} />
      {message && <Notice tone="success">{message}</Notice>}
      <Card>
        <ErrorNotice error={list.error} />
        <Table
          head={['Name', 'Email', 'Roles', '']}
          rows={(list.data?.items ?? []).map(u => [
            u.name,
            u.email,
            <div key="r" className="p-row">
              {ROLE_OPTIONS.map(role => (
                <label key={role} className="p-row" style={{ gap: 4 }}>
                  <input type="checkbox" checked={rolesFor(u).includes(role)} onChange={e => toggle(u, role, e.target.checked)} />
                  {role.replace('_', ' ')}
                </label>
              ))}
            </div>,
            draft[u.id] ? <button key="b" type="button" className="p-btn p-btn-small" onClick={() => save(u)}>Save</button> : '',
          ])}
          empty="No accounts yet."
        />
      </Card>
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
    { to: '/manager', label: 'Manager', icon: Layers, desc: 'Programmes, batches, students & certificates', color: '#4f46e5' },
    { to: '/trainer', label: 'Trainer', icon: Users, desc: 'Classes, assignments, quizzes & tasks', color: '#0891b2' },
    { to: '/finance', label: 'Financier', icon: CreditCard, desc: 'Fee verification, expenses & ledger', color: '#059669' },
    { to: '/admin/overview', label: 'Admin', icon: ShieldCheck, desc: 'User accounts, roles & audit log', color: '#d97706' },
    { to: '/app', label: 'Student', icon: GraduationCap, desc: 'Student view: classes, fees & grades', color: '#7c3aed' },
  ];
  return (
    <>
      <PageHead title="Open any panel" text="As super admin you can open every panel to check exactly what each role sees." />
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: '24px 16px',
                borderRadius: 14,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              className="p-panel-link-card"
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${link.color}18`,
                  color: link.color,
                }}
              >
                <link.icon size={24} />
              </div>
              <strong style={{ fontSize: 15, color: 'var(--text)' }}>{link.label} Portal</strong>
              <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>{link.desc}</span>
              <span
                className="p-btn p-btn-small"
                style={{ marginTop: 4 }}
              >
                Open portal <ArrowRight size={12} style={{ marginLeft: 4 }} />
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function SuperAdminPanel() {
  return (
    <PanelFrame role="super_admin" brand="Super admin" items={NAV}>
      {me => (
        <Routes>
          <Route index element={<Overview me={me} />} />
          <Route path="roles" element={<RolesAccess />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-log" element={<AuditLogView />} />
          <Route path="panels" element={<Panels />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
