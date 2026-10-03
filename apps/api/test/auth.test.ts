import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Client, createUser, PASSWORD, setup, type TestEnv } from './helpers.js';

let t: TestEnv;
beforeAll(async () => {
  t = await setup();
  await createUser(t, 'admin@cf.it', 'admin');
  await createUser(t, 'lock@cf.it', 'staff');
});
afterAll(() => t.handle.close());

describe('auth', () => {
  it('rifiuta richieste mutanti senza token CSRF', async () => {
    const c = await new Client(t.app).init();
    const res = await c.agent.post('/api/auth/login').send({ email: 'admin@cf.it', password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('csrf');
  });

  it('login, /me e cookie httpOnly', async () => {
    const c = await new Client(t.app).init();
    const res = await c.post('/api/auth/login', { email: 'ADMIN@cf.it', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies.find((x) => x.startsWith('cf_at='))).toMatch(/HttpOnly/);
    expect(cookies.find((x) => x.startsWith('cf_rt='))).toMatch(/Path=\/api\/auth/);
    const me = await c.get('/api/auth/me');
    expect(me.body.user.email).toBe('admin@cf.it');
    expect(JSON.stringify(me.body)).not.toContain('password');
  });

  it('credenziali errate → 401 generico, endpoint protetti → 401', async () => {
    const c = await new Client(t.app).init();
    expect((await c.post('/api/auth/login', { email: 'admin@cf.it', password: 'sbagliata' })).status).toBe(401);
    expect((await c.post('/api/auth/login', { email: 'nessuno@cf.it', password: 'x' })).status).toBe(401);
    expect((await c.get('/api/projects')).status).toBe(401);
  });

  it('blocca l\'account dopo 5 tentativi falliti', async () => {
    const c = await new Client(t.app).init();
    for (let i = 0; i < 5; i++) await c.post('/api/auth/login', { email: 'lock@cf.it', password: 'sbagliata' });
    const res = await c.post('/api/auth/login', { email: 'lock@cf.it', password: PASSWORD });
    expect(res.status).toBe(423);
  });

  it('refresh ruota il token e il riuso revoca tutte le sessioni', async () => {
    const c = await new Client(t.app).init();
    const login = await c.post('/api/auth/login', { email: 'admin@cf.it', password: PASSWORD });
    const oldRt = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((x) => x.startsWith('cf_rt='))!.split(';')[0]!;
    const r1 = await c.post('/api/auth/refresh');
    expect(r1.status).toBe(200);
    // Un attaccante riusa il vecchio refresh token
    const csrf = 'a'.repeat(32);
    const reuse = await request(t.app).post('/api/auth/refresh').set('Cookie', [oldRt, `XSRF-TOKEN=${csrf}`]).set('X-XSRF-TOKEN', csrf);
    expect(reuse.status).toBe(401);
    // Anche la sessione legittima è stata revocata
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });

  it('logout invalida la sessione', async () => {
    const c = await new Client(t.app).init();
    await c.login('admin@cf.it');
    expect((await c.post('/api/auth/logout')).status).toBe(204);
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });

  it('endpoint pericolosi del vecchio backend non esistono più (anche per admin)', async () => {
    const c = await new Client(t.app).init();
    await c.login('admin@cf.it');
    expect((await c.post('/api/seed-admin')).status).toBe(404);
    expect((await c.post('/api/fix-username-constraint')).status).toBe(404);
    expect((await c.post('/api/register', { email: 'x@y.it', password: 'x' })).status).toBe(404);
  });
});

describe('inviti', () => {
  it('admin invita, l\'utente accetta e accede; il link è monouso', async () => {
    const admin = await new Client(t.app).init();
    await admin.login('admin@cf.it');
    const inv = await admin.post('/api/users/invites', { email: 'staff2@cf.it', role: 'staff' });
    expect(inv.status).toBe(201);
    const token = inv.body.acceptUrl.split('/invito/')[1];
    const guest = await new Client(t.app).init();
    expect((await guest.get(`/api/auth/invite/${token}`)).body.email).toBe('staff2@cf.it');
    expect((await guest.post('/api/auth/invite/accept', { token, name: 'Staff Due', password: 'debole' })).status).toBe(400);
    const ok = await guest.post('/api/auth/invite/accept', { token, name: 'Staff Due', password: PASSWORD });
    expect(ok.status).toBe(201);
    expect(ok.body.user.role).toBe('staff');
    expect((await guest.post('/api/auth/invite/accept', { token, name: 'Altro', password: PASSWORD })).status).toBe(400);
  });

  it('un invito cliente senza cliente collegato viene rifiutato', async () => {
    const admin = await new Client(t.app).init();
    await admin.login('admin@cf.it');
    expect((await admin.post('/api/users/invites', { email: 'c@cf.it', role: 'client' })).status).toBe(400);
  });
});
