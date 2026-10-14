import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FileStorage, StoredFileInfo } from '../src/lib/storage.js';
import { createUser, INGEST_TOKEN, loggedIn, setup, type Client, type TestEnv } from './helpers.js';

/** Archivio finto: i "caricamenti" sono simulati scrivendo direttamente nella mappa. */
class FakeStorage implements FileStorage {
  readonly files = new Map<string, StoredFileInfo>();
  readonly removed: string[] = [];
  async createUploadToken(pathname: string) { return `tok:${pathname}`; }
  async head(pathname: string) { return this.files.get(pathname) ?? null; }
  async remove(url: string) { this.removed.push(url); }
  upload(pathname: string, size = 2048, contentType = 'image/png') {
    this.files.set(pathname, { pathname, size, contentType, url: `https://blob.example/${pathname}` });
  }
}

let t: TestEnv;
const store = new FakeStorage();
let admin: Client, clientA: Client, clientB: Client;
let projectA: string;

beforeAll(async () => {
  t = await setup(null, store);
  await createUser(t, 'admin@cf.it', 'admin');
  admin = await loggedIn(t.app, 'admin@cf.it');
  const a = (await admin.post('/api/clients', { name: 'Kebab Alfa' })).body.id;
  const b = (await admin.post('/api/clients', { name: 'Pizzeria Beta' })).body.id;
  projectA = (await admin.post('/api/projects', { clientId: a, name: 'Sito Kebab', withTemplate: false })).body.id;
  await createUser(t, 'alfa@cliente.it', 'client', a);
  await createUser(t, 'beta@cliente.it', 'client', b);
  clientA = await loggedIn(t.app, 'alfa@cliente.it');
  clientB = await loggedIn(t.app, 'beta@cliente.it');
});
afterAll(() => t.handle.close());

const ingest = (path: string, body?: object, token = INGEST_TOKEN) => {
  const r = body ? request(t.app).post(`/api/integrations${path}`).send(body) : request(t.app).get(`/api/integrations${path}`);
  return token ? r.set('Authorization', `Bearer ${token}`) : r;
};

describe('CRM unico: lead da n8n', () => {
  const lead = { placeId: 'ChIJ-test-1', name: 'İstanbul kebap', category: 'Kebab', address: 'Via Roma 37, Piove di Sacco', phone: '+39 380 000 0000', score: 65, signals: 'nessun sito', outreachMessage: 'Ciao!', mapsUrl: 'https://maps.google.com/?q=x' };

  it('senza token o con token errato: rifiutato', async () => {
    expect((await ingest('/leads/place-ids', undefined, '')).status).toBe(401);
    expect((await ingest('/leads/place-ids', undefined, 'sbagliato-sbagliato-sbagliato')).status).toBe(401);
  });

  it('inserisce, deduplica per placeId e li mostra nella pagina Lead', async () => {
    expect((await ingest('/leads', { leads: [lead] })).body).toEqual({ received: 1, inserted: 1 });
    expect((await ingest('/leads', { leads: [lead, { ...lead, placeId: 'ChIJ-test-2', name: 'Noor Grill' }] })).body).toEqual({ received: 2, inserted: 1 });
    expect((await ingest('/leads/place-ids')).body.sort()).toEqual(['ChIJ-test-1', 'ChIJ-test-2']);
    const list = await admin.get('/api/leads?source=n8n&q=kebap');
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ name: 'İstanbul kebap', email: null, score: 65, source: 'n8n', status: 'nuovo' });
  });

  it('stato dal bot, prezzo e servizio dall\'admin, statistiche', async () => {
    const st = await ingest('/leads/status', { placeId: 'ChIJ-test-1', status: 'convertito' });
    expect(st.body).toMatchObject({ name: 'İstanbul kebap', status: 'convertito' });
    const id = (await admin.get('/api/leads?q=kebap')).body.items[0].id;
    const patched = await admin.patch(`/api/leads/${id}`, { priceCents: 40000, offeredService: 'Sito vetrina' });
    expect(patched.body).toMatchObject({ priceCents: 40000, offeredService: 'Sito vetrina', status: 'convertito' });
    expect(patched.body.closedAt).toBeTruthy();
    expect(patched.body.contactedAt).toBeTruthy();
    const stats = (await ingest('/leads/stats')).body;
    expect(stats).toMatchObject({ tot: 2, nuovi: 1, chiusi: 1, fatturatoCents: 40000 });
    expect((await clientA.get('/api/leads')).status).toBe(403);
  });
});

describe('materiali del progetto', () => {
  it('il cliente carica, vede e registra solo nel proprio progetto', async () => {
    const tok = await clientA.post(`/api/projects/${projectA}/files/upload-token`, { name: 'Logo Kebab.png', contentType: 'image/png', size: 2048 });
    expect(tok.status).toBe(200);
    expect(tok.body.pathname).toMatch(new RegExp(`^projects/${projectA}/[0-9a-f]{16}-logo-kebab\\.png$`));
    expect((await clientB.post(`/api/projects/${projectA}/files/upload-token`, { name: 'x.png', contentType: 'image/png', size: 10 })).status).toBe(404);
    expect((await clientA.post(`/api/projects/${projectA}/files/upload-token`, { name: 'x.exe', contentType: 'application/x-msdownload', size: 10 })).status).toBe(400);
    expect((await clientA.post(`/api/projects/${projectA}/files/upload-token`, { name: 'big.mp4', contentType: 'video/mp4', size: 30 * 1024 * 1024 })).status).toBe(400);

    // non ancora caricato su Blob
    expect((await clientA.post(`/api/projects/${projectA}/files`, { pathname: tok.body.pathname, name: 'Logo Kebab.png' })).status).toBe(400);
    store.upload(tok.body.pathname);
    const reg = await clientA.post(`/api/projects/${projectA}/files`, { pathname: tok.body.pathname, name: 'Logo Kebab.png' });
    expect(reg.status).toBe(201);
    expect(reg.body).toMatchObject({ name: 'Logo Kebab.png', sizeBytes: 2048, contentType: 'image/png', uploadedByRole: 'client' });
    // percorso di un altro progetto: rifiutato
    expect((await clientA.post(`/api/projects/${projectA}/files`, { pathname: 'projects/altro/x.png', name: 'x' })).status).toBe(400);

    const listTeam = await admin.get(`/api/projects/${projectA}/files`);
    expect(listTeam.body).toHaveLength(1);
    expect((await clientB.get(`/api/projects/${projectA}/files`)).status).toBe(404);
  });

  it('il cliente elimina solo i propri file, il team tutti', async () => {
    const tok = await admin.post(`/api/projects/${projectA}/files/upload-token`, { name: 'bozza.pdf', contentType: 'application/pdf', size: 4096 });
    store.upload(tok.body.pathname, 4096, 'application/pdf');
    const teamFile = (await admin.post(`/api/projects/${projectA}/files`, { pathname: tok.body.pathname, name: 'bozza.pdf' })).body;
    const clientFile = ((await clientA.get(`/api/projects/${projectA}/files`)).body as { id: string; uploadedByRole: string }[]).find((f) => f.uploadedByRole === 'client')!;
    expect((await clientA.delete(`/api/projects/${projectA}/files/${teamFile.id}`)).status).toBe(403);
    expect((await clientA.delete(`/api/projects/${projectA}/files/${clientFile.id}`)).status).toBe(204);
    expect((await admin.delete(`/api/projects/${projectA}/files/${teamFile.id}`)).status).toBe(204);
    expect(store.removed).toHaveLength(2);
    expect((await admin.get(`/api/projects/${projectA}/files`)).body).toHaveLength(0);
  });

  it('senza archivio configurato risponde 503', async () => {
    const t2 = await setup(null, null);
    await createUser(t2, 'admin2@cf.it', 'admin');
    const a2 = await loggedIn(t2.app, 'admin2@cf.it');
    const c = (await a2.post('/api/clients', { name: 'X' })).body.id;
    const p = (await a2.post('/api/projects', { clientId: c, name: 'P', withTemplate: false })).body.id;
    expect((await a2.post(`/api/projects/${p}/files/upload-token`, { name: 'a.png', contentType: 'image/png', size: 10 })).status).toBe(503);
    await t2.handle.close();
  });
});
