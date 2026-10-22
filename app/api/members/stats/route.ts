import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { categoryOf, emptyCounts, type CommunityStats } from '@/lib/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Conteo agregado por categoría para las partículas del hero. Sólo devuelve
// totales: ni nombres, ni mails, ni ids. Cacheado en el edge 5 minutos.
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({ role: schema.members.role, tags: schema.members.tags })
      .from(schema.members)
      .where(eq(schema.members.status, 'active'));

    const categories = emptyCounts();
    for (const r of rows) categories[categoryOf(r.role, r.tags as string[] | null)] += 1;
    const body: CommunityStats = { total: rows.length, categories, live: true };
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Error fetching member stats:', error);
    const body: CommunityStats = { total: 0, categories: emptyCounts(), live: false };
    return NextResponse.json(body, { status: 503 });
  }
}
