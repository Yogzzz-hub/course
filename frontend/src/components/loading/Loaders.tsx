import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoMark } from '../LogoMark';
import { academy } from '../../config/academy';
import { DetectiveRibbon } from './DetectiveRibbon';
import { useLoadingState } from './loadingStore';
import { PanelSkeleton, type SkeletonKind } from './PanelSkeletons';
import './loading.css';

const STAFF_PATH = /^\/(trainer|manager|finance|admin|superadmin)(\/|$)/;
const SEARCH_LINES = ['Searching the archives…', 'Following a lead…', 'Connecting the clues…', 'Almost there…'];
/** After this long, the loader admits it is taking a while. */
const SLOW_AFTER_MS = 6000;

/** True when the current address belongs to a staff panel, so the loader wears the suit. */
function useStaffLook(): boolean {
  return STAFF_PATH.test(useLocation().pathname);
}

/** Cycles through the search lines and flips to a "still searching" state once loading drags on. */
function useSearchText() {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const cycle = window.setInterval(() => setIndex(value => (value + 1) % SEARCH_LINES.length), 1700);
    const wait = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => { window.clearInterval(cycle); window.clearTimeout(wait); };
  }, []);
  return { line: slow ? 'Still searching… check your connection.' : SEARCH_LINES[index], slow };
}

/**
 * Full-screen loader. Used on its own (as a Suspense fallback) it stays invisible for the first 0.8 s (CSS delay).
 * `instant` skips that delay; NavigationLoader does its own timing.
 */
export function PageLoader({ instant = false }: { instant?: boolean }) {
  const staff = useStaffLook();
  const { line, slow } = useSearchText();
  return (
    <div className={`ld-screen${staff ? ' is-staff' : ''}${instant ? ' ld-now' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <i className="ld-ring ld-ring-a" aria-hidden="true" />
      <i className="ld-ring ld-ring-b" aria-hidden="true" />
      <i className="ld-ring ld-ring-c" aria-hidden="true" />
      <div className="ld-brand" aria-hidden="true">
        <LogoMark size={30} surface="dark" />
        <span>{academy.name}</span>
      </div>
      <div className="ld-stage"><DetectiveRibbon staff={staff} slow={slow} /></div>
      <p className="ld-line">{line}</p>
      <div className="ld-bar" aria-hidden="true"><i /></div>
      <p className="ld-tag" aria-hidden="true">{academy.tagline}</p>
    </div>
  );
}

/** A navigation must take this long before the loader appears, and the loader then stays at least MIN_VISIBLE_MS. */
const SHOW_AFTER_MS = 800;
const MIN_VISIBLE_MS = 500;

/**
 * Full-page loader for page changes. The old page stays on screen while the next one downloads;
 * only if that takes longer than 0.8 s does the loader appear, and once it has appeared it stays long enough not to flicker.
 */
export function NavigationLoader() {
  const { pages } = useLoadingState();
  const [shown, setShown] = useState(false);
  const shownAt = useRef(0);
  useEffect(() => {
    if (pages > 0) {
      if (shown) return;
      const timer = window.setTimeout(() => { shownAt.current = Date.now(); setShown(true); }, SHOW_AFTER_MS);
      return () => window.clearTimeout(timer);
    }
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(false), Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current)));
    return () => window.clearTimeout(timer);
  }, [pages, shown]);
  return shown ? <PageLoader instant /> : null;
}

/**
 * Placeholder laid over a panel's content area while a screen waits for data it has never shown.
 * It hides the half-built screen, so "nothing here yet" is never shown while data is still on its way.
 */
export function PanelLoader({ kind = 'table' }: { kind?: SkeletonKind }) {
  const staff = useStaffLook();
  const { line, slow } = useSearchText();
  return (
    <div className="ld-panel" role="status" aria-live="polite" aria-busy="true">
      <div aria-hidden="true"><PanelSkeleton kind={kind} /></div>
      <div className="ld-panel-mascot">
        <DetectiveRibbon staff={staff} slow={slow} className="dr-mini" />
        <p>{slow ? 'Still searching… check your connection.' : line}</p>
      </div>
    </div>
  );
}

/** Tiny magnifying glass for buttons that are busy. */
export function Spinner() {
  return (
    <svg className="ld-spinner" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12.6 12.6 L17.5 17.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
