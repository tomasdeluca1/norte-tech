import type { Member } from './db/schema';
import { getActiveMember } from './member-session';

// Dueño de la comunidad: la única cuenta que puede otorgar/quitar admin.
// Configurable por env; default a la cuenta fundadora.
export const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'tomasdelucaa@gmail.com').trim().toLowerCase();

/** True si el member es el dueño (puede gestionar admins). */
export function isOwner(member: { email: string } | null | undefined): boolean {
  return !!member && member.email.trim().toLowerCase() === OWNER_EMAIL;
}

/** Miembro logueado (activo y con la sesión vigente) o null. */
export async function getCurrentMember(): Promise<Member | null> {
  const r = await getActiveMember();
  return r?.member ?? null;
}

/** Returns the member only if it is an active admin, otherwise null. */
export async function requireAdmin(): Promise<Member | null> {
  const m = await getCurrentMember();
  if (!m || !m.isAdmin || m.status !== 'active') return null;
  return m;
}
