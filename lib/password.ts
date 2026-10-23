import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ROUNDS = 10;

/** Random, readable one-time password for password recovery (must be changed after). */
export function generateTempPassword(): string {
  return `nt-${crypto.randomBytes(6).toString('hex')}`;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Predictable default password pattern: `{name-slug}.nortetech`.
 * The user can derive their own (e.g. Tomás Deluca → `tomas-deluca.nortetech`).
 * Los miembros dados de alta antes del rebrand conservan el hash del patrón viejo
 * (`{name-slug}.<sufijo legacy>`, ver LEGACY_PASSWORD_SUFFIX en scripts/); no se migran,
 * lo rotan con "olvidé mi contraseña".
 * `must_change_password=true` is set so first login forces a rotation.
 */
export function defaultPasswordFor(name: string): string {
  const slug = slugifyName(name) || 'builder';
  return `${slug}.nortetech`;
}
