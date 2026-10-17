import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useAnimationFrame, useInView, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, useVelocity, wrap, type MotionValue } from 'motion/react';
import { useSiteMotion } from './MotionSystem';

const motionActive = () => typeof document !== 'undefined' && document.documentElement.dataset.motion !== 'paused';

/**
 * One delegated listener gives any element with data-tilt a 3D pointer tilt and
 * cursor spotlight, and any data-magnetic control a gentle pull toward the pointer.
 */
export function InteractionDirector() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let tilted: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    let frame = 0;
    let latest: PointerEvent | null = null;
    function reset(element: HTMLElement | null, kind: 'tilt' | 'magnet') {
      if (!element) return;
      element.dataset.hovering = 'false';
      if (kind === 'tilt') { element.style.setProperty('--rx', '0deg'); element.style.setProperty('--ry', '0deg'); }
      else element.style.setProperty('--magnet', '0px, 0px');
    }
    function apply() {
      frame = 0;
      const event = latest;
      if (!event || !motionActive()) return;
      const target = event.target instanceof Element ? event.target : null;
      const nextTilt = target?.closest<HTMLElement>('[data-tilt]') ?? null;
      const nextMagnet = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
      if (tilted !== nextTilt) { reset(tilted, 'tilt'); tilted = nextTilt; }
      if (magnet !== nextMagnet) { reset(magnet, 'magnet'); magnet = nextMagnet; }
      if (tilted) {
        const bounds = tilted.getBoundingClientRect();
        const px = (event.clientX - bounds.left) / bounds.width;
        const py = (event.clientY - bounds.top) / bounds.height;
        const strength = Number(tilted.dataset.tilt) || 8;
        tilted.dataset.hovering = 'true';
        tilted.style.setProperty('--rx', `${((0.5 - py) * strength).toFixed(2)}deg`);
        tilted.style.setProperty('--ry', `${((px - 0.5) * strength * 1.2).toFixed(2)}deg`);
        tilted.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        tilted.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      }
      if (magnet) {
        const bounds = magnet.getBoundingClientRect();
        const dx = event.clientX - (bounds.left + bounds.width / 2);
        const dy = event.clientY - (bounds.top + bounds.height / 2);
        magnet.dataset.hovering = 'true';
        magnet.style.setProperty('--magnet', `${(dx * 0.22).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px`);
      }
    }
    function onMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      latest = event;
      if (!frame) frame = requestAnimationFrame(apply);
    }
    function onLeave() { reset(tilted, 'tilt'); reset(magnet, 'magnet'); tilted = magnet = null; }
    document.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return null;
}

/** Scroll-linked page progress. Pages are never covered while they load. */
export function AmbientLayer() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return <motion.div className="scroll-meter" style={{ scaleX }} aria-hidden="true"/>;
}

/** Infinite marquee. The second copy is hidden from assistive technology. */
export function Marquee({ items, reverse = false, speed = 38, className = '' }: { items: ReactNode[]; reverse?: boolean; speed?: number; className?: string }) {
  const row = (hidden: boolean) => <div className="marquee-row" aria-hidden={hidden || undefined}>{items.map((item, index) => <span className="marquee-item" key={index}>{item}<i className="marquee-mark" aria-hidden="true"/></span>)}</div>;
  return <div className={`marquee ${reverse ? 'marquee-reverse' : ''} ${className}`} style={{ '--marquee-speed': `${speed}s` } as CSSProperties}>
    <div className="marquee-track">{row(false)}{row(true)}</div>
  </div>;
}

/**
 * A tape of words that drifts on its own and answers the scroll: scrolling speeds it up and
 * scrolling back up turns it round. It eases off under the pointer and idles while off-screen.
 * Copies after the first are hidden from assistive technology.
 */
export function VelocityTape({ items, speed = 3, className = '' }: { items: ReactNode[]; speed?: number; className?: string }) {
  const tape = useRef<HTMLDivElement>(null);
  const { enabled } = useSiteMotion();
  const inView = useInView(tape, { margin: '120px 0px' });
  const offset = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [0, 1000], [0, 4], { clamp: false });
  const direction = useRef(1);
  const hovered = useRef(false);
  // Four copies, so wrapping across one copy (a quarter of the track) is seamless.
  const x = useTransform(offset, value => `${wrap(-25, 0, value)}%`);
  useAnimationFrame((_, delta) => {
    if (!enabled || !inView) return;
    const push = boost.get();
    if (push < 0) direction.current = -1; else if (push > 0) direction.current = 1;
    const drift = direction.current * speed * (delta / 1000);
    offset.set(offset.get() - (drift + drift * Math.abs(push)) * (hovered.current ? 0.25 : 1));
  });
  const row = (copy: number) => <div className="tape-row" key={copy} aria-hidden={copy > 0 || undefined}>{items.map((item, index) => <span className="tape-item" key={index}>{item}<i className="tape-mark" aria-hidden="true"/></span>)}</div>;
  return <div ref={tape} className={`tape ${className}`} onPointerEnter={() => { hovered.current = true; }} onPointerLeave={() => { hovered.current = false; }}>
    <motion.div className="tape-track" style={enabled ? { x } : undefined}>{[0, 1, 2, 3].map(row)}</motion.div>
  </div>;
}

/** Counts up once when visible; the final value is server-rendered for readability. */
export function CountUp({ value, pad = 0, suffix = '' }: { value: number; pad?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !motionActive()) return;
    let frame = 0;
    const format = (n: number) => String(n).padStart(pad, '0') + suffix;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        const eased = 1 - Math.pow(1 - t, 4);
        node.textContent = format(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      node.textContent = format(0);
      frame = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, pad, suffix]);
  return <span ref={ref}>{String(value).padStart(pad, '0')}{suffix}</span>;
}

/** Sticky card deck: each card slides up over the last, and the ones beneath recede, tip back and dim. */
export function StackDeck({ children, className = '' }: { children: ReactNode; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: container, offset: ['start start', 'end end'] });
  const cards = Children.toArray(children);
  return <div ref={container} className={`stack-deck ${className}`}>
    {cards.map((card, index) => <StackDeckCard key={index} index={index} total={cards.length} progress={scrollYProgress} enabled={enabled}>{card}</StackDeckCard>)}
  </div>;
}
function StackDeckCard({ children, index, total, progress, enabled }: { children: ReactNode; index: number; total: number; progress: MotionValue<number>; enabled: boolean }) {
  const start = index / total;
  const scale = useTransform(progress, [start, 1], [1, 1 - (total - index - 1) * 0.045]);
  const rotateX = useTransform(progress, [start, Math.min(1, start + 1 / total)], [0, index === total - 1 ? 0 : 6]);
  // Dimming is a black veil over the card, so only opacity animates; a brightness filter would repaint each frame.
  const shade = useTransform(progress, [start, 1], [0, (total - index - 1) * 0.08]);
  return <div className="stack-deck-slot" style={{ '--slot': index } as CSSProperties}>
    <motion.div className="stack-deck-card" style={enabled ? { scale, rotateX, transformPerspective: 1400 } : undefined}>{children}{enabled && <motion.span className="stack-deck-shade" style={{ opacity: shade }} aria-hidden="true"/>}</motion.div>
  </div>;
}

/** Index of the section segment the reader has scrolled to. */
export function useActiveIndex(progress: MotionValue<number>, count: number) {
  const [active, setActive] = useState(0);
  useMotionValueEvent(progress, 'change', value => setActive(Math.min(count - 1, Math.max(0, Math.floor(value * count * 0.999)))));
  return active;
}

/** A 3D carousel ring that turns one face per scroll segment while pinned. */
export function ScrollRing<T>({ items, header, renderFace, className = '' }: { items: T[]; header?: ReactNode; renderFace: (item: T, index: number, active: boolean) => ReactNode; className?: string }) {
  const section = useRef<HTMLElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const step = 360 / items.length;
  const rotateY = useSpring(useTransform(scrollYProgress, [0.05, 0.95], [0, -step * (items.length - 1)]), { stiffness: 80, damping: 20, mass: 0.6 });
  const active = useActiveIndex(scrollYProgress, items.length);
  return <section ref={section} className={`ring-section ${enabled ? 'is-live' : 'is-static'} ${className}`} style={{ '--faces': items.length } as CSSProperties}>
    <div className="ring-sticky">
      {header}
      <div className="ring-stage">
        <motion.div className="ring-carousel" style={enabled ? { rotateY } : undefined}>
          {items.map((item, index) => <div key={index} className="ring-face" data-active={!enabled || index === active} style={{ '--angle': `${index * step}deg` } as CSSProperties}>{renderFace(item, index, !enabled || index === active)}</div>)}
        </motion.div>
      </div>
      {enabled && <div className="ring-dots" aria-hidden="true">{items.map((_, index) => <span key={index} data-active={index === active}/>)}</div>}
    </div>
  </section>;
}
