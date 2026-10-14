import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { auditLog, leads, rateLimits, sessions, users } from '../src/db/schema.js';
import { PRIVACY_POLICY_VERSION, pseudonymIp } from '../src/lib/privacy.js';
import { applyRetention } from '../src/modules/retention/retention.js';
import { createUser, loggedIn, setup, type TestEnv } from './helpers.js';

let t: TestEnv;
beforeAll(async () => { t = await setup(); });
afterAll(() => t.handle.close());

const DAY = 86_400_000;

describe('privacy e minimizzazione', () => {
  it('lead dal sito: consenso registrato con versione, nessun IP salvato', async () => {
    const r = await request(t.app).post('/api/public/leads').set('X-Forwarded-For', '203.0.113.50').send({
      name: 'Anna Bianchi', email: 'anna@example.com', message: 'Vorrei un sito per il mio negozio', privacyAccepted: true
    });
    expect(r.status).toBe(202);
    const [row] = await t.ctx.db.select().from(leads).where(eq(leads.email, 'anna@example.com'));
    expect(row!.privacyVersion).toBe(PRIVACY_POLICY_VERSION);
    expect(row!.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(row)).not.toContain('203.0.113.50');
    const counters = await t.ctx.db.select().from(rateLimits);
    expect(counters.length).toBeGreaterThan(0);
    expect(JSON.stringify(counters)).not.toContain('203.0.113.50');
  });

  it('senza informativa accettata il lead è rifiutato', async () => {
    const r = await request(t.app).post('/api/public/leads').send({ name: 'Bob', email: 'bob@example.com', message: 'Messaggio di prova lungo', privacyAccepted: false });
    expect(r.status).toBe(400);
  });

  it('audit: IP pseudonimizzato con chiave (non è lo SHA-256 dell\'IP)', async () => {
    await createUser(t, 'admin@cf.it', 'admin');
    const admin = await loggedIn(t.app, 'admin@cf.it');
    await admin.post('/api/clients', { name: 'Cliente privacy' });
    const rows = await t.ctx.db.select({ ipHash: auditLog.ipHash }).from(auditLog);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.ipHash === null || r.ipHash.length === 22).toBe(true);
    expect(pseudonymIp('1.2.3.4')).not.toBe(pseudonymIp('1.2.3.5'));
    expect(pseudonymIp('1.2.3.4')).toBe(pseudonymIp('1.2.3.4'));
  });

  it('conservazione: cancella solo i dati scaduti, mai i clienti', async () => {
    const old = new Date(Date.now() - 800 * DAY);
    const [siteOld] = await t.ctx.db.insert(leads).values({ name: 'Vecchio sito', source: 'sito', status: 'perso' }).returning();
    const [prospectOld] = await t.ctx.db.insert(leads).values({ name: 'Vecchia attività', source: 'n8n', status: 'nuovo' }).returning();
    const [won] = await t.ctx.db.insert(leads).values({ name: 'Cliente acquisito', source: 'sito', status: 'convertito' }).returning();
    await t.ctx.db.update(leads).set({ updatedAt: old }).where(sql`${leads.id} in (${siteOld!.id}, ${prospectOld!.id}, ${won!.id})`);
    const [u] = await t.ctx.db.select({ id: users.id }).from(users).limit(1);
    await t.ctx.db.insert(sessions).values({ userId: u!.id, tokenHash: 'vecchia', expiresAt: old });

    const report = await applyRetention(t.ctx.db);
    expect(report['siteLeads']).toBe(1);
    expect(report['prospectLeads']).toBe(1);
    expect(report['sessions']).toBeGreaterThanOrEqual(1);
    const left = (await t.ctx.db.select({ name: leads.name }).from(leads)).map((l) => l.name);
    expect(left).toContain('Cliente acquisito');
    expect(left).toContain('Anna Bianchi');
    expect(left).not.toContain('Vecchio sito');
  });

  it('endpoint di conservazione: invisibile senza CRON_SECRET', async () => {
    expect((await request(t.app).get('/api/internal/retention')).status).toBe(404);
    expect((await request(t.app).get('/api/internal/retention').set('Authorization', 'Bearer qualcosa')).status).toBe(404);
  });
});
