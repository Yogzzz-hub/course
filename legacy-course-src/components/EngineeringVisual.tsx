import { useEffect, useRef, type PointerEvent } from 'react';
import { MotionToggle, useSiteMotion } from './MotionSystem';

export function EngineeringVisual({ compact = false }: { compact?: boolean }) {
  const { enabled } = useSiteMotion();
  const visual = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = visual.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { node.dataset.visible = String(entry.isIntersecting); });
    observer.observe(node);
    if (!enabled) { node.style.setProperty('--tilt-x', '0deg'); node.style.setProperty('--tilt-y', '0deg'); }
    return () => observer.disconnect();
  }, [enabled]);
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (!enabled || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--tilt-x', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -6}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 8}deg`);
  }
  return <div className="engineering-stage"><div ref={visual} onPointerMove={tilt} onPointerLeave={event => { event.currentTarget.style.setProperty('--tilt-x', '0deg'); event.currentTarget.style.setProperty('--tilt-y', '0deg'); }} className={`engineering-visual ${compact ? 'compact' : ''}`} aria-hidden="true">
    <div className="visual-grid" />
    <span className="visual-label visual-label-top">Idea to implementation</span>
    <svg viewBox="0 0 560 500" fill="none" className="layer-art">
      <defs>
        <linearGradient id={compact ? 'plateSmall' : 'plate'} x1="130" y1="80" x2="390" y2="390" gradientUnits="userSpaceOnUse"><stop stopColor="var(--visual-plate-1)" stopOpacity=".3"/><stop offset=".5" stopColor="var(--visual-plate-2)" stopOpacity=".35"/><stop offset="1" stopColor="var(--visual-plate-3)" stopOpacity=".95"/></linearGradient>
        <linearGradient id={compact ? 'edgeSmall' : 'edge'} x1="110" y1="130" x2="430" y2="290"><stop stopColor="var(--visual-edge-1)"/><stop offset="1" stopColor="var(--visual-edge-2)" stopOpacity=".4"/></linearGradient>
      </defs>
      <g className="orbital-field">
        <ellipse className="orbit-rail" cx="280" cy="250" rx="243" ry="204" />
        <ellipse className="orbit-signal" pathLength="1" cx="280" cy="250" rx="243" ry="204" />
        <circle className="signal-beacon" cx="37" cy="250" r="4" />
        <circle className="signal-beacon signal-beacon-late" cx="523" cy="250" r="4" />
      </g>
      <path d="M280 15v460M30 260l250 145 250-145M30 140l250 145 250-145" stroke="var(--visual-rail)" strokeDasharray="3 7"/>
      {[0,1,2,3,4].map((n) => <g key={n} className={`art-layer art-layer-${n}`} transform={`translate(0 ${200 - n * 45})`}><g className="plate-float" style={{ animationDelay: `${-n * 0.65}s` }}>
        <path d="m100 150 180-104 180 104-180 104z" fill={`url(#${compact ? 'plateSmall' : 'plate'})`} stroke={`url(#${compact ? 'edgeSmall' : 'edge'})`} />
        <path d="m100 150 180 104 180-104v10L280 264 100 160z" fill="var(--surface-alt)" stroke="var(--accent)" strokeOpacity=".35"/>
        <path className="plate-outline" pathLength="1" d="m132 150 148-85 148 85-148 85z" stroke="var(--accent-soft)" strokeOpacity={n===4 ? '.8' : '.25'} style={{ animationDelay: `${n * 120}ms` }} />
        {n===4 && <><path d="m232 151 30-17m-30 17 30 17m66-17-30-17m30 17-30 17m-12-45-14 58" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/><circle cx="280" cy="65" r="3" fill="var(--accent)"/></>}
      </g></g>)}
      <path className="trace-line" pathLength="1" d="M460 170h35v-30h45M100 350H48v34H10" stroke="var(--accent)" strokeOpacity=".65"/>
      <path className="circuit-signal" pathLength="1" d="M460 170h35v-30h45M100 350H48v34H10" stroke="var(--accent-soft)" strokeWidth="2"/>
      <circle cx="460" cy="170" r="3" fill="var(--accent)"/><circle cx="100" cy="350" r="3" fill="var(--accent)"/>
    </svg>
    <span className="art-tag art-tag-top">&lt;/&gt;<span>Built on fundamentals</span></span>
    <span className="art-tag art-tag-bottom"><span className="status-dot"/> From concept to capability</span>
    <div className="visual-caption"><span>A layered approach to learning</span></div>
  </div><MotionToggle/></div>;
}
