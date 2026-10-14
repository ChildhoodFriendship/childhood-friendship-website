import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { credentials } from '../src/db/schema.js';
import { createUser, loggedIn, setup, type Client, type TestEnv } from './helpers.js';

let t: TestEnv;
let admin: Client, staff: Client, clientA: Client, clientB: Client;
let clientAId: string, clientBId: string, projectA: string, projectB: string;

beforeAll(async () => {
  t = await setup();
  await createUser(t, 'admin@cf.it', 'admin');
  await createUser(t, 'staff@cf.it', 'staff');
  admin = await loggedIn(t.app, 'admin@cf.it');
  staff = await loggedIn(t.app, 'staff@cf.it');
  clientAId = (await admin.post('/api/clients', { name: 'Pizzeria Alfa' })).body.id;
  clientBId = (await admin.post('/api/clients', { name: 'Ottica Beta', oldWebsite: '' })).body.id;
  projectA = (await admin.post('/api/projects', { clientId: clientAId, name: 'Sito Alfa', deadline: '2030-01-31', startDate: '2029-10-01' })).body.id;
  projectB = (await admin.post('/api/projects', { clientId: clientBId, name: 'Sito Beta', withTemplate: false })).body.id;
  await createUser(t, 'alfa@cliente.it', 'client', clientAId);
  await createUser(t, 'beta@cliente.it', 'client', clientBId);
  clientA = await loggedIn(t.app, 'alfa@cliente.it');
  clientB = await loggedIn(t.app, 'beta@cliente.it');
});
afterAll(() => t.handle.close());

describe('progetti e template', () => {
  it('crea 22 documenti e 22 task collegati', async () => {
    const docs = await admin.get(`/api/projects/${projectA}/documents`);
    const tasks = await admin.get(`/api/projects/${projectA}/tasks`);
    expect(docs.body).toHaveLength(22);
    expect(tasks.body).toHaveLength(22);
    expect(tasks.body.every((x: { documentId: string | null }) => x.documentId)).toBe(true);
    const p = await admin.get(`/api/projects/${projectA}`);
    expect(p.body.progress).toEqual({ tasksDone: 0, tasksTotal: 22, documentsApproved: 0, documentsTotal: 22 });
    expect(p.body.clientName).toBe('Pizzeria Alfa');
  });

  it('valida input e date', async () => {
    expect((await admin.post('/api/projects', { clientId: clientAId, name: '' })).status).toBe(400);
    expect((await admin.post('/api/projects', { clientId: clientAId, name: 'X', startDate: '2030-02-01', deadline: '2030-01-01' })).status).toBe(400);
    expect((await admin.get('/api/projects/non-un-uuid')).status).toBe(400);
  });

  it('filtri e ricerca', async () => {
    const res = await admin.get('/api/projects?q=beta');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Sito Beta');
  });
});

describe('isolamento clienti', () => {
  it('il cliente vede solo i propri progetti', async () => {
    const list = await clientA.get('/api/projects');
    expect(list.body.items.map((p: { id: string }) => p.id)).toEqual([projectA]);
    expect((await clientA.get(`/api/projects/${projectB}`)).status).toBe(404);
    expect((await clientB.get(`/api/projects/${projectA}/documents`)).status).toBe(404);
    expect((await clientB.get(`/api/projects/${projectA}/messages`)).status).toBe(404);
  });

  it('il cliente non accede alle aree del team', async () => {
    expect((await clientA.get('/api/clients')).status).toBe(403);
    expect((await clientA.get('/api/leads')).status).toBe(403);
    expect((await clientA.get('/api/dashboard')).status).toBe(403);
    expect((await clientA.get(`/api/projects/${projectA}/credentials`)).status).toBe(403);
    expect((await clientA.get(`/api/projects/${projectA}/marketing/campaigns`)).status).toBe(403);
    expect((await clientA.patch(`/api/projects/${projectA}`, { name: 'hack' })).status).toBe(403);
    expect((await clientA.post(`/api/projects/${projectA}/tasks`, { title: 'hack' })).status).toBe(403);
  });

  it('documenti interni nascosti al cliente', async () => {
    const team = (await admin.get(`/api/projects/${projectA}/documents`)).body as { id: string; type: string }[];
    const internal = team.find((d) => d.type === 'sviluppo')!;
    const visible = (await clientA.get(`/api/projects/${projectA}/documents`)).body as { id: string }[];
    expect(visible.length).toBeLessThan(team.length);
    expect(visible.some((d) => d.id === internal.id)).toBe(false);
    expect((await clientA.get(`/api/projects/${projectA}/documents/${internal.id}`)).status).toBe(404);
  });

  it('messaggi tra team e cliente', async () => {
    expect((await clientA.post(`/api/projects/${projectA}/messages`, { body: 'Ciao, quando partiamo?' })).status).toBe(201);
    expect((await admin.post(`/api/projects/${projectA}/messages`, { body: 'Lunedì!' })).status).toBe(201);
    expect((await clientA.post(`/api/projects/${projectA}/messages`, { body: '   ' })).status).toBe(400);
    const msgs = await clientA.get(`/api/projects/${projectA}/messages`);
    expect(msgs.body.map((m: { body: string }) => m.body)).toEqual(['Ciao, quando partiamo?', 'Lunedì!']);
    expect(msgs.body[1].authorRole).toBe('admin');
  });

  it('un cliente disattivato perde l\'accesso subito', async () => {
    const users = (await admin.get('/api/users')).body as { id: string; email: string }[];
    const beta = users.find((u) => u.email === 'beta@cliente.it')!;
    expect((await admin.patch(`/api/users/${beta.id}`, { isActive: false })).status).toBe(200);
    expect((await clientB.get('/api/projects')).status).toBe(401);
  });
});

describe('flusso documento', () => {
  it('modifica con controllo di versione, revisione cliente, task completato', async () => {
    const docs = (await admin.get(`/api/projects/${projectA}/documents`)).body as { id: string; type: string }[];
    const obiettivi = docs.find((d) => d.type === 'definizioneObiettivi')!;
    const url = `/api/projects/${projectA}/documents/${obiettivi.id}`;

    expect((await admin.patch(url, { baseVersion: 1, data: { campoInventato: 'x' } })).status).toBe(400);
    const v2 = await admin.patch(url, { baseVersion: 1, content: '## Obiettivi\n- 10 lead/mese', data: { obiettiviPrincipali: ['Più prenotazioni'] } });
    expect(v2.status).toBe(200);
    expect(v2.body.version).toBe(2);
    expect((await staff.patch(url, { baseVersion: 1, content: 'sovrascrivo' })).status).toBe(409);

    expect((await clientA.post(`${url}/review`, { decision: 'approve' })).status).toBe(400); // non ancora in revisione
    expect((await admin.post(`${url}/submit`)).status).toBe(200);
    expect((await clientA.post(`${url}/review`, { decision: 'request_changes' })).status).toBe(400); // commento obbligatorio
    const approved = await clientA.post(`${url}/review`, { decision: 'approve', comment: 'Perfetto' });
    expect(approved.body.status).toBe('approvato');

    const tasks = (await admin.get(`/api/projects/${projectA}/tasks`)).body as { documentId: string; done: boolean }[];
    expect(tasks.find((x) => x.documentId === obiettivi.id)!.done).toBe(true);
    const versions = await admin.get(`${url}/versions`);
    expect(versions.body[0].version).toBe(1);
    expect((await clientA.get(`${url}/versions`)).status).toBe(403);
  });
});

describe('credenziali', () => {
  it('cifrate a riposo, rivelate solo dall\'admin con audit', async () => {
    const base = `/api/projects/${projectA}/credentials`;
    const created = await staff.post(base, { service: 'WordPress', username: 'admin', secret: 'S3greto!Cliente' });
    expect(created.status).toBe(201);
    expect(created.body.hasSecret).toBe(true);
    expect(JSON.stringify(created.body)).not.toContain('S3greto');
    const [row] = await t.ctx.db.select().from(credentials).where(eq(credentials.id, created.body.id));
    expect(row!.secretEnc).not.toContain('S3greto');
    expect((await staff.post(`${base}/${created.body.id}/reveal`)).status).toBe(403);
    const revealed = await admin.post(`${base}/${created.body.id}/reveal`);
    expect(revealed.body.secret).toBe('S3greto!Cliente');
    const audit = await admin.get(`/api/audit?entity=credential&entityId=${created.body.id}`);
    expect(audit.body.items.map((a: { action: string }) => a.action)).toContain('credential.revealed');
  });
});

describe('archiviazione', () => {
  it('progetto archiviato in sola lettura, eliminabile solo dopo archiviazione', async () => {
    expect((await admin.delete(`/api/projects/${projectB}`)).status).toBe(400);
    expect((await admin.post(`/api/projects/${projectB}/archive`)).status).toBe(200);
    expect((await admin.post(`/api/projects/${projectB}/tasks`, { title: 'x' })).status).toBe(403);
    expect((await staff.delete(`/api/projects/${projectB}`)).status).toBe(403);
    expect((await admin.delete(`/api/projects/${projectB}`)).status).toBe(204);
  });
});

describe('dati interni nascosti al cliente', () => {
  const hidden = ['stagingUrl', 'repositoryUrl', 'marketingEnabled', 'marketingBudgetCents', 'indexingStatus'];

  it('progetto senza repo, staging, budget e indicizzazione', async () => {
    expect((await admin.patch(`/api/projects/${projectA}`, {
      repositoryUrl: 'https://github.com/cf/alfa', stagingUrl: 'https://staging.alfa.it', marketingEnabled: true, marketingBudgetCents: 50000
    })).status).toBe(200);
    const team = (await admin.get(`/api/projects/${projectA}`)).body as Record<string, unknown>;
    expect(team['repositoryUrl']).toBe('https://github.com/cf/alfa');
    const mine = (await clientA.get(`/api/projects/${projectA}`)).body as Record<string, unknown>;
    const list = (await clientA.get('/api/projects')).body.items[0] as Record<string, unknown>;
    for (const k of hidden) {
      expect(mine).not.toHaveProperty(k);
      expect(list).not.toHaveProperty(k);
    }
    expect(mine['name']).toBe('Sito Alfa');
    expect(JSON.stringify(mine)).not.toContain('github.com');
  });

  it('task: niente assegnatari né task di documenti interni, avanzamento coerente', async () => {
    const team = (await admin.get(`/api/projects/${projectA}/tasks`)).body as { documentId: string | null }[];
    const visibleDocs = new Set(((await clientA.get(`/api/projects/${projectA}/documents`)).body as { id: string }[]).map((d) => d.id));
    const mine = (await clientA.get(`/api/projects/${projectA}/tasks`)).body as Record<string, unknown>[];
    expect(mine.length).toBeLessThan(team.length);
    expect(mine.every((x) => !('assigneeId' in x))).toBe(true);
    expect(mine.every((x) => x['documentId'] === null || visibleDocs.has(x['documentId'] as string))).toBe(true);
    const p = (await clientA.get(`/api/projects/${projectA}`)).body as { progress: { tasksTotal: number; documentsTotal: number } };
    expect(p.progress.tasksTotal).toBe(mine.length);
    expect(p.progress.documentsTotal).toBe(visibleDocs.size);
  });

  it('appuntamenti senza note interne', async () => {
    const created = await admin.post(`/api/projects/${projectA}/appointments`, { title: 'Call di allineamento', startsAt: '2030-01-10T10:00:00.000Z', notes: 'Cliente lento sui pagamenti' });
    expect(created.status).toBe(201);
    expect((await admin.get(`/api/projects/${projectA}/appointments`)).body[0].notes).toBe('Cliente lento sui pagamenti');
    const mine = (await clientA.get(`/api/projects/${projectA}/appointments`)).body as Record<string, unknown>[];
    expect(mine[0]!['title']).toBe('Call di allineamento');
    expect(mine[0]).not.toHaveProperty('notes');
  });
});
