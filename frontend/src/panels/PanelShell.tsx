import { useState, useEffect, type ReactNode } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Home,
  CreditCard,
  GraduationCap,
  Video,
  CalendarCheck,
  FileText,
  CheckSquare,
  HelpCircle,
  Award,
  Users,
  ShieldCheck,
  BookmarkCheck,
  Receipt,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Palette,
  X,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { LogoMark } from '../components/LogoMark';
import { api } from './api';
import { useApi } from './hooks';
import { themes } from '../components/ThemeSwitcher';
import { Loading, ErrorNotice, Notice } from './ui';
import './panels.css';

export interface Me {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  badge?: string | number;
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  financier: 'Financier',
  admin: 'Admin',
  trainer: 'Trainer',
  student: 'Student',
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

function getNavIcon(label: string, to: string) {
  const norm = (label + ' ' + to).toLowerCase();
  if (norm.includes('home')) return Home;
  if (norm.includes('overview') || norm.includes('dashboard')) return LayoutDashboard;
  if (norm.includes('fee') || norm.includes('payment') || norm.includes('cash')) return CreditCard;
  if (norm.includes('record')) return Video;
  if (norm.includes('attend')) return CalendarCheck;
  if (norm.includes('assign')) return FileText;
  if (norm.includes('task')) return CheckSquare;
  if (norm.includes('quiz')) return HelpCircle;
  if (norm.includes('certif')) return Award;
  if (norm.includes('batch') || norm.includes('class')) return GraduationCap;
  if (norm.includes('programme') || norm.includes('course')) return BookmarkCheck;
  if (norm.includes('expense')) return Receipt;
  if (norm.includes('user') || norm.includes('student') || norm.includes('trainer')) return Users;
  if (norm.includes('audit') || norm.includes('security') || norm.includes('log')) return ShieldCheck;
  if (norm.includes('setting') || norm.includes('config')) return Settings;
  return BookOpen;
}

/** Modern shell matching the sleek Ottertag dock layout across the 4 color themes */
export function PanelShell({ brand, items, me, children }: { brand: string; items: NavItem[]; me: Me; children: ReactNode }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('academy-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => document.documentElement.dataset.theme || 'theme-1');
  const [navStyle, setNavStyle] = useState<'brand' | 'light'>(() => {
    try {
      return (localStorage.getItem('academy-nav-style') as 'brand' | 'light') || 'brand';
    } catch {
      return 'brand';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.navStyle = navStyle;
    try {
      localStorage.setItem('academy-nav-style', navStyle);
    } catch {}
  }, [navStyle]);

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(document.documentElement.dataset.theme || 'theme-1');
    };
    window.addEventListener('academy-theme-change', handleThemeChange);
    return () => window.removeEventListener('academy-theme-change', handleThemeChange);
  }, []);

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('academy-sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  }

  function changeTheme(themeId: string) {
    document.documentElement.dataset.theme = themeId;
    localStorage.setItem('academy-theme', themeId);
    window.dispatchEvent(new Event('academy-theme-change'));
    setCurrentTheme(themeId);
    setThemePickerOpen(false);
  }

  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    navigate('/login');
  }

  const filteredItems = items;

  const activeThemeMeta = themes.find(t => t.id === currentTheme) || themes[0];
  const userInitials = me.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AA';

  const primaryRole = me.roles[0] || 'student';

  return (
    <div className={`panel-root ${collapsed ? 'panel-root--collapsed' : ''}`}>
      <aside className={`p-side ${collapsed ? 'p-side--collapsed' : ''}`} aria-label={`${brand} navigation`}>
        {/* Brand / Logo Header */}
        <div className="p-side-header">
          <Link to="/" className="p-side-brand-link" title="Aintrix Academy Home">
            <div className={`aintrix-pill-badge ${collapsed ? 'aintrix-pill-badge--collapsed' : ''}`}>
              <LogoMark size={collapsed ? 24 : 26} surface="dark" className="aintrix-pill-mark" />
              {!collapsed && (
                <div className="aintrix-pill-words">
                  <span className="aintrix-pill-name">Aintrix</span>
                  <span className="aintrix-pill-sub">ACADEMY</span>
                </div>
              )}
            </div>
          </Link>
          <button
            type="button"
            className="p-side-collapse-btn"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {!collapsed && (
          <div className="p-side-portal-bar">
            {brand.toLowerCase() === roleLabel(primaryRole).toLowerCase() ? (
              <span className="p-side-portal-role">{roleLabel(primaryRole)} Portal</span>
            ) : (
              <>
                <span className="p-side-portal-brand">{brand}</span>
                <span className="p-side-portal-sep">/</span>
                <span className="p-side-portal-role">{roleLabel(primaryRole)}</span>
              </>
            )}
          </div>
        )}

        {/* Navigation list with Lucide icons */}
        <nav className="p-nav" aria-label={`${brand} sections`}>
          {filteredItems.map(item => {
            const Icon = getNavIcon(item.label, item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? true}
                className={({ isActive }) => `p-nav-item ${isActive ? 'p-nav-item--active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="p-nav-icon">
                  <Icon size={18} />
                </span>
                {!collapsed && (
                  <span className="p-nav-label-wrap">
                    <span className="p-nav-label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="p-nav-badge">{item.badge}</span>
                    )}
                  </span>
                )}
                {collapsed && (
                  <div className="p-side-tooltip">{item.label}</div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Theme Picker & Profile */}
        <div className="p-side-foot">
          {/* Theme Switcher Popover Button */}
          <div className="p-theme-picker-container">
            <button
              type="button"
              className="p-theme-trigger-btn"
              onClick={() => setThemePickerOpen(prev => !prev)}
              title={`Active Theme: ${activeThemeMeta.name}`}
            >
              <div className="p-theme-swatch-pair">
                <span className="p-swatch" style={{ background: activeThemeMeta.primary }} />
                <span className="p-swatch" style={{ background: activeThemeMeta.accent }} />
              </div>
              {!collapsed && (
                <span className="p-theme-name-text">{activeThemeMeta.name}</span>
              )}
              {!collapsed && (
                <Palette size={14} className="p-theme-palette-icon" />
              )}
              {collapsed && (
                <div className="p-side-tooltip">Theme: {activeThemeMeta.name}</div>
              )}
            </button>

            {themePickerOpen && (
              <div className="p-theme-popover" role="dialog" aria-label="Choose color theme">
                <div className="p-theme-popover-title">Theme Palette</div>
                <div className="p-theme-popover-list">
                  {themes.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`p-theme-option ${currentTheme === t.id ? 'p-theme-option--active' : ''}`}
                      onClick={() => changeTheme(t.id)}
                    >
                      <div className="p-theme-swatches">
                        <span className="p-swatch" style={{ background: t.primary }} />
                        <span className="p-swatch" style={{ background: t.accent }} />
                      </div>
                      <div className="p-theme-details">
                        <span className="p-theme-label">{t.name}</span>
                        <span className="p-theme-tagline">{t.tagline}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-nav-style-wrap">
                  <div className="p-theme-popover-title">Sidebar Tone</div>
                  <div className="p-nav-style-toggle">
                    <button
                      type="button"
                      className={`p-nav-style-btn ${navStyle === 'brand' ? 'p-nav-style-btn--active' : ''}`}
                      onClick={() => setNavStyle('brand')}
                    >
                      Brand Theme
                    </button>
                    <button
                      type="button"
                      className={`p-nav-style-btn ${navStyle === 'light' ? 'p-nav-style-btn--active' : ''}`}
                      onClick={() => setNavStyle('light')}
                    >
                      Clean Light
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile info */}
          <div className="p-user-card" title={me.email}>
            <div className="p-user-avatar">{userInitials}</div>
            {!collapsed && (
              <div className="p-user-meta">
                <div className="p-user-name">{me.name}</div>
                <div className="p-user-email">{me.email}</div>
              </div>
            )}
            <button
              type="button"
              className="p-logout-btn"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
            {collapsed && (
              <div className="p-side-tooltip">Sign out ({me.name})</div>
            )}
          </div>
        </div>
      </aside>

      <div className="p-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

/** Loads the signed-in person. */
export function useMe() {
  const result = useApi<Me>('/me');
  const unauthorised = result.error?.status === 401;
  return { ...result, unauthorised };
}

/**
 * Guards a panel: signed-out people go to sign-in, people without the role see a clear message.
 * The super admin passes every panel.
 */
export function PanelFrame({
  role,
  brand,
  items,
  children,
}: {
  role: string;
  brand: string;
  items: NavItem[];
  children: (me: Me) => ReactNode;
}) {
  const me = useMe();
  const location = useLocation();
  if (me.unauthorised) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (me.error) return <section className="container page-hero"><ErrorNotice error={me.error} /></section>;
  if (!me.data) return <section className="container page-hero"><Loading /></section>;
  const allowed = me.data.roles.includes(role) || me.data.roles.includes('super_admin');
  if (!allowed) {
    return (
      <section className="container page-hero">
        <Notice tone="danger">This area is for the {roleLabel(role).toLowerCase()} role. Ask the super admin if you need access.</Notice>
      </section>
    );
  }
  return <PanelShell brand={brand} items={items} me={me.data}>{children(me.data)}</PanelShell>;
}
