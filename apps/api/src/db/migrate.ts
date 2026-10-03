import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Cartella delle migrazioni SQL: funziona sia da sorgente (src/db) sia da bundle (dist). */
export function migrationsFolder(): string {
  const candidates = [path.resolve(here, '../../drizzle'), path.resolve(here, '../drizzle'), path.resolve(process.cwd(), 'drizzle')];
  return candidates.find((c) => existsSync(c)) ?? candidates[0]!;
}


export async function runMigrations(db: Database, url: string): Promise<void> {
  const migrationsFolderPath = migrationsFolder();
  if (url.startsWith('pglite:')) {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: migrationsFolderPath });
    return;
  }
  await migratePg(db, { migrationsFolder: migrationsFolderPath });
}
