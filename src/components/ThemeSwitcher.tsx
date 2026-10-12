import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';

export interface ThemeOption {
  id: string;
  number: string;
  name: string;
  tagline: string;
  primary: string;
  accent: string;
  bg: string;
  isTopPick?: boolean;
}

export const themes: ThemeOption[] = [
  {
    id: 'theme-1',
    number: '1',
    name: 'Burgundy + Ice Blue',
    tagline: 'Modern luxury · Clean',
    primary: '#681C35',
    accent: '#A9C9DC',
    bg: '#F7F9FB',
    isTopPick: true,
  },
  {
    id: 'theme-2',
    number: '2',
    name: 'Burgundy + Soft Copper',
    tagline: 'Warm luxury · Welcoming',
    primary: '#701F38',
    accent: '#DAA17B',
    bg: '#FFF9F5',
  },
  {
    id: 'theme-3',
    number: '3',
    name: 'Burgundy + Dusty Lavender',
    tagline: 'Creative · Elegant · Contemporary',
    primary: '#681B37',
    accent: '#C2ACD8',
    bg: '#FAF8FC',
  },
  {
    id: 'theme-4',
    number: '4',
    name: 'Burgundy + Rose Blush',
    tagline: 'Modern luxury · Poised',
    primary: '#581F32',
    accent: '#D7A7B5',
    bg: '#FAF5F7',
  },
];

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<string>('theme-1');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('academy-theme')) || 'theme-1';
    setCurrentTheme(saved);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = saved;
    }
  }, []);

  const setTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = themeId;
      document.documentElement.dataset.themeTransitioning = 'true';
      try {
        localStorage.setItem('academy-theme', themeId);
      } catch {
        // ignore storage errors
      }
      setTimeout(() => {
        delete document.documentElement.dataset.themeTransitioning;
      }, 400);
    }
  };

  return { currentTheme, setTheme };
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div
      className={`theme-switcher ${compact ? 'theme-switcher-compact' : ''}`}
      role="group"
      aria-label="Theme selector"
    >
      <div className="theme-switcher-label" aria-hidden="true">
        <Palette size={14} />
        {!compact && <span>Theme</span>}
      </div>
      <div className="theme-options">
        {themes.map((t) => {
          const isActive = currentTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`theme-btn ${isActive ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
              aria-pressed={isActive}
              title={`${t.name} — ${t.tagline}`}
            >
              <span className="theme-swatch" style={{ background: t.bg }}>
                <span className="swatch-dot" style={{ background: t.primary }} />
                <span className="swatch-dot" style={{ background: t.accent }} />
              </span>
              <span className="theme-btn-text">
                <strong className="theme-number">{t.number}.</strong>
                <span className="theme-name">{t.name}</span>
              </span>
              {isActive && <Check size={12} className="theme-check" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
