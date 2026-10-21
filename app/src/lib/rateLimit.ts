type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientIp(headerList: { get(name: string): string | null }): string {
  const forwarded = headerList.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  const ip = first || headerList.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
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
