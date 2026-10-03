/**
 * Crea (o reimposta) un amministratore da riga di comando. Sostituisce /api/seed-admin.
 * Uso: npm run admin:create -- --email tu@dominio.it --name "Lorenzo"
 * La password viene chiesta in modo interattivo (o letta da ADMIN_PASSWORD per la CI).
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { eq, sql } from 'drizzle-orm';
import { passwordSchema } from '@cf/shared/schemas';
import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { users } from '../db/schema.js';
import { hashPassword } from '../lib/crypto.js';

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
if (!values.email || !values.name) {
  console.error('Uso: npm run admin:create -- --email <email> --name <nome>');
  process.exit(1);
}

let password = process.env['ADMIN_PASSWORD'];
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question('Password (min 10 caratteri, maiuscola, minuscola, numero): ');
  rl.close();
}
const check = passwordSchema.safeParse(password);
if (!check.success) {
  console.error(check.error.issues.map((i) => i.message).join(', '));
  process.exit(1);
}

const env = loadEnv();
const handle = await createDb(env.DATABASE_URL);
if (env.DATABASE_URL.startsWith('pglite:')) await runMigrations(handle.db, env.DATABASE_URL);
const email = values.email.toLowerCase();
const passwordHash = await hashPassword(check.data);
const [existing] = await handle.db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, email));
if (existing) {
  await handle.db.update(users).set({ passwordHash, role: 'admin', isActive: true, failedLogins: 0, lockedUntil: null, name: values.name }).where(eq(users.id, existing.id));
  console.log(`Admin aggiornato: ${email}`);
} else {
  await handle.db.insert(users).values({ email, name: values.name, passwordHash, role: 'admin' });
  console.log(`Admin creato: ${email}`);
}
await handle.close();
