import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/password';
import { validateNewPassword } from '@/lib/reset-token';
import { bumpSessionVersion, getActiveMember } from '@/lib/member-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const auth = await getActiveMember();
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { session, member } = auth;

  try {
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    const invalid = validateNewPassword(newPassword);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'La nueva contraseña tiene que ser distinta de la actual.' }, { status: 400 });
    }

    const ok = await verifyPassword(currentPassword, member.passwordHash);
    if (!ok) return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });

    // Cambiar la contraseña cierra las demás sesiones; ésta sigue abierta con la versión nueva.
    const sv = await bumpSessionVersion(member.id, { passwordHash: await hashPassword(newPassword), mustChangePassword: false });
    session.mustChangePassword = false;
    session.sv = sv;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
