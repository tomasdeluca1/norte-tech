import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { sendPasswordResetLinkEmail } from '@/lib/email';
import { createPasswordResetToken } from '@/lib/password-reset';
import { hitRateLimit, RESET_LIMITS } from '@/lib/rate-limit';
import { clientIpFrom, rateLimitBucket } from '@/lib/reset-token';
import { holdUntil, runInBackground } from '@/lib/background';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Respuesta única: nunca dice si el email existe.
const NEUTRAL = {
  success: true,
  message: 'Si ese email está en la comunidad, te llega un link para elegir una contraseña nueva.',
};

// Piso fijo de la respuesta 200: el trabajo que depende del email (límite por
// email, búsqueda del miembro, token y mail) corre en segundo plano, así que
// la respuesta tarda lo mismo exista o no el email.
const MIN_RESPONSE_MS = 400;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lo que depende del email. Corre después de responder. */
async function processResetRequest(email: string): Promise<void> {
  // Por email: pasado el límite no sale otro mail (la respuesta ya fue la neutra).
  const byEmail = await hitRateLimit(rateLimitBucket('reset-email', email), RESET_LIMITS.perEmail.limit, RESET_LIMITS.perEmail.windowSeconds);
  if (!byEmail.allowed) return;

  const [member] = await getDb()
    .select({ id: schema.members.id, name: schema.members.name, email: schema.members.email, status: schema.members.status })
    .from(schema.members)
    .where(eq(schema.members.email, email))
    .limit(1);
  if (!member || member.status !== 'active') return;

  const { token } = await createPasswordResetToken(member.id);
  // Sin el token ni el email en el log (runInBackground sólo loguea el mensaje).
  await sendPasswordResetLinkEmail({ to: member.email, name: member.name, token });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let email = '';
  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    // cuerpo inválido: se trata como email vacío
  }
  if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Escribí un email válido.' }, { status: 400 });
  }

  try {
    // El límite por IP no depende del email: se chequea antes de responder.
    const ip = clientIpFrom(request.headers);
    const byIp = await hitRateLimit(rateLimitBucket('reset-ip', ip), RESET_LIMITS.perIp.limit, RESET_LIMITS.perIp.windowSeconds);
    if (!byIp.allowed) {
      return NextResponse.json(
        { error: 'Hiciste muchos pedidos seguidos. Probá de nuevo en un rato.' },
        { status: 429, headers: { 'Retry-After': String(RESET_LIMITS.perIp.windowSeconds) } },
      );
    }
  } catch (err) {
    console.error('Forgot password error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'No pudimos procesar el pedido. Probá de nuevo en un rato.' }, { status: 500 });
  }

  runInBackground('Forgot password (segundo plano)', () => processResetRequest(email));
  await holdUntil(startedAt, MIN_RESPONSE_MS);
  return NextResponse.json(NEUTRAL);
}
