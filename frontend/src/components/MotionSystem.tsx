import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { animate } from 'motion/mini';
import { Pause, Play } from 'lucide-react';

const MotionSettings = createContext({ enabled: true, reduced: false, paused: false, toggle: () => {} });
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeReducedMotion(update: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
}
const getReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
const getServerReducedMotion = () => false;

export function MotionProvider({ children }: { children: ReactNode }) {
  const [motionState, setMotionState] = useState<'active' | 'paused'>('active');
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('academy-motion');
      if (saved === 'paused' || saved === 'active') setMotionState(saved);
    } catch { /* Preferences are optional when browser storage is unavailable. */ }
  }, []);
  useEffect(() => { document.documentElement.dataset.motion = reduced ? 'paused' : motionState; }, [reduced, motionState]);

  const toggle = () => {
    setMotionState(prev => {
      const next = prev === 'active' ? 'paused' : 'active';
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('academy-motion', next); } catch { /* Keep the in-memory preference. */ }
      }
      return next;
    });
  };

  const enabled = !reduced && motionState === 'active';
  const paused = reduced || motionState === 'paused';

  return (
    <MotionSettings.Provider value={{ enabled, reduced, paused, toggle }}>
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
  const { enabled, reduced, paused, toggle } = useSiteMotion();
  const label = reduced ? 'Animations disabled by your device settings' : enabled ? 'Pause animations' : 'Resume animations';
  return (
    <button
      className="motion-toggle"
      type="button"
      onClick={toggle}
      disabled={reduced}
      aria-pressed={paused}
      aria-label={label}
    >
      {enabled ? <Pause size={13} aria-hidden="true"/> : <Play size={13} aria-hidden="true"/>}
      <span>{label}</span>
    </button>
  );
}

const revealSelectors = [
  '.section-heading', '.section-intro', '[data-reveal]', '.principle', '.programme-feature',
  '.journey li', '.spotlight > div:first-child', '.foundation-list > div', '.project-diagram',
  '.project-points', '.support-section > div:first-child', '.support-list > div', '.pricing-card', '.course-fees article',
  '.pricing-note', '.booking-cta', '.editorial-grid > div', '.support-editorial article',
  '.about-layout > div:first-child', '.fee-breakdown > div', '.outcomes',
  '.contact-call', '.booking-panel', '.enquiry-form', '.legal-content > section',
  '.stat-card', '.deck-head', '.rail-head', '.commerce-head', '.accordion details', '.detail-section .two-columns > div',
  '.programme-card-item', '.booking-shell', '.booking-aside-stage', '.catalogue-controls',
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
    main.querySelectorAll<HTMLElement>('.hero-copy > *, .page-hero-copy > *, .detail-hero-grid > div:first-child > *, .duration-art').forEach((element, index) => {
      const control = animate(element, { transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.75, delay: Math.min(index * 0.055, 0.25), ease });
      control.then(() => { element.style.transform = ''; }).catch(() => {});
      controls.push(control);
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
        // Cards tip up gently out of depth; text blocks rise. Transform and opacity only, so the
        // compositor runs them without repainting (a blur filter re-rasterises text every frame).
        const card = element.matches('.stat-card, .programme-card-item, .editorial-grid > div, .support-editorial article, .pricing-card, .course-fees article, .foundation-list > div, .accordion details, .detail-section .two-columns > div');
        const keyframes = card
          ? { transform: ['perspective(1200px) translate3d(0, 40px, 0) rotateX(8deg)', 'perspective(1200px) translate3d(0, 0, 0) rotateX(0deg)'], opacity: [0, 1] }
          : { transform: ['translate3d(0, 24px, 0)', 'translate3d(0, 0, 0)'], opacity: [0, 1] };
        const control = animate(element, keyframes, { duration: card ? 0.9 : 0.8, delay: Math.min(index * 0.08, 0.32), ease: [0.16, 1, 0.3, 1] });
        control.then(() => { element.style.transform = ''; }).catch(() => {});
        controls.push(control);
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
