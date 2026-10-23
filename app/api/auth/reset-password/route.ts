import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { consumePasswordResetToken, peekPasswordResetToken } from '@/lib/password-reset';
import { hitRateLimit, RESET_LIMITS } from '@/lib/rate-limit';
import { clientIpFrom, isWellFormedToken, rateLimitBucket, validateNewPassword } from '@/lib/reset-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INVALID = { error: 'El link venció o ya se usó. Pedí uno nuevo.', code: 'invalid_token' } as const;

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown; confirm?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // cuerpo inválido
  }

  const invalid = validateNewPassword(body.password, body.confirm);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (!isWellFormedToken(body.token)) return NextResponse.json(INVALID, { status: 400 });

  try {
    const ip = clientIpFrom(request.headers);
    const limited = await hitRateLimit(rateLimitBucket('reset-consume-ip', ip), RESET_LIMITS.consumePerIp.limit, RESET_LIMITS.consumePerIp.windowSeconds);
    if (!limited.allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en un rato.' }, { status: 429 });
    }

    // Chequeo previo para no gastar bcrypt en links muertos; el consumo real es atómico.
    if ((await peekPasswordResetToken(body.token)) !== 'valid') return NextResponse.json(INVALID, { status: 400 });

    const member = await consumePasswordResetToken(body.token, await hashPassword(body.password as string));
    if (!member) return NextResponse.json(INVALID, { status: 400 });

    // Si este navegador tenía una sesión abierta, también se cierra.
    const session = await getSession();
    if (session.userId) session.destroy();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'No pudimos cambiar la contraseña. Probá de nuevo.' }, { status: 500 });
  }
}
