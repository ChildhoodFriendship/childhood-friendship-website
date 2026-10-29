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

  return { ctx: { env, db: handle.db, box: new SecretBox(env.CREDENTIALS_KEY), ai: createAiProvider(env), storage: createBlobStorage(env), mailer: createMailer(env) }, handle };
}
