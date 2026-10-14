import type { Env } from './config/env.js';
import type { Database } from './db/client.js';
import type { SecretBox } from './lib/crypto.js';
import type { AiProvider } from './modules/ai/provider.js';
import type { FileStorage } from './lib/storage.js';
import type { Mailer } from './lib/mailer.js';

/** Dipendenze iniettate nell'app: rende i test indipendenti dall'ambiente. */
export interface AppContext {
  env: Env;
  db: Database;
  box: SecretBox;
  ai: AiProvider | null;
  /** Archivio file (Vercel Blob); null se non configurato. */
  storage?: FileStorage | null;
  /** Email transazionali (Resend); null se non configurato. */
  mailer?: Mailer | null;
}
