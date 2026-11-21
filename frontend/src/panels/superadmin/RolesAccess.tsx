import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { BookOpen, Briefcase, Check, Crown, GraduationCap, Lock, Search, ShieldCheck, Undo2, Wallet, X } from 'lucide-react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { roleLabel } from '../PanelShell';
import { Empty, ErrorNotice, PageHead, StatusChip } from '../ui';
import './roles-access.css';

interface UserRow { id: number; name: string; email: string; status: string; roles: string[] }

/** Strongest first. The order also decides which role's description a person's card shows. */
const ROLE_ORDER = ['super_admin', 'admin', 'manager', 'financier', 'trainer', 'student'] as const;

const ROLE_INFO: Record<string, { icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; blurb: string }> = {
  super_admin: { icon: Crown, blurb: 'Full control: roles, settings, every panel and the complete audit trail.' },
  admin: { icon: ShieldCheck, blurb: 'Manages user accounts and reads the audit log.' },
  manager: { icon: Briefcase, blurb: 'Runs programmes, batches, enrolments and certificates.' },
  financier: { icon: Wallet, blurb: 'Handles payments, expenses and the ledger.' },
  trainer: { icon: BookOpen, blurb: 'Teaches classes, takes attendance and grades work.' },
  student: { icon: GraduationCap, blurb: 'Sees own fees, classes, assignments and certificates.' },
};

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(role => b.includes(role));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';
const byStrength = (roles: string[]) => ROLE_ORDER.filter(role => roles.includes(role));

type Risk = 'grant' | 'remove' | null;
interface Pending { user: UserRow; roles: string[]; risk: Exclude<Risk, null> }
interface Toast { name: string; userId: number; previous: string[] }

/** Roles & access: one card per person, roles as toggle chips, with search, filters and safety checks. */
export function RolesAccess() {
  const list = useApi<{ items: UserRow[] }>('/superadmin/users');
  const me = useApi<{ id: number }>('/me');
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<ApiError | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [hint, setHint] = useState<{ id: number; text: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [recent, setRecent] = useState<Record<number, true>>({});
  const dialog = useRef<HTMLDialogElement>(null);

  const users = list.data?.items ?? [];
  const meId = me.data?.id;
  const superAdmins = users.filter(user => user.roles.includes('super_admin')).length;

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: users.length };
    for (const role of ROLE_ORDER) result[role] = users.filter(user => user.roles.includes(role)).length;
    return result;
  }, [users]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter(user => {
      if (filter !== 'all' && !user.roles.includes(filter)) return false;
      return !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    });
  }, [users, query, filter]);

  // The confirmation dialog follows the pending change.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (pending && !element.open) element.showModal();
    if (!pending && element.open) element.close();
  }, [pending]);

  // The undo toast closes itself.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const rolesFor = (user: UserRow) => draft[user.id] ?? user.roles;

  /** Why a role cannot be switched off for this person right now, or null when it can. */
  function lockReason(user: UserRow, role: string): string | null {
    const roles = rolesFor(user);
    if (!roles.includes(role)) return null;
    if (role === 'super_admin' && user.roles.includes('super_admin')) {
      if (user.id === meId) return 'You cannot remove your own super admin role.';
      if (superAdmins <= 1) return 'This is the only super admin, so the role has to stay.';
    }
    if (roles.length === 1) return 'Everyone needs at least one role.';
    return null;
  }

  function toggle(user: UserRow, role: string) {
    const reason = lockReason(user, role);
    if (reason) {
      setHint({ id: user.id, text: reason });
      return;
    }
    setHint(null);
    const current = rolesFor(user);
    const next = current.includes(role) ? current.filter(item => item !== role) : [...current, role];
    setDraft(({ [user.id]: _old, ...rest }) => (sameSet(next, user.roles) ? rest : { ...rest, [user.id]: next }));
  }

  function undoDraft(user: UserRow) {
    setHint(null);
    setDraft(({ [user.id]: _old, ...rest }) => rest);
  }

  function riskOf(user: UserRow, next: string[]): Risk {
    const had = user.roles.includes('super_admin');
    const will = next.includes('super_admin');
    if (!had && will) return 'grant';
    if (had && !will) return 'remove';
    return null;
  }

  async function commit(user: UserRow, roles: string[], options: { undo?: boolean } = {}) {
    setError(null);
    setBusyId(user.id);
    try {
      await api(`/superadmin/users/${user.id}/roles`, { method: 'PUT', body: { roles } });
      setDraft(({ [user.id]: _saved, ...rest }) => rest);
      setRecent(current => ({ ...current, [user.id]: true }));
      setToast(options.undo ? null : { name: user.name, userId: user.id, previous: user.roles });
      list.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusyId(null);
    }
  }

  function save(user: UserRow) {
    const roles = rolesFor(user);
    const risk = riskOf(user, roles);
    if (risk) setPending({ user, roles, risk });
    else void commit(user, roles);
  }

  function confirmPending() {
    if (!pending) return;
    const { user, roles } = pending;
    setPending(null);
    void commit(user, roles);
  }

  function undoSaved() {
    if (!toast) return;
    const user = users.find(item => item.id === toast.userId);
    const { previous } = toast;
    setToast(null);
    if (user) void commit(user, previous, { undo: true });
  }

  const filters = ['all', ...ROLE_ORDER];

  return (
    <div className="rx">
      <PageHead title="Roles & access" text="Choose what each person can do. A person can hold several roles at once." />
      <ErrorNotice error={error} />
      <ErrorNotice error={list.error} />

      <div className="rx-filters" role="group" aria-label="Filter by role">
        {filters.map(key => (
          <button key={key} type="button" className="rx-filter" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {key === 'all' ? 'Everyone' : roleLabel(key)}
            <b>{counts[key] ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="rx-toolbar">
        <label className="rx-search">
          <Search size={18} aria-hidden="true" />
          <span className="rx-sr">Search people</span>
          <input type="search" placeholder="Search by name or email" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <p className="rx-count" role="status" aria-live="polite">Showing {visible.length} of {users.length}</p>
      </div>

      {list.data && users.length === 0 && <Empty>No accounts yet.</Empty>}
      {users.length > 0 && visible.length === 0 && (
        <div className="rx-none">
          <p>No one matches{query ? ` “${query}”` : ' this filter'}.</p>
          <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => { setQuery(''); setFilter('all'); }}>Clear search and filters</button>
        </div>
      )}

      <ul className="rx-list">
        {visible.map(user => {
          const roles = rolesFor(user);
          const dirty = Boolean(draft[user.id]);
          const top = byStrength(roles)[0];
          const you = user.id === meId;
          const cardHint = hint?.id === user.id ? hint.text : '';
          return (
            <li key={user.id} className={`rx-card${dirty ? ' is-dirty' : ''}`}>
              <div className="rx-who">
                <span className="rx-avatar" aria-hidden="true">{initials(user.name)}</span>
                <div className="rx-id">
                  <p className="rx-name">
                    {user.name}
                    {you && <span className="rx-you">You</span>}
                    {recent[user.id] && !dirty && <span className="rx-recent">Just updated</span>}
                  </p>
                  <p className="rx-email">{user.email}</p>
                </div>
                <StatusChip text={user.status} tone={user.status === 'active' ? 'good' : 'warn'} />
              </div>

              <div className="rx-roles">
                <div className="rx-chips" role="group" aria-label={`Roles for ${user.name}`}>
                  {ROLE_ORDER.map(role => {
                    const Icon = ROLE_INFO[role]!.icon;
                    const on = roles.includes(role);
                    const lock = lockReason(user, role);
                    return (
                      <button
                        key={role}
                        type="button"
                        className={`rx-chip${lock && !lock.startsWith('Everyone') ? ' is-locked' : ''}`}
                        data-role={role}
                        aria-pressed={on}
                        title={lock ?? ROLE_INFO[role]!.blurb}
                        onClick={() => toggle(user, role)}
                      >
                        <Icon size={15} aria-hidden={true} />
                        {roleLabel(role)}
                        {on && lock && !lock.startsWith('Everyone') ? <Lock size={12} aria-hidden={true} /> : on ? <Check size={13} aria-hidden={true} /> : null}
                      </button>
                    );
                  })}
                </div>
                <p className="rx-blurb">{top ? ROLE_INFO[top]!.blurb : 'No role selected.'}</p>
                {cardHint && <p className="rx-hint" role="status"><Lock size={13} aria-hidden="true" /> {cardHint}</p>}
              </div>

              {dirty && (
                <div className="rx-actions">
                  <span className="rx-unsaved">Unsaved changes</span>
                  <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => undoDraft(user)} disabled={busyId === user.id}>
                    <Undo2 size={14} aria-hidden="true" /> Undo
                  </button>
                  <button type="button" className="p-btn p-btn-small" onClick={() => save(user)} disabled={busyId === user.id}>
                    {busyId === user.id ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <dialog ref={dialog} className="rx-dialog" aria-labelledby="rx-dialog-title" onCancel={event => { event.preventDefault(); setPending(null); }}>
        {pending && (
          <div className="rx-dialog-body">
            <span className={`rx-dialog-icon${pending.risk === 'remove' ? ' is-remove' : ''}`} aria-hidden="true"><Crown size={22} /></span>
            <h2 id="rx-dialog-title">
              {pending.risk === 'grant' ? `Make ${pending.user.name} a super admin?` : `Remove super admin from ${pending.user.name}?`}
            </h2>
            <p>
              {pending.risk === 'grant'
                ? 'Super admins have full control. They can change anyone’s roles and the academy settings, open every panel and read the whole audit trail. Only give this to someone you fully trust.'
                : 'They will lose access to roles, settings and the super admin panel straight away. You can give it back later.'}
            </p>
            <div className="rx-dialog-actions">
              <button type="button" className="p-btn p-btn-ghost" onClick={() => setPending(null)}>Cancel</button>
              <button type="button" className="p-btn p-btn-danger" onClick={confirmPending}>
                {pending.risk === 'grant' ? 'Yes, make super admin' : 'Yes, remove it'}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {toast && (
        <div className="rx-toast" role="status">
          <span>Roles saved for {toast.name}.</span>
          <button type="button" onClick={undoSaved}><Undo2 size={14} aria-hidden="true" /> Undo</button>
          <button type="button" className="rx-toast-close" aria-label="Dismiss" onClick={() => setToast(null)}><X size={14} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}
