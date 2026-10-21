/** Caps how many programs run at once; extra jobs wait in a first-in, first-out queue. */
export class Semaphore {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private readonly max: number) { if (max < 1) throw new Error('Concurrency must be at least 1.'); }
  get running() { return this.active; }
  get waiting() { return this.queue.length; }
  async use<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>(resolve => this.queue.push(resolve));
    this.active++;
    try { return await task(); }
    finally { this.active--; this.queue.shift()?.(); }
  }
}

/** Token bucket per key (user, IP). The HTTP layer calls take() before accepting a submission. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; updated: number }>();
  constructor(private readonly capacity: number, private readonly refillPerMinute: number, private readonly now: () => number = Date.now) {}
  take(key: string): { allowed: boolean; retryAfterMs: number } {
    const time = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updated: time };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((time - bucket.updated) / 60_000) * this.refillPerMinute);
    bucket.updated = time;
    this.buckets.set(key, bucket);
    if (bucket.tokens >= 1) { bucket.tokens -= 1; return { allowed: true, retryAfterMs: 0 }; }
    return { allowed: false, retryAfterMs: Math.ceil(((1 - bucket.tokens) / this.refillPerMinute) * 60_000) };
  }
}
