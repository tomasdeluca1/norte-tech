// Reset de contraseña contra la base (tablas de drizzle/0006).
// La lógica pura (token, vencimiento, validaciones) está en lib/reset-token.ts.
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { hashResetToken, isWellFormedToken, issueResetToken, resetTokenState, type ResetTokenState } from './reset-token';

/**
 * Emite un token nuevo para el miembro. Antes anula los que tuviera sin usar
 * (sólo vale el último link) y limpia los viejos. Devuelve el token en claro
 * para armar el link; a la base va sólo el hash.
 */
export async function createPasswordResetToken(memberId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const issued = issueResetToken();
  await db.batch([
    db
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResetTokens.memberId, memberId), isNull(schema.passwordResetTokens.usedAt))),
    db
      .delete(schema.passwordResetTokens)
      .where(lt(schema.passwordResetTokens.expiresAt, sql`now() - interval '7 days'`)),
    db.insert(schema.passwordResetTokens).values({ memberId, tokenHash: issued.tokenHash, expiresAt: issued.expiresAt }),
  ]);
  return { token: issued.token, expiresAt: issued.expiresAt };
}

/** Mira el token sin consumirlo (para decidir qué pantalla mostrar). */
export async function peekPasswordResetToken(token: unknown): Promise<ResetTokenState> {
  if (!isWellFormedToken(token)) return 'missing';
  const [row] = await getDb()
    .select({
      expiresAt: schema.passwordResetTokens.expiresAt,
      usedAt: schema.passwordResetTokens.usedAt,
      status: schema.members.status,
    })
    .from(schema.passwordResetTokens)
    .innerJoin(schema.members, eq(schema.members.id, schema.passwordResetTokens.memberId))
    .where(eq(schema.passwordResetTokens.tokenHash, hashResetToken(token)))
    .limit(1);
  if (row && row.status !== 'active') return 'missing';
  return resetTokenState(row);
}

/**
 * Consume el token y cambia la contraseña en una sola sentencia: marca el
 * token como usado sólo si estaba vigente y sin usar, actualiza el hash,
 * apaga must_change_password, sube session_version (todas las sesiones
 * abiertas dejan de valer) y anula cualquier otro token del miembro.
 * Si dos pedidos llegan a la vez, sólo uno encuentra el token libre.
 * Devuelve el miembro o null si el token no servía.
 */
export async function consumePasswordResetToken(
  token: unknown,
  newPasswordHash: string,
): Promise<{ id: number; email: string; name: string } | null> {
  if (!isWellFormedToken(token)) return null;
  const tokenHash = hashResetToken(token);
  const result = await getDb().execute(sql`
    WITH t AS (
      UPDATE password_reset_tokens
         SET used_at = now()
       WHERE token_hash = ${tokenHash}
         AND used_at IS NULL
         AND expires_at > now()
      RETURNING member_id
    ), m AS (
      UPDATE members
         SET password_hash = ${newPasswordHash},
             must_change_password = false,
             session_version = session_version + 1,
             updated_at = now()
       WHERE id IN (SELECT member_id FROM t)
         AND status = 'active'
      RETURNING id, email, name
    ), others AS (
      UPDATE password_reset_tokens
         SET used_at = now()
       WHERE member_id IN (SELECT id FROM m)
         AND used_at IS NULL
         AND token_hash <> ${tokenHash}
      RETURNING 1
    )
    SELECT id, email, name, (SELECT count(*) FROM others) AS others FROM m
  `);
  const row = (result.rows as Array<{ id: number; email: string; name: string }>)[0];
  return row ? { id: Number(row.id), email: row.email, name: row.name } : null;
}
