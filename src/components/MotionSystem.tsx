import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { animate } from 'motion/mini';
import { Pause, Play } from 'lucide-react';

const MotionSettings = createContext({ enabled: true, reduced: false, paused: false, toggle: () => {} });

export function MotionProvider({ children }: { children: ReactNode }) {
  const [motionState, setMotionState] = useState<'active' | 'paused'>('active');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('academy-motion') : null;
    if (saved === 'paused' || saved === 'active') {
      setMotionState(saved);
      document.documentElement.dataset.motion = saved;
    } else {
      setMotionState('active');
      document.documentElement.dataset.motion = 'active';
    }
  }, []);

  const toggle = () => {
    setMotionState(prev => {
      const next = prev === 'active' ? 'paused' : 'active';
      if (typeof window !== 'undefined') {
        localStorage.setItem('academy-motion', next);
        document.documentElement.dataset.motion = next;
      }
      return next;
    });
  };

  const enabled = motionState === 'active';
  const paused = motionState === 'paused';

  return (
    <MotionSettings.Provider value={{ enabled, reduced: false, paused, toggle }}>
      {children}
    </MotionSettings.Provider>
  );
}
export const useSiteMotion = () => useContext(MotionSettings);

export function useMotionVisibility<T extends HTMLElement>(once = false) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      node.dataset.inView = String(entry.isIntersecting);
      if (entry.isIntersecting) {
        node.dataset.entered = 'true';
        if (once) observer.unobserve(node);
      }
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);
  return ref;
}

export function MotionToggle() {
  const { enabled, paused, toggle } = useSiteMotion();
  return (
    <button
      className="motion-toggle"
      type="button"
      onClick={toggle}
      aria-pressed={paused}
      aria-label={enabled ? 'Pause animations' : 'Play animations'}
    >
      {enabled ? <Pause size={13} aria-hidden="true"/> : <Play size={13} aria-hidden="true"/>}
      <span>{enabled ? 'Pause animations' : 'Play animations'}</span>
    </button>
  );
}

const revealSelectors = [
  '.section-heading', '.section-intro', '[data-reveal]', '.principle', '.programme-feature',
  '.journey li', '.spotlight > div:first-child', '.foundation-list > div', '.project-diagram',
  '.project-points', '.support-section > div:first-child', '.support-list > div', '.pricing-card',
  '.pricing-note', '.booking-cta', '.editorial-grid > div', '.support-editorial article',
  '.about-layout > div:first-child', '.fee-breakdown > div', '.outcomes',
  '.contact-call', '.booking-panel', '.enquiry-form', '.legal-content > section',
].join(',');

/** Progressive enhancement: server HTML and off-screen content are always readable. */
export function MotionDirector() {
  const { pathname } = useLocation();
  const { enabled } = useSiteMotion();
  const lastPath = useRef(pathname);
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main || !enabled) return;
    const controls: ReturnType<typeof animate>[] = [];
    const ease = [0.22, 1, 0.36, 1] as const;
    const navigation = lastPath.current !== pathname;
    lastPath.current = pathname;
    // Only move intro text; it is never hidden, keeping the headline immediately readable.
    main.querySelectorAll<HTMLElement>('.hero-copy > *, .page-hero > *, .detail-hero-grid > div:first-child > *, .duration-art').forEach((element, index) => {
      controls.push(animate(element, { transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.75, delay: Math.min(index * 0.055, 0.25), ease }));
    });
    if (navigation) {
      controls.push(animate(main, { transform: ['translateY(8px)', 'translateY(0px)'] }, { duration: 0.35, ease }));
      const indicator = document.querySelector<HTMLElement>('.route-indicator');
      if (indicator) controls.push(animate(indicator, { transform: ['scaleX(0)', 'scaleX(1)'], opacity: [0.8, 0] }, { duration: 0.65, ease }));
    }
    const elements = [...main.querySelectorAll<HTMLElement>(revealSelectors)].filter(element => !element.parentElement?.closest(revealSelectors));
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        const element = entry.target as HTMLElement;
        element.dataset.revealed = 'true';
        observer.unobserve(element);
        controls.push(animate(element, { transform: ['translateY(26px)', 'translateY(0px)'] }, { duration: 0.7, delay: Math.min(index * 0.075, 0.225), ease }));
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(element => observer.observe(element));
    return () => {
      observer.disconnect();
      controls.forEach(control => control.cancel());
    };
  }, [pathname, enabled]);
  return null;
}

export function ReadingProgress() {
  const { pathname } = useLocation();
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
      document.querySelector('header')?.classList.toggle('header-scrolled', window.scrollY > 24);
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); resize.disconnect(); };
  }, [pathname]);
  return <><div ref={bar} className="reading-progress" aria-hidden="true"/><div className="route-indicator" aria-hidden="true"/></>;
}
