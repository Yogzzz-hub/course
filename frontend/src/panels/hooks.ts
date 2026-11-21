import { useCallback, useEffect, useRef, useState } from 'react';
import { trackInitialLoad } from '../components/loading/loadingStore';
import { api, ApiError } from './api';

/** Loads one screen's data. Pass null to wait. reload() fetches again after a change. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const hadData = useRef(false);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    // Only a screen that has never shown data counts as an initial load; refreshes keep the old data on screen.
    const endInitial = hadData.current ? null : trackInitialLoad();
    setLoading(true);
    api<T>(path)
      .then(result => {
        if (alive) {
          hadData.current = true;
          setData(result);
          setError(null);
        }
      })
      .catch(caught => {
        if (alive) setError(caught as ApiError);
      })
      .finally(() => {
        endInitial?.();
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      endInitial?.();
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick(value => value + 1), []);
  return { data, error, loading, reload };
}
