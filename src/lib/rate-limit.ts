/**
 * Rate limiting básico en memoria (ventana fija).
 *
 * Suficiente para desarrollo y despliegues de una sola instancia. En producción
 * serverless (varias lambdas) conviene reemplazarlo por un store compartido
 * como Upstash Redis (@upstash/ratelimit). La firma se mantendría igual.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Segundos hasta que se reinicie la ventana. */
  retryAfter: number;
}

/**
 * @param key       Identificador del cliente (ej: `login:${ip}`).
 * @param limit     Máximo de intentos por ventana.
 * @param windowMs  Tamaño de la ventana en milisegundos.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    success: true,
    remaining: limit - bucket.count,
    retryAfter: 0,
  };
}

// Limpieza periódica para evitar fugas de memoria con claves expiradas.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // No mantener vivo el proceso solo por este timer.
  if (typeof timer.unref === "function") timer.unref();
}
