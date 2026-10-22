import { NextResponse } from 'next/server';
import { getCommunityStats } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Conteo agregado por categoría. Sólo devuelve totales: ni nombres, ni mails,
// ni ids. Misma consulta que la home (lib/stats.ts). Cacheado 5 minutos.
export async function GET() {
  const body = await getCommunityStats();
  if (!body.live) return NextResponse.json(body, { status: 503 });
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
