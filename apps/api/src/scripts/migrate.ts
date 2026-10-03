import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

const env = loadEnv();
const handle = await createDb(env.DATABASE_URL);
await runMigrations(handle.db, env.DATABASE_URL);
await handle.close();
console.log('Migrazioni applicate');
