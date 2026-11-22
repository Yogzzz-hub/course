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
  CreditCard,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem, type Me } from '../PanelShell';
import { AuditLogView } from '../AuditLogView';
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
  { to: '/admin/portals', label: 'Portals & Switchboard' },
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
              <Link to="/admin/portals" className="p-todo-item">
                <span className="p-todo-bullet">→</span>
                <span>Open portals & switch into student/faculty logins</span>
              </Link>
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

interface PortalCardMeta {
  role: string;
  name: string;
  badge: string;
  description: string;
  icon: typeof GraduationCap;
  color: string;
  homeUrl: string;
}

const SWITCHBOARD_PORTALS: PortalCardMeta[] = [
  {
    role: 'student',
    name: 'Student Portal',
    badge: 'Learning Hub',
    description: 'Classes, timetable, fees, submitted assignments & quiz scores',
    icon: GraduationCap,
    color: '#7c3aed',
    homeUrl: '/app',
  },
  {
    role: 'trainer',
    name: 'Trainer Portal',
    badge: 'Faculty',
    description: 'Live classes, assignments grading, student quizzes & attendance',
    icon: UsersIcon,
    color: '#0891b2',
    homeUrl: '/trainer',
  },
  {
    role: 'manager',
    name: 'Manager Portal',
    badge: 'Operations',
    description: 'Programmes, batches scheduling, student enrolments & certificates',
    icon: Layers,
    color: '#4f46e5',
    homeUrl: '/manager',
  },
  {
    role: 'financier',
    name: 'Finance Portal',
    badge: 'Accounts',
    description: 'Fee payment verifications, operational expenses & financial ledger',
    icon: CreditCard,
    color: '#059669',
    homeUrl: '/finance',
  },
];

function PortalsSwitchboard({ me }: { me: Me }) {
  const [activeRole, setActiveRole] = useState<string>('student');
  const [search, setSearch] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const overview = useApi<{ users_by_role: Record<string, number> }>('/admin/overview');
  const usersPath = `/admin/users?role=${activeRole}${search ? `&q=${encodeURIComponent(search)}` : ''}`;
  const usersReq = useApi<{ items: UserRow[] }>(usersPath);

  const selectedPortal = SWITCHBOARD_PORTALS.find(p => p.role === activeRole) || SWITCHBOARD_PORTALS[0];

  const filteredUsers = (usersReq.data?.items ?? []).filter(u => {
    if (activeOnly && u.status !== 'active') return false;
    return true;
  });

  async function loginAs(user: UserRow, newTab = false) {
    setErrorMsg(null);
    setSwitchingId(user.id);
    try {
      const res = await api<{ ok: boolean; redirect: string }>('/admin/impersonate', {
        method: 'POST',
        body: { user_id: user.id },
      });
      if (newTab) {
        window.open(res.redirect, '_blank');
        setSwitchingId(null);
      } else {
        window.location.href = res.redirect;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to switch into this user account.');
      setSwitchingId(null);
    }
  }

  return (
    <>
      <PageHead
        title="Portals & Switchboard"
        text="Access any academy portal with available logins. Select a portal to view its registered accounts and switch into their view with one click."
      />

      {errorMsg && (
        <Notice tone="danger">
          {errorMsg}
        </Notice>
      )}

      {/* Switchboard Guidance Note */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <strong style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 3 }}>
              Safe Masquerade Mode Active
            </strong>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Admins can safely switch into any student, trainer, manager, or financier account to troubleshoot, review views, or assist users directly. A floating top banner stays pinned so you can return to Admin at any time. (Super Admin is strictly protected and cannot be accessed via switchboard.)
            </p>
          </div>
        </div>
      </Card>

      {/* 4 Portal Switch Cards */}
      <div className="p-switchboard-grid">
        {SWITCHBOARD_PORTALS.map(portal => {
          const Icon = portal.icon;
          const isSelected = activeRole === portal.role;
          const count = overview.data?.users_by_role?.[portal.role] ?? 0;

          return (
            <div
              key={portal.role}
              role="button"
              tabIndex={0}
              className={`p-switchboard-card ${isSelected ? 'p-switchboard-card--active' : ''}`}
              onClick={() => {
                setActiveRole(portal.role);
                setSearch('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveRole(portal.role);
                  setSearch('');
                }
              }}
            >
              <div className="p-switchboard-card-top">
                <div
                  className="p-switchboard-icon-box"
                  style={{ background: `${portal.color}18`, color: portal.color }}
                >
                  <Icon size={24} />
                </div>
                <span className="p-switchboard-badge">
                  {count} {count === 1 ? 'login' : 'logins'}
                </span>
              </div>
              <div className="p-switchboard-card-info">
                <h3 className="p-switchboard-card-title">{portal.name}</h3>
                <p className="p-switchboard-card-desc">{portal.description}</p>
              </div>
              <div className="p-switchboard-card-action">
                <span>{isSelected ? '✓ Viewing accounts' : 'View available logins'}</span>
                <ArrowRight size={13} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Accounts List for Selected Portal */}
      <div className="p-switchboard-users-section">
        <div className="p-switchboard-users-header">
          <div>
            <h3 className="p-switchboard-users-title">
              <selectedPortal.icon size={20} style={{ color: selectedPortal.color }} />
              Available Logins for {selectedPortal.name}
            </h3>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Choose any registered account below to log in and inspect their portal view.
            </span>
          </div>

          <div className="p-switchboard-filter-bar">
            <div className="p-switchboard-search-input">
              <input
                className="p-input"
                style={{ width: '100%', minWidth: 240 }}
                placeholder={`Search ${selectedPortal.name.toLowerCase()} by name/email…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label={`Search ${selectedPortal.name}`}
              />
            </div>

            <label className="p-row" style={{ gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => setActiveOnly(e.target.checked)}
              />
              <span>Active only</span>
            </label>

            <button
              type="button"
              className="p-btn p-btn-ghost p-btn-small"
              onClick={() => usersReq.reload()}
              title="Refresh users list"
            >
              <RefreshCw size={13} style={{ marginRight: 4 }} /> Refresh
            </button>
          </div>
        </div>

        <ErrorNotice error={usersReq.error} />

        {usersReq.loading && (
          <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--muted)' }}>
            Loading available {selectedPortal.name.toLowerCase()} logins…
          </div>
        )}

        {!usersReq.loading && filteredUsers.length === 0 && (
          <Empty>
            {search
              ? `No ${selectedPortal.name.toLowerCase()} accounts match "${search}".`
              : `No accounts found with the role "${selectedPortal.role}".`}
          </Empty>
        )}

        {!usersReq.loading && filteredUsers.length > 0 && (
          <Table
            empty="No accounts match."
            head={['User Account', 'Email & Contact', 'Assigned Roles', 'Status', 'Switch Session']}
            rows={filteredUsers.map(u => {
              const initials = u.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U';
              const isBusy = switchingId === u.id;
              const isDisabled = u.status !== 'active';

              return [
                <div key="acc" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="p-switchboard-user-avatar">
                    {initials}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 14, color: 'var(--text)' }}>
                      {u.name}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      ID #{u.id}
                    </span>
                  </div>
                </div>,
                <div key="contact">
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--text)' }}>{u.email}</span>
                  {u.phone && <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{u.phone}</span>}
                </div>,
                <div key="roles" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {u.roles.map(r => (
                    <span
                      key={r}
                      style={{
                        fontSize: 11,
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: r === activeRole ? `${selectedPortal.color}22` : 'var(--surface-alt)',
                        color: r === activeRole ? selectedPortal.color : 'var(--muted)',
                        fontWeight: r === activeRole ? 700 : 500,
                        border: '1px solid var(--border)',
                      }}
                    >
                      {r}
                    </span>
                  ))}
                </div>,
                <StatusChip key="status" text={u.status} tone={u.status === 'active' ? 'good' : 'bad'} />,
                <div key="actions" className="p-switchboard-actions">
                  <button
                    type="button"
                    className="p-btn p-btn-small"
                    disabled={isBusy || isDisabled}
                    onClick={() => loginAs(u, false)}
                    title={`Log in as ${u.name} and view ${selectedPortal.name}`}
                  >
                    {isBusy ? 'Switching…' : (
                      <>
                        <Eye size={13} style={{ marginRight: 5 }} />
                        Log in as {u.name.split(' ')[0]}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="p-btn p-btn-ghost p-btn-small"
                    disabled={isBusy || isDisabled}
                    onClick={() => loginAs(u, true)}
                    title="Open session in a new browser tab"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>,
              ];
            })}
          />
        )}
      </div>
    </>
  );
}

function AuditLog() {
  return <AuditLogView endpoint="/admin/audit-log?limit=300" text="Who changed what, and when. Nothing here can be edited." />;
}

export default function AdminPanel() {
  return (
    <PanelFrame role="admin" brand="Admin" items={NAV}>
      {me => (
        <Routes>
          <Route index element={<Overview me={me} />} />
          <Route path="overview" element={<Overview me={me} />} />
          <Route path="portals" element={<PortalsSwitchboard me={me} />} />
          <Route path="users" element={<Users />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
