import { randomBytes } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createDb, type DbHandle } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { users } from '../src/db/schema.js';
import { hashPassword, SecretBox } from '../src/lib/crypto.js';
import type { AppContext } from '../src/context.js';
import type { AiProvider } from '../src/modules/ai/provider.js';
import type { FileStorage } from '../src/lib/storage.js';
import type { Mailer } from '../src/lib/mailer.js';

export const PASSWORD = 'Password-Sicura-123';

export interface TestEnv { app: Express; ctx: AppContext; handle: DbHandle }

export const INGEST_TOKEN = 'test-ingest-token-0123456789abcdef';

export async function setup(ai: AiProvider | null = null, storage: FileStorage | null = null, mailer: Mailer | null = null, extra: Partial<Pick<AppContext, 'payments' | 'company'>> = {}): Promise<TestEnv> {
  const env = loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'pglite:memory',
    JWT_SECRET: randomBytes(32).toString('hex'),
    CREDENTIALS_KEY: randomBytes(32).toString('base64'),
    APP_URL: 'http://localhost:4200',
    AI_DAILY_LIMIT: '2',
    LEADS_INGEST_TOKEN: INGEST_TOKEN
  });
  const handle = await createDb(env.DATABASE_URL);
  await runMigrations(handle.db, env.DATABASE_URL);
  const ctx: AppContext = { env, db: handle.db, box: new SecretBox(env.CREDENTIALS_KEY), ai, storage, mailer, ...extra };
  return { app: createApp(ctx), ctx, handle };
}

export async function createUser(t: TestEnv, email: string, role: 'admin' | 'staff' | 'client', clientId: string | null = null) {
  const [u] = await t.ctx.db.insert(users).values({ email, name: email.split('@')[0]!, passwordHash: await hashPassword(PASSWORD), role, clientId }).returning();
  return u!;
}

/** Agente con cookie jar + header CSRF automatico, come il browser con HttpClient Angular. */
export class Client {
  readonly agent: ReturnType<typeof request.agent>;
  private csrf = '';
  constructor(app: Express) { this.agent = request.agent(app); }

  async init(): Promise<this> {
    const res = await this.agent.get('/api/health');
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = cookies.find((x) => x.startsWith('XSRF-TOKEN='));
    this.csrf = c ? decodeURIComponent(c.split(';')[0]!.split('=')[1]!) : '';
    return this;
  }
  get(url: string) { return this.agent.get(url); }
  post(url: string, body?: object) { return this.agent.post(url).set('X-XSRF-TOKEN', this.csrf).send(body ?? {}); }
  patch(url: string, body: object) { return this.agent.patch(url).set('X-XSRF-TOKEN', this.csrf).send(body); }
  delete(url: string) { return this.agent.delete(url).set('X-XSRF-TOKEN', this.csrf); }

  async login(email: string, password = PASSWORD): Promise<this> {
    const res = await this.post('/api/auth/login', { email, password });
    if (res.status !== 200) throw new Error(`login fallito ${res.status} ${JSON.stringify(res.body)}`);
    return this;
  }
}

export async function loggedIn(app: Express, email: string): Promise<Client> {
  return (await new Client(app).init()).login(email);
}
