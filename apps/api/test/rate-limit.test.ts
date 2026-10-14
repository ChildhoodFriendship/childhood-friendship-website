import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type DbHandle } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { sharedLimiter } from '../src/lib/rate-limit.js';

let h: DbHandle;
beforeAll(async () => {
  h = await createDb('pglite:memory');
  await runMigrations(h.db, 'pglite:memory');
});
afterAll(() => h.close());

/** Due "istanze" dell'app con lo stesso database: il limite deve valere per entrambe. */
const instance = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/login', sharedLimiter(h.db, 'login-test', 60_000, 3, 'stop'), (_req, res) => { res.json({ ok: true }); });
  return app;
};

describe('rate limit condiviso', () => {
  it('conta i tentativi su tutte le istanze', async () => {
    const a = instance();
    const b = instance();
    const ip = { 'X-Forwarded-For': '203.0.113.7' };
    expect((await request(a).post('/login').set(ip)).status).toBe(200);
    expect((await request(b).post('/login').set(ip)).status).toBe(200);
    expect((await request(a).post('/login').set(ip)).status).toBe(200);
    const blocked = await request(b).post('/login').set(ip);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: 'rate_limited', message: 'stop' } });
    // un altro IP non è toccato
    expect((await request(b).post('/login').set({ 'X-Forwarded-For': '198.51.100.9' })).status).toBe(200);
  });
});
