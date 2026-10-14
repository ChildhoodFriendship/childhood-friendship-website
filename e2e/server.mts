/**
 * Server per i test end-to-end: API con database in memoria (PGlite) + build web statica,
 * sulla stessa origine come in produzione. Dati di prova creati all'avvio; nessun servizio esterno.
 */
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from '../apps/api/src/app.js';
import { loadEnv } from '../apps/api/src/config/env.js';
import { createDb } from '../apps/api/src/db/client.js';
import { runMigrations } from '../apps/api/src/db/migrate.js';
import { clients, leads, projects, users } from '../apps/api/src/db/schema.js';
import { hashPassword, SecretBox } from '../apps/api/src/lib/crypto.js';
import { E2E_ADMIN } from './fixtures.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'apps/web/dist/browser');
const webDir = existsSync(path.join(dist, 'index.html')) ? dist : path.join(root, 'apps/web/dist');
const port = Number(process.env['E2E_PORT'] ?? 4310);

const env = loadEnv({
  NODE_ENV: 'development',
  PORT: String(port),
  DATABASE_URL: 'pglite:memory',
  JWT_SECRET: randomBytes(32).toString('hex'),
  CREDENTIALS_KEY: randomBytes(32).toString('base64'),
  APP_URL: `http://localhost:${port}`
});
const handle = await createDb(env.DATABASE_URL);
await runMigrations(handle.db, env.DATABASE_URL);

const db = handle.db;
await db.insert(users).values({ email: E2E_ADMIN.email, name: E2E_ADMIN.name, passwordHash: await hashPassword(E2E_ADMIN.password), role: 'admin' });
const [client] = await db.insert(clients).values({ name: 'Kebab Prova' }).returning();
await db.insert(projects).values({ clientId: client!.id, name: 'Sito Kebab Prova', status: 'in_sviluppo' });
await db.insert(leads).values([
  { name: 'Pizzeria Uno', source: 'n8n', status: 'nuovo', category: 'Pizzeria' },
  { name: 'Kebab Due', source: 'n8n', status: 'contattato', category: 'Kebab' },
  { name: 'Mario Rossi', email: 'mario@example.com', source: 'sito', status: 'nuovo', service: 'landing' }
]);

const api = createApp({ env, db, box: new SecretBox(env.CREDENTIALS_KEY), ai: null, storage: null, mailer: null });
const app = express();
// L'app API risponde 404 a tutto ciò che non è /api: le passiamo solo le sue rotte
app.use((req, res, next) => (req.path.startsWith('/api/') ? api(req, res, next) : next()));
app.use(express.static(webDir, { index: false }));
app.get(/^(?!\/api\/).*/, (_req, res) => { res.sendFile(path.join(webDir, 'index.html')); });

app.listen(port, () => { console.log(`E2E pronto su http://localhost:${port} (web: ${webDir})`); });
