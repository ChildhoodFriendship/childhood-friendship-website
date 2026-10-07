import { parseArgs } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { passwordSchema } from '@cf/shared/schemas';
import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { clients, users } from '../db/schema.js';
import { hashPassword } from '../lib/crypto.js';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    clientName: { type: 'string' },
    password: { type: 'string' }
  }
});

const email = (values.email ?? 'sissy@sissyhairstyle.it').toLowerCase();
const name = values.name ?? 'Silvia (Sissy)';
const clientName = values.clientName ?? 'Sissy HairStyle';
const rawPassword = values.password ?? process.env['CLIENT_PASSWORD'] ?? 'Sissy2026!';

const check = passwordSchema.safeParse(rawPassword);
if (!check.success) {
  console.error(check.error.issues.map((i) => i.message).join(', '));
  process.exit(1);
}

const env = loadEnv();
const handle = await createDb(env.DATABASE_URL);

// 1. Cerca il cliente nel database
const [client] = await handle.db
  .select({ id: clients.id, name: clients.name })
  .from(clients)
  .where(eq(sql`lower(${clients.name})`, clientName.toLowerCase()));

if (!client) {
  console.error(`Cliente '${clientName}' non trovato nel database.`);
  await handle.close();
  process.exit(1);
}

const passwordHash = await hashPassword(check.data);
const [existing] = await handle.db
  .select({ id: users.id })
  .from(users)
  .where(eq(sql`lower(${users.email})`, email));

if (existing) {
  await handle.db
    .update(users)
    .set({
      passwordHash,
      role: 'client',
      clientId: client.id,
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
      name
    })
    .where(eq(users.id, existing.id));
  console.log(`Utente cliente aggiornato: ${email} (Cliente: ${client.name}, ID: ${client.id})`);
} else {
  await handle.db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      role: 'client',
      clientId: client.id,
      isActive: true
    });
  console.log(`Utente cliente creato con successo: ${email} (Cliente: ${client.name}, ID: ${client.id})`);
}

await handle.close();
