import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import './local-neon';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('Missing DATABASE_URL environment variable');
  return url;
}

const globalForDb = global as typeof globalThis & {
  _neonSql?: ReturnType<typeof neon>;
  _drizzleDb?: ReturnType<typeof drizzle>;
};

function getSql() {
  if (!globalForDb._neonSql) {
    // cache: 'no-store' so Next.js never caches the underlying HTTP query — DB
    // reads (members list, admin, etc.) must always reflect the live DB, even on
    // force-dynamic routes (otherwise the landing shows stale data until redeploy).
    globalForDb._neonSql = neon(getDatabaseUrl(), { fetchOptions: { cache: 'no-store' } });
  }
  return globalForDb._neonSql;
}

export function getDb() {
  if (!globalForDb._drizzleDb) {
    globalForDb._drizzleDb = drizzle(getSql(), { schema });
  }
  return globalForDb._drizzleDb;
}

export { schema };
