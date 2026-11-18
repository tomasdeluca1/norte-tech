// Sesión de miembro validada contra la base: la cookie sola no alcanza.
// Una sesión vale sólo si el miembro existe, está activo y su session_version
// coincide con la de la cookie (sube al cambiar o restablecer la contraseña).
import { eq, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { getSession } from './auth';
import type { Member } from './db/schema';

type Session = Awaited<ReturnType<typeof getSession>>;

export function sessionMatches(session: { sv?: number }, member: Pick<Member, 'sessionVersion' | 'status'>): boolean {
  return member.status === 'active' && (session.sv ?? 0) === member.sessionVersion;
}

/** Miembro de la sesión actual o null. Si la cookie quedó vieja, la borra (cuando se puede). */
export async function getActiveMember(): Promise<{ session: Session; member: Member } | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const [member] = await getDb().select().from(schema.members).where(eq(schema.members.id, session.userId)).limit(1);
  if (!member || !sessionMatches(session, member)) {
    try {
      session.destroy();
    } catch {
      // En server components no se pueden escribir cookies: igual se trata como deslogueado.
    }
    return null;
  }
  return { session, member };
}

/** Sube session_version: todas las sesiones abiertas del miembro dejan de valer. Devuelve la nueva versión. */
export async function bumpSessionVersion(memberId: number, extra: Partial<Pick<Member, 'passwordHash' | 'mustChangePassword'>> = {}): Promise<number> {
  const [row] = await getDb()
    .update(schema.members)
    .set({ ...extra, sessionVersion: sql`${schema.members.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(schema.members.id, memberId))
    .returning({ sessionVersion: schema.members.sessionVersion });
  return row?.sessionVersion ?? 0;
}
