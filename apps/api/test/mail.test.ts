import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MailMessage, Mailer } from '../src/lib/mailer.js';
import { renderMail } from '../src/lib/mailer.js';
import { createUser, loggedIn, setup, type Client, type TestEnv } from './helpers.js';

class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  async send(msg: MailMessage) { this.sent.push(msg); return true; }
}

let t: TestEnv;
const mailer = new FakeMailer();
let admin: Client, client: Client;
let projectId: string, clientId: string;

beforeAll(async () => {
  t = await setup(null, null, mailer);
  await createUser(t, 'admin@cf.it', 'admin');
  admin = await loggedIn(t.app, 'admin@cf.it');
  clientId = (await admin.post('/api/clients', { name: 'Pizzeria Gamma' })).body.id;
  projectId = (await admin.post('/api/projects', { clientId, name: 'Sito Gamma' })).body.id;
  await createUser(t, 'gamma@cliente.it', 'client', clientId);
  client = await loggedIn(t.app, 'gamma@cliente.it');
});
afterAll(() => t.handle.close());

describe('email transazionali', () => {
  it('invito: email all\'invitato con il link personale', async () => {
    mailer.sent.length = 0;
    const r = await admin.post('/api/users/invites', { email: 'nuovo@cliente.it', role: 'client', clientId });
    expect(r.status).toBe(201);
    expect(r.body.emailSent).toBe(true);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toEqual(['nuovo@cliente.it']);
    expect(mailer.sent[0]!.text).toContain(r.body.acceptUrl);
    expect(r.body.acceptUrl).toMatch(/^http:\/\/localhost:4200\/invito\/[\w-]+$/);
  });

  it('messaggio del team: email al cliente; messaggio del cliente: nessuna email', async () => {
    mailer.sent.length = 0;
    await admin.post(`/api/projects/${projectId}/messages`, { body: 'Ecco la bozza <b>della home</b>' });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toEqual(['gamma@cliente.it']);
    expect(mailer.sent[0]!.html).toContain('&lt;b&gt;della home&lt;/b&gt;');
    expect(mailer.sent[0]!.html).not.toContain('<b>della home</b>');
    await client.post(`/api/projects/${projectId}/messages`, { body: 'Grazie!' });
    expect(mailer.sent).toHaveLength(1);
  });

  it('documento inviato in revisione: email al cliente con il link al documento', async () => {
    mailer.sent.length = 0;
    const doc = (await admin.get(`/api/projects/${projectId}/documents`)).body.find((d: { clientVisible: boolean }) => d.clientVisible);
    expect((await admin.post(`/api/projects/${projectId}/documents/${doc.id}/submit`)).status).toBe(200);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.text).toContain(`/portale/progetti/${projectId}/documenti/${doc.id}`);
  });

  it('il modello escapa testo e URL', () => {
    const m = renderMail({ subject: 's', heading: '<script>', paragraphs: ['a & b'], url: 'https://x.it/?a="b"', cta: 'Vai' });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('a &amp; b');
    expect(m.html).toContain('href="https://x.it/?a=&quot;b&quot;"');
  });
});
