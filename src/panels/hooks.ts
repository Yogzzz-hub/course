import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

/** Loads one screen's data. Pass null to wait. reload() fetches again after a change. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    api<T>(path)
      .then(result => {
        if (alive) {
          setData(result);
          setError(null);
        }
      })
      .catch(caught => {
        if (alive) setError(caught as ApiError);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick(value => value + 1), []);
  return { data, error, loading, reload };
}
