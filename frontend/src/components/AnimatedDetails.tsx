import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { useSiteMotion } from './MotionSystem';

/** Retains native details/summary keyboard behavior and a working no-JS fallback. */
export function AnimatedDetails({ summary, children, className = '' }: { summary: ReactNode; children: ReactNode; className?: string }) {
  const element = useRef<HTMLDetailsElement>(null);
  const animation = useRef<Animation | null>(null);
  const destination = useRef(false);
  const { enabled } = useSiteMotion();
  useEffect(() => {
    if (!enabled && animation.current) {
      animation.current.cancel();
      animation.current = null;
      if (element.current) { element.current.open = destination.current; element.current.style.overflow = ''; }
    }
    return () => { animation.current?.cancel(); };
  }, [enabled]);
  function toggle(event: MouseEvent<HTMLElement>) {
    const details = element.current;
    if (!details || !enabled) return;
    event.preventDefault();
    const opening = animation.current ? !destination.current : !details.open;
    destination.current = opening;
    const startHeight = details.getBoundingClientRect().height;
    animation.current?.cancel();
    details.open = true;
    const summaryHeight = details.querySelector('summary')!.getBoundingClientRect().height;
    const endHeight = opening ? details.getBoundingClientRect().height : summaryHeight + 1;
    details.style.overflow = 'hidden';
    const current = details.animate({ height: [`${startHeight}px`, `${endHeight}px`] }, { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    animation.current = current;
    current.onfinish = () => {
      details.open = opening;
      details.style.overflow = '';
      animation.current = null;
    };
  }
  return <details ref={element} className={className}><summary onClick={toggle}>{summary}</summary>{children}</details>;
}
