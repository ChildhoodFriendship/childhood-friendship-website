import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { invoices, payments } from '../src/db/schema.js';
import { createUser, loggedIn, setup, type Client, type TestEnv } from './helpers.js';

let t: TestEnv;
let admin: Client, clientA: Client, clientB: Client;
let projectA: string, clientIdA: string;

beforeAll(async () => {
  t = await setup();
  await createUser(t, 'admin@cf.it', 'admin');
  admin = await loggedIn(t.app, 'admin@cf.it');
  clientIdA = (await admin.post('/api/clients', { name: 'Kebab Alfa' })).body.id;
  const b = (await admin.post('/api/clients', { name: 'Pizzeria Beta' })).body.id;
  projectA = (await admin.post('/api/projects', { clientId: clientIdA, name: 'Sito Kebab', withTemplate: false })).body.id;
  await createUser(t, 'alfa@cliente.it', 'client', clientIdA);
  await createUser(t, 'beta@cliente.it', 'client', b);
  clientA = await loggedIn(t.app, 'alfa@cliente.it');
  clientB = await loggedIn(t.app, 'beta@cliente.it');
});
afterAll(() => t.handle.close());

describe('incassi e fatture', () => {
  it('lettura per team e cliente del progetto, senza id del provider', async () => {
    const [pay] = await t.ctx.db.insert(payments).values({
      projectId: projectA, clientId: clientIdA, tranche: 'acconto', provider: 'stripe',
      providerPaymentId: 'pi_segreto_123', amountCents: 20000, status: 'riuscito', paidAt: new Date(), metadata: { session: 'cs_x' }
    }).returning();
    await t.ctx.db.insert(invoices).values({
      projectId: projectA, clientId: clientIdA, paymentId: pay!.id, provider: 'fic', providerInvoiceId: 'fic-1',
      number: '1/2027', issueDate: '2027-01-10', amountCents: 20000, status: 'consegnata'
    });

    for (const who of [admin, clientA]) {
      const p = await who.get(`/api/projects/${projectA}/billing/payments`);
      expect(p.status).toBe(200);
      expect(p.body.items).toHaveLength(1);
      expect(p.body.items[0]).toMatchObject({ tranche: 'acconto', amountCents: 20000, status: 'riuscito' });
      expect(p.body.items[0]).not.toHaveProperty('providerPaymentId');
      expect(p.body.items[0]).not.toHaveProperty('metadata');
      const i = await who.get(`/api/projects/${projectA}/billing/invoices`);
      expect(i.body.items[0]).toMatchObject({ number: '1/2027', status: 'consegnata', paymentId: pay!.id });
      expect(i.body.items[0]).not.toHaveProperty('providerInvoiceId');
    }
  });

  it('un altro cliente non vede nulla', async () => {
    expect((await clientB.get(`/api/projects/${projectA}/billing/payments`)).status).toBe(404);
    expect((await clientB.get(`/api/projects/${projectA}/billing/invoices`)).status).toBe(404);
  });

  it('nessuna scrittura dal browser: pagamenti e numeri fattura solo dal provider', async () => {
    expect((await clientA.post(`/api/projects/${projectA}/billing/payments`, { amountCents: 1 })).status).toBe(404);
    expect((await admin.post(`/api/projects/${projectA}/billing/invoices`, { number: '99' })).status).toBe(404);
  });

  it('importi non positivi rifiutati dal database', async () => {
    await expect(t.ctx.db.insert(payments).values({
      projectId: projectA, clientId: clientIdA, provider: 'stripe', providerPaymentId: 'pi_zero', amountCents: 0
    })).rejects.toThrow();
  });

  it('id del provider univoco: webhook ripetuto non duplica l\'incasso', async () => {
    await expect(t.ctx.db.insert(payments).values({
      projectId: projectA, clientId: clientIdA, provider: 'stripe', providerPaymentId: 'pi_segreto_123', amountCents: 20000
    })).rejects.toThrow();
  });
});

describe('firma del contratto', () => {
  it('la tabella esiste: il cliente firma e la firma si rilegge', async () => {
    const sign = await clientA.post(`/api/projects/${projectA}/contract/sign`, { signerName: 'Mario Rossi', vexatiousAccepted: true });
    expect(sign.status).toBe(201);
    const get = await clientA.get(`/api/projects/${projectA}/contract`);
    expect(get.body.signed).toBe(true);
    expect(get.body.signature).toMatchObject({ signerName: 'Mario Rossi', signerEmail: 'alfa@cliente.it' });
  });
});
