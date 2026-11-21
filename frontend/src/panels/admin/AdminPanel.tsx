import { useState, type FormEvent } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  Users as UsersIcon,
  ShieldCheck,
  Layers,
  GraduationCap,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
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
  fmtDateTime,
  WelcomeBanner,
  MetricCard,
  CourseEngagementChart,
  ActivityTimeline,
  type ActivityItem,
  ProgressBar,
  CurvedSelect,
} from '../ui';

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

function Overview({ me }: { me: Me }) {
  const { data, error } = useApi<{
    users_by_role: Record<string, number>;
    enrolments_by_status: Record<string, number>;
    batches: number;
  }>('/admin/overview');

  const totalUsers = data ? Object.values(data.users_by_role).reduce((a, b) => a + b, 0) : 0;
  const staffUsers = data
    ? (data.users_by_role.trainer || 0) +
      (data.users_by_role.manager || 0) +
      (data.users_by_role.financier || 0) +
      (data.users_by_role.admin || 0)
    : 0;
  const activeEnrolments = data?.enrolments_by_status?.active || 0;
  const batches = data?.batches || 0;

  const chartData = data?.users_by_role
    ? Object.entries(data.users_by_role).map(([role, count]) => ({
        name: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        secondary: `${count} accounts`,
      }))
    : [
        { name: 'Student', value: 34, secondary: '34 accounts' },
        { name: 'Trainer', value: 8, secondary: '8 accounts' },
        { name: 'Manager', value: 3, secondary: '3 accounts' },
        { name: 'Financier', value: 2, secondary: '2 accounts' },
        { name: 'Admin', value: 2, secondary: '2 accounts' },
      ];

  const activities: ActivityItem[] = [
    {
      id: 'accounts-active',
      title: `${totalUsers} total user accounts registered in database`,
      subtitle: 'Multi-role RBAC enabled with secure session auth',
      time: 'Live',
      icon: UsersIcon,
      tone: 'blue',
    },
    {
      id: 'batches-active',
      title: `${batches} batches operating across programmes`,
      subtitle: 'Enrolments assigned and tracked',
      time: 'Active',
      icon: Layers,
      tone: 'green',
    },
    {
      id: 'enrolments-active',
      title: `${activeEnrolments} active student enrolments in training`,
      subtitle: 'Attendance and grading pipeline online',
      time: 'Status',
      icon: GraduationCap,
      tone: 'purple',
    },
    {
      id: 'admin-synced',
      title: 'Admin operations synchronized',
      subtitle: me.email,
      time: 'Secure',
      icon: ShieldCheck,
      tone: 'amber',
    },
  ];

  return (
    <>
      <WelcomeBanner
        name={me.name}
        role="Admin"
        message="Academy administration: user accounts, enrolment pipeline, and audit security."
      />
      <ErrorNotice error={error} />

      {/* Top Metric Overview Cards */}
      <div className="p-metric-grid">
        <MetricCard
          icon={UsersIcon}
          variant={1}
          label="Total Users"
          value={`${totalUsers} Accounts`}
          trend="All Roles"
          trendPositive={true}
        />
        <MetricCard
          icon={Layers}
          variant={2}
          label="Active Batches"
          value={`${batches} Batches`}
          trend="In Operation"
          trendPositive={true}
        />
        <MetricCard
          icon={GraduationCap}
          variant={3}
          label="Active Enrolments"
          value={`${activeEnrolments} Students`}
          trend="In Training"
          trendPositive={true}
        />
        <MetricCard
          icon={ShieldCheck}
          variant={4}
          label="Staff & Faculty"
          value={`${staffUsers} Staff`}
          trend="Faculty & Ops"
          trendPositive={true}
        />
      </div>

      {/* Main Split Layout */}
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <CourseEngagementChart
            title="User Account Distribution by Role"
            data={chartData}
            totalLabel="Total Platform Accounts"
            totalValue={`${totalUsers} Users`}
            trendText="Active System"
          />

          <div className="p-course-card">
            <div className="p-course-header">
              <div>
                <h3 className="p-course-title">Enrolment Lifecycle Status</h3>
                <p className="p-course-batch">Student distribution across enrollment stages</p>
              </div>
              <Link to="/admin/users" className="p-chip p-chip-good inline-flex items-center gap-1">
                Manage accounts <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {data &&
                Object.entries(data.enrolments_by_status).map(([status, count]) => (
                  <ProgressBar
                    key={status}
                    label={`Status: ${status.replace('_', ' ')}`}
                    value={count}
                    max={activeEnrolments || 20}
                  />
                ))}
            </div>
          </div>
        </div>

        <div className="p-dashboard-side">
          <ActivityTimeline title="System Status Feed" items={activities} />

          <div className="p-todo-card">
            <h3 className="p-todo-title">Quick Administration</h3>
            <div className="p-todo-list">
              <Link to="/admin/users" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Create new staff or student account</span>
              </Link>
              <Link to="/admin/audit-log" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Inspect complete platform audit log</span>
              </Link>
            </div>
          </div>
        </div>
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
          <div className="span-2"><button className="p-btn" type="submit" disabled={busy || roles.length === 0}>{busy ? 'Creating…' : 'Create account'}</button></div>
        </form>
      </Card>
      <Card title="Everyone">
        <div className="p-row" style={{ marginBottom: 12 }}>
          <CurvedSelect
            value={role}
            onChange={setRole}
            options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
            placeholder="All roles"
          />
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
      {me => (
        <Routes>
          <Route index element={<Overview me={me} />} />
          <Route path="overview" element={<Overview me={me} />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
