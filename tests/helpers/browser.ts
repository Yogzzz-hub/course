/** A minimal browser stand-in for unit tests that exercise storage-backed modules in Node. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}

export function installBrowser(href = 'https://aintrix.test/programmes/python-full-stack?utm_campaign=autumn', referrer = '') {
  const url = new URL(href);
  const location = { href: url.href, pathname: url.pathname, search: url.search, host: url.host };
  const win = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage(), location, addEventListener() {}, removeEventListener() {} };
  Object.assign(globalThis, { window: win, document: { referrer, location } });
  return win;
}
export function setLocation(href: string) {
  const url = new URL(href);
  Object.assign((globalThis as unknown as { window: { location: Record<string, string> } }).window.location, { href: url.href, pathname: url.pathname, search: url.search, host: url.host });
}
