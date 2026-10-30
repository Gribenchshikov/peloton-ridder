type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * nginx выставляет X-Real-IP в $remote_addr и перезаписывает его.
 * Первый адрес в X-Forwarded-For приходит от клиента, поэтому ему не доверяем.
 */
export function clientIp(headerList: { get(name: string): string | null }): string {
  const real = headerList.get("x-real-ip")?.trim() ?? "";
  if (/^[0-9a-fA-F:.]+$/.test(real) && real.length <= 64) return real;
  return "unknown";
}

/** true — запрос можно обработать. false — лимит исчерпан, работу делать не нужно. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (buckets.size > 10_000) {
    for (const [name, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(name);
    }
  }
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}
