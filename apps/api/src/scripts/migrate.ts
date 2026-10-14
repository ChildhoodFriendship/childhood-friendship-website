import { createDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';

// Le migrazioni servono solo della connessione al database: nessun altro segreto richiesto.
const url = process.env.DATABASE_URL?.trim();
if (!url) throw new Error('DATABASE_URL mancante');

const handle = await createDb(url);
await runMigrations(handle.db, url);
await handle.close();
console.log('Migrazioni applicate');
