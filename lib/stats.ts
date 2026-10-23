// Totales agregados de la comunidad (miembros activos por categoría), leídos
// de Neon. Sólo números: ni nombres, ni mails, ni ids. Lo usan la home (Server
// Component, revalidate 300 s) y /api/members/stats.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './db/schema';
import './db/local-neon';
import { categoryOf, emptyCounts, type CommunityStats } from './categories';

export const STATS_REVALIDATE_SECONDS = 300;

function statsDb() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('Missing DATABASE_URL');
  // Cliente propio con caché de 5 minutos (el de lib/db es no-store a propósito).
  const sql = neon(url, { fetchOptions: { next: { revalidate: STATS_REVALIDATE_SECONDS, tags: ['member-stats'] } } });
  return drizzle(sql, { schema });
}

/** Totales reales. Si la consulta falla devuelve live:false y total 0 (la UI oculta los números). */
export async function getCommunityStats(): Promise<CommunityStats> {
  try {
    const rows = await statsDb()
      .select({ role: schema.members.role, tags: schema.members.tags })
      .from(schema.members)
      .where(eq(schema.members.status, 'active'));
    const categories = emptyCounts();
    for (const r of rows) categories[categoryOf(r.role, r.tags as string[] | null)] += 1;
    return { total: rows.length, categories, live: true };
  } catch (error) {
    console.error('Error fetching member stats:', error instanceof Error ? error.message : 'unknown');
    return { total: 0, categories: emptyCounts(), live: false };
  }
}
