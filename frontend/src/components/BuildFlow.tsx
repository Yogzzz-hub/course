import { useMotionVisibility } from './MotionSystem';

/** Decorative vector companion to the adjacent, readable process explanation. */
export function BuildFlow() {
  const ref = useMotionVisibility<HTMLDivElement>();
  return <div className="build-flow" ref={ref} aria-hidden="true">
    <svg viewBox="0 0 520 126" fill="none">
      <path className="flow-track" d="M75 48H445M445 48V90H75V48" />
      <path className="flow-signal" pathLength="1" d="M75 48H445V90H75V48" />
      <g className="flow-node flow-node-1"><circle cx="75" cy="48" r="24"/><path className="flow-icon" d="M69 53c-12-12 24-12 12 0l-2 3h-8l-2-3zm3 7h6m-3-30v-4m-17 9-3-3m37 3 3-3"/></g>
      <g className="flow-node flow-node-2"><rect x="236" y="24" width="48" height="48" rx="12"/><path className="flow-icon" d="m250 41-7 7 7 7m20-14 7 7-7 7m-7-18-6 22"/></g>
      <g className="flow-node flow-node-3"><rect x="423" y="26" width="44" height="44" rx="12" transform="rotate(45 445 48)"/><path className="flow-icon" d="M435 46a11 11 0 0 1 19-5m1-5v7h-7m7 7a11 11 0 0 1-19 5m-1 5v-7h7"/></g>
      <text x="75" y="120">Idea</text><text x="260" y="120">Build</text><text x="445" y="120">Iterate</text>
    </svg>
  </div>;
}
