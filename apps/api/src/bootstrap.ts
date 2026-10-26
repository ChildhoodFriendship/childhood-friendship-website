import { sql } from 'drizzle-orm';
import { loadEnv } from './config/env.js';
import { createDb, type DbHandle } from './db/client.js';
import { SecretBox } from './lib/crypto.js';
import { createAiProvider } from './modules/ai/provider.js';
import { createBlobStorage } from './lib/storage.js';
import { createMailer } from './lib/mailer.js';
import type { AppContext } from './context.js';

export async function buildContext(): Promise<{ ctx: AppContext; handle: DbHandle }> {
  const env = loadEnv();
  const handle = await createDb(env.DATABASE_URL);

  // Assicura che le nuove colonne per le scadenze e l'acconto pagato siano presenti (idempotente)
  try {
    await handle.db.execute(sql`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "paid_amount_cents" integer;
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "payment_deadline" text;
      UPDATE "projects" SET "status" = 'in_sviluppo' WHERE "status"::text NOT IN ('in_sviluppo', 'lanciato');
    `);
  } catch (err) {
    console.warn('[db] Auto-migration columns warning:', err);
  }

  return { ctx: { env, db: handle.db, box: new SecretBox(env.CREDENTIALS_KEY), ai: createAiProvider(env), storage: createBlobStorage(env), mailer: createMailer(env) }, handle };
}
