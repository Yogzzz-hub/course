import { useEffect, useRef, useState } from 'react';
import { useIsPhone } from './ui';

/**
 * Long lists. On desktop they grow as you scroll (infinite scroll). On phones they are split into short pages,
 * so the screen never becomes one long scroll. The count or page starts over when `resetKey` changes.
 */
export function useInfiniteList(total: number, resetKey: string, step = 20, phoneStep = 10) {
  const phone = useIsPhone();
  const [count, setCount] = useState(step);
  const [page, setPage] = useState(0);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const pages = Math.max(1, Math.ceil(total / phoneStep));
  const current = Math.min(page, pages - 1);
  const start = phone ? current * phoneStep : 0;
  const end = phone ? start + phoneStep : count;
  const more = !phone && count < total;

  useEffect(() => { setCount(step); setPage(0); }, [resetKey, step]);

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

  return {
    start,
    end,
    more,
    count,
    sentinel,
    loadMore: () => setCount(current => Math.min(current + step, total)),
    paged: phone,
    page: current,
    pages,
    setPage,
  };
}
