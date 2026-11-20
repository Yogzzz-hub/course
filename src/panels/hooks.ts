import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';

/** Loads one API resource. Pass null to skip loading. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({
    data: null,
    error: null,
    loading: path !== null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (path === null) return;
    let alive = true;
    setState(previous => ({ ...previous, loading: true, error: null }));
    api<T>(path)
      .then(data => {
        if (alive) setState({ data, error: null, loading: false });
      })
      .catch((error: ApiError) => {
        if (alive) setState({ data: null, error, loading: false });
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick(value => value + 1), []);
  return { ...state, reload };
}
