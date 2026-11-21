import { useEffect, useRef, useState } from 'react';

/**
 * Infinite scroll for long lists: show `step` items, then more as the sentinel nears the screen.
 * The count starts over whenever `resetKey` changes (a new search or filter).
 */
export function useInfiniteList(total: number, resetKey: string, step = 20) {
  const [count, setCount] = useState(step);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const more = count < total;

  useEffect(() => { setCount(step); }, [resetKey, step]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more) return;
    if (typeof IntersectionObserver === 'undefined') { setCount(total); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setCount(current => Math.min(current + step, total));
    }, { rootMargin: '400px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [more, count, total, step]);

  return { count, more, sentinel, loadMore: () => setCount(current => Math.min(current + step, total)) };
}
