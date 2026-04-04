/**
 * Rate limiting en memoria por IP (ventana fija).
 * En serverless el contador es por instancia; para límite global usar Redis/Upstash.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const PRUNE_EVERY = 500;

export function rateLimitIp(
  ip: string,
  opts: { max: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const key = ip || 'unknown';
  const b = store.get(key);

  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    if (store.size > PRUNE_EVERY) prune(now);
    return { ok: true };
  }

  if (b.count >= opts.max) {
    const retryAfterSec = Math.ceil((b.resetAt - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  b.count += 1;
  return { ok: true };
}

function prune(now: number) {
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function getClientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
