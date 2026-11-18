import { NextResponse } from 'next/server';
import { bumpSessionVersion, getActiveMember } from '@/lib/member-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cierra la sesión en todos los dispositivos (incluido éste). */
export async function POST() {
  const auth = await getActiveMember();
  if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  await bumpSessionVersion(auth.member.id);
  auth.session.destroy();
  return NextResponse.json({ success: true });
}
