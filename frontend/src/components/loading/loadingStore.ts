import { useSyncExternalStore } from 'react';

/**
 * Tiny shared counter of work in flight.
 * total   : every API request (drives the thin bar across the top of the screen).
 * initial : screens waiting for data they have never shown yet (drives the panel placeholder).
 * pages   : page bundles still being fetched during navigation (drives the delayed full-page loader).
 */
export interface LoadingState { total: number; initial: number; pages: number }

let state: LoadingState = { total: 0, initial: 0, pages: 0 };
const listeners = new Set<() => void>();
const SERVER_STATE: LoadingState = { total: 0, initial: 0, pages: 0 };

function emit(next: LoadingState) {
  state = next;
  listeners.forEach(listener => listener());
}

/** Call when a request starts. Returns a function that must be called once when it ends. */
export function trackRequest(): () => void {
  let done = false;
  emit({ ...state, total: state.total + 1 });
  return () => {
    if (done) return;
    done = true;
    emit({ ...state, total: Math.max(0, state.total - 1) });
  };
}

/** Call when a screen starts loading data it has not shown before. Returns the matching end function. */
export function trackInitialLoad(): () => void {
  let done = false;
  emit({ ...state, initial: state.initial + 1 });
  return () => {
    if (done) return;
    done = true;
    emit({ ...state, initial: Math.max(0, state.initial - 1) });
  };
}

/** Wraps a page bundle download so the full-page loader knows a navigation is waiting. */
export function trackPage<T>(promise: Promise<T>): Promise<T> {
  emit({ ...state, pages: state.pages + 1 });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    emit({ ...state, pages: Math.max(0, state.pages - 1) });
  };
  return promise.finally(finish);
}

export function useLoadingState(): LoadingState {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
    () => SERVER_STATE,
  );
}
