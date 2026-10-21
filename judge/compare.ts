import type { Comparator } from '../src/arena/challenges';

/** Compares an actual result with the specification's expected value. */
export function matches(expected: unknown, actual: unknown, comparator: Comparator): boolean {
  if (comparator.kind === 'unordered' && Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false;
    const remaining = [...actual];
    return expected.every(item => {
      const index = remaining.findIndex(candidate => deepEqual(item, candidate, 0));
      if (index < 0) return false;
      remaining.splice(index, 1);
      return true;
    });
  }
  return deepEqual(expected, actual, comparator.kind === 'float' ? comparator.tolerance : 0);
}

export function deepEqual(a: unknown, b: unknown, tolerance: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') return tolerance > 0 ? Math.abs(a - b) <= tolerance : a === b;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => deepEqual(item, b[index], tolerance));
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key], tolerance));
}
