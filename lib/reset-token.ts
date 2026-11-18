// Lógica pura del reset de contraseña (sin base ni Next), para poder testearla
// con `npm test`. La parte que toca la base está en lib/password-reset.ts.
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/** Vigencia del link de reset (pedido: entre 30 y 60 minutos). */
export const RESET_TOKEN_TTL_MINUTES = 45;

/** 32 bytes aleatorios en base64url = 43 caracteres. */
const TOKEN_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignora lo que pasa de 72 bytes: se rechaza antes en vez de truncar en silencio. */
export const PASSWORD_MAX_BYTES = 72;

export type ResetTokenState = 'valid' | 'expired' | 'used' | 'missing';

export type IssuedResetToken = {
  /** Va sólo en el link del mail. Nunca se guarda ni se loguea. */
  token: string;
  /** SHA-256 hex del token: lo único que va a la base. */
  tokenHash: string;
  expiresAt: Date;
};

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function issueResetToken(now: Date = new Date(), ttlMinutes: number = RESET_TOKEN_TTL_MINUTES): IssuedResetToken {
  if (!(ttlMinutes >= 30 && ttlMinutes <= 60)) throw new Error('La vigencia del token tiene que estar entre 30 y 60 minutos');
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + ttlMinutes * 60_000) };
}

/** Formato válido de token (evita ir a la base con basura). */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/** Comparación en tiempo constante de dos hashes hex (por si se compara fuera de SQL). */
export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

/** Estado de un token guardado. El orden importa: usado gana sobre vencido. */
export function resetTokenState(
  row: { expiresAt: Date; usedAt: Date | null } | null | undefined,
  now: Date = new Date(),
): ResetTokenState {
  if (!row) return 'missing';
  if (row.usedAt) return 'used';
  if (row.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'valid';
}

/** Devuelve el error a mostrar o null si la contraseña nueva sirve. */
export function validateNewPassword(password: unknown, confirm?: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Escribí una contraseña nueva.';
  if (password.length < PASSWORD_MIN_LENGTH) return `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'La contraseña es demasiado larga (máximo 72 caracteres).';
  if (password.trim().length === 0) return 'La contraseña no puede ser sólo espacios.';
  if (confirm !== undefined && confirm !== password) return 'Las contraseñas no coinciden.';
  return null;
}

/** Bucket de rate limit sin datos en claro: "<scope>:<32 hex del sha256>". */
export function rateLimitBucket(scope: string, value: string): string {
  const digest = createHash('sha256').update(`${scope}\u0000${value.trim().toLowerCase()}`, 'utf8').digest('hex');
  return `${scope}:${digest.slice(0, 32)}`;
}

/** Primera IP de x-forwarded-for (Vercel la pone) o x-real-ip; "unknown" si no hay. */
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const xff = headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  return first || headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Arma el link del mail. El token va en el query string, codificado. */
export function resetUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, '')}/restablecer?token=${encodeURIComponent(token)}`;
}
