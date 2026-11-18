// Rate limit simple sobre Postgres (tabla auth_rate_limits de drizzle/0006).
// Ventana deslizante: cuenta los intentos del bucket dentro de la ventana y, si
// no llegó al límite, registra uno nuevo en la misma sentencia.
import { sql } from 'drizzle-orm';
import { getDb } from './db';

export type RateLimitResult = { allowed: boolean; count: number };

export async function hitRateLimit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = getDb();
  const result = await db.execute(sql`
    WITH recent AS (
      SELECT count(*)::int AS c FROM auth_rate_limits
       WHERE bucket = ${bucket} AND created_at > now() - make_interval(secs => ${windowSeconds})
    ), ins AS (
      INSERT INTO auth_rate_limits (bucket)
      SELECT ${bucket} FROM recent WHERE c < ${limit}
      RETURNING 1
    ), cleanup AS (
      DELETE FROM auth_rate_limits WHERE created_at < now() - interval '1 day'
      RETURNING 1
    )
    SELECT (SELECT c FROM recent) AS count, EXISTS (SELECT 1 FROM ins) AS allowed
  `);
  const row = (result.rows as Array<{ count: number; allowed: boolean }>)[0];
  return { allowed: !!row?.allowed, count: Number(row?.count ?? 0) };
}

/** Límites del pedido de reset. */
export const RESET_LIMITS = {
  /** Por email: 3 pedidos cada 15 minutos. Pasado eso se responde igual, sin mandar mail. */
  perEmail: { limit: 3, windowSeconds: 15 * 60 },
  /** Por IP: 10 pedidos por hora. Pasado eso, 429. */
  perIp: { limit: 10, windowSeconds: 60 * 60 },
  /** Intentos de usar un link, por IP: 20 por hora. */
  consumePerIp: { limit: 20, windowSeconds: 60 * 60 },
} as const;
