import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { mkdir } from 'node:fs/promises';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  close: () => Promise<void>;
}

/**
 * `postgres://...` → node-postgres (Neon pooled, Supabase, Postgres locale)
 * `pglite:<dir>` o `pglite:memory` → PGlite embedded (sviluppo e test, nessun server)
 */
export async function createDb(url: string): Promise<DbHandle> {
  if (url.startsWith('pglite:')) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const target = url.slice('pglite:'.length);
    if (target !== 'memory') await mkdir(target, { recursive: true });
    const client = target === 'memory' ? new PGlite() : new PGlite(target);
    const db = drizzle(client, { schema, casing: 'snake_case' }) as unknown as Database;
    return { db, close: () => client.close() };
  }
  const pool = new pg.Pool({
    connectionString: url,
    max: Number(process.env['DB_POOL_MAX'] ?? 5),
    ssl: /sslmode=require|neon\.tech/.test(url) ? { rejectUnauthorized: true } : undefined
  });
  const db = drizzlePg(pool, { schema, casing: 'snake_case' });
  return { db, close: () => pool.end() };
}
