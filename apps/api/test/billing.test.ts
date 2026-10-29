import { createHash, createHmac } from 'node:crypto';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COMPANY } from '@cf/shared/company';
import { buildContract, contractPlainText } from '@cf/shared/contract';
import { contractSignatures, payments } from '../src/db/schema.js';
import type { Env } from '../src/config/env.js';
import { createStripeGateway, type PaymentGateway } from '../src/lib/payments.js';
import { createUser, loggedIn, setup, type Client, type TestEnv } from './helpers.js';

const QUOTE = [
  { id: 'a', name: 'Sito web', priceCents: 40000, monthly: false },
  { id: 'b', name: 'Modulo contatti', priceCents: 15000, monthly: false },
  { id: 'c', name: 'Manutenzione', priceCents: 2000, monthly: true }
];

interface World { t: TestEnv; admin: Client; clientA: Client; clientB: Client; projectA: string; clientIdA: string }

async function world(extra: Parameters<typeof setup>[3] = {}): Promise<World> {
  const t = await setup(null, null, null, extra);
  await createUser(t, 'admin@cf.it', 'admin');
  const admin = await loggedIn(t.app, 'admin@cf.it');
  const clientIdA = (await admin.post('/api/clients', { name: 'Kebab Alfa' })).body.id;
  const b = (await admin.post('/api/clients', { name: 'Pizzeria Beta' })).body.id;
  const projectA = (await admin.post('/api/projects', { clientId: clientIdA, name: 'Sito Kebab', withTemplate: false })).body.id;
  await createUser(t, 'alfa@cliente.it', 'client', clientIdA);
  await createUser(t, 'beta@cliente.it', 'client', b);
  return { t, admin, clientA: await loggedIn(t.app, 'alfa@cliente.it'), clientB: await loggedIn(t.app, 'beta@cliente.it'), projectA, clientIdA };
}

describe('senza partita IVA: firma sì, incassi online e fatture no', () => {
  let w: World;
  beforeAll(async () => { w = await world(); });
  afterAll(() => w.t.handle.close());

  it('il contratto non si firma senza preventivo', async () => {
    const r = await w.clientA.post(`/api/projects/${w.projectA}/contract/sign`, { signerName: 'Mario Rossi', vexatiousAccepted: true });
    expect(r.status).toBe(409);
  });

  it('riepilogo: forfettario senza IVA, acconto e saldo con bollo', async () => {
    expect((await w.admin.patch(`/api/projects/${w.projectA}`, { quoteItems: QUOTE })).status).toBe(200);
    const s = (await w.clientA.get(`/api/projects/${w.projectA}/billing/summary`)).body;
    expect(s).toMatchObject({ currency: 'EUR', paymentsEnabled: false, invoicingEnabled: false });
    expect(s.company.vatLabel).toBe('P.IVA in fase di attribuzione');
    expect(s.quote).toMatchObject({ oneOffCents: 55000, monthlyCents: 2000, paidNetCents: 0 });
    expect(s.quote.tranches).toEqual([
      { tranche: 'acconto', netCents: 27500, stampDutyCents: 200, totalCents: 27700, paid: false },
      { tranche: 'saldo', netCents: 27500, stampDutyCents: 200, totalCents: 27700, paid: false }
    ]);
    expect((await w.clientB.get(`/api/projects/${w.projectA}/billing/summary`)).status).toBe(404);
  });

  it('l\'admin non firma al posto del cliente', async () => {
    const r = await w.admin.post(`/api/projects/${w.projectA}/contract/sign`, { signerName: 'Admin', vexatiousAccepted: true });
    expect(r.status).toBe(403);
  });

  it('il cliente firma: si salva il testo canonico con la sua impronta, una sola volta', async () => {
    const r = await w.clientA.post(`/api/projects/${w.projectA}/contract/sign`, { signerName: 'Mario Rossi', vexatiousAccepted: true });
    expect(r.status).toBe(201);
    expect((await w.clientA.post(`/api/projects/${w.projectA}/contract/sign`, { signerName: 'Mario Rossi', vexatiousAccepted: true })).status).toBe(409);
    const [row] = await w.t.ctx.db.select().from(contractSignatures).where(eq(contractSignatures.projectId, w.projectA));
    const expected = contractPlainText(buildContract({ lang: 'it', projectName: 'Sito Kebab', clientName: 'Kebab Alfa', currency: 'EUR', items: QUOTE, company: COMPANY }));
    const meta = row!.metadata as { contractText: string; textSha256: string };
    expect(meta.contractText).toBe(expected);
    expect(meta.textSha256).toBe(createHash('sha256').update(expected, 'utf8').digest('hex'));
    expect(expected).toContain('P.IVA in fase di attribuzione');
    expect(expected).not.toMatch(/W-8BEN-E|IVA 22|7-ter|chargeback/i);
    const get = (await w.clientA.get(`/api/projects/${w.projectA}/contract`)).body;
    expect(get).toMatchObject({ signed: true, signature: { signerName: 'Mario Rossi', signerEmail: 'alfa@cliente.it' } });
    expect(get.signature).not.toHaveProperty('metadata');
  });

  it('dopo la firma il preventivo è bloccato (scadenza modificabile)', async () => {
    expect((await w.admin.patch(`/api/projects/${w.projectA}`, { quoteItems: [{ id: 'a', name: 'Sito web', priceCents: 1, monthly: false }] })).status).toBe(409);
    expect((await w.admin.patch(`/api/projects/${w.projectA}`, { currency: 'USD' })).status).toBe(409);
    expect((await w.admin.patch(`/api/projects/${w.projectA}`, { quoteItems: QUOTE, paymentDeadline: '2026-11-10' })).status).toBe(200);
  });

  it('pagamento online non attivo; fatture non registrabili senza P.IVA', async () => {
    expect((await w.clientA.post(`/api/projects/${w.projectA}/billing/checkout`, { tranche: 'acconto' })).status).toBe(503);
    expect((await w.admin.post(`/api/projects/${w.projectA}/billing/invoices`, { number: '1', issueDate: '2026-11-05', amountCents: 27700 })).status).toBe(403);
  });

  it('bonifico: lo registra solo il team e aggiorna lo stato delle tranche', async () => {
    const body = { tranche: 'acconto', method: 'bonifico', netCents: 27500, stampDutyCents: 200, paidAt: '2026-11-05', reference: 'CRO 123' };
    expect((await w.clientA.post(`/api/projects/${w.projectA}/billing/payments`, body)).status).toBe(403);
    const r = await w.admin.post(`/api/projects/${w.projectA}/billing/payments`, body);
    expect(r.status).toBe(201);
    expect(r.body.paidNetCents).toBe(27500);
    const s = (await w.clientA.get(`/api/projects/${w.projectA}/billing/summary`)).body;
    expect(s.quote.tranches.map((t: { paid: boolean }) => t.paid)).toEqual([true, false]);
    expect(s.quote.next.tranche).toBe('saldo');
    expect(s.payments[0]).not.toHaveProperty('providerPaymentId');
    expect((await w.clientA.get(`/api/projects/${w.projectA}`)).body.paidAmountCents).toBe(27500);
  });

  it('vincoli del database: importi positivi, id del provider univoci', async () => {
    const base = { projectId: w.projectA, clientId: w.clientIdA, provider: 'stripe', providerPaymentId: 'cs_x', amountCents: 100 };
    await expect(w.t.ctx.db.insert(payments).values({ ...base, amountCents: 0 })).rejects.toThrow();
    await w.t.ctx.db.insert(payments).values(base);
    await expect(w.t.ctx.db.insert(payments).values(base)).rejects.toThrow();
  });
});

describe('con partita IVA e Stripe configurato', () => {
  const WH = 'whsec_test_secret';
  let w: World;
  let sessions = 0;
  const sign = (payload: string, secret = WH) => {
    const ts = Math.floor(Date.now() / 1000);
    return `t=${ts},v1=${createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')}`;
  };
  const hook = (payload: object, secret = WH) => {
    const raw = JSON.stringify(payload);
    return request(w.t.app).post('/api/webhooks/payments').set('Content-Type', 'application/json').set('Stripe-Signature', sign(raw, secret)).send(raw);
  };
  const completed = (id: string, amount: number) => ({
    type: 'checkout.session.completed',
    data: { object: { id, payment_intent: 'pi_1', amount_total: amount, currency: 'eur', payment_status: 'paid', metadata: {} } }
  });

  beforeAll(async () => {
    const real = createStripeGateway({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: WH } as Env)!;
    const gateway: PaymentGateway = {
      name: real.name,
      parseWebhook: real.parseWebhook,
      async createCheckout() { sessions += 1; return { id: `cs_test_${sessions}`, url: `https://checkout.stripe.com/c/cs_test_${sessions}` }; }
    };
    w = await world({ payments: gateway, company: { ...COMPANY, vatNumber: '01234567890', taxCode: 'RSSMRA80A01G224K', registeredOffice: 'Via Prova 1, 35100 Padova (PD)' } });
    await w.admin.patch(`/api/projects/${w.projectA}`, { quoteItems: QUOTE });
  });
  afterAll(() => w.t.handle.close());

  it('niente checkout prima della firma; dopo la firma l\'importo lo decide il server', async () => {
    expect((await w.clientA.post(`/api/projects/${w.projectA}/billing/checkout`, { tranche: 'acconto' })).status).toBe(409);
    await w.clientA.post(`/api/projects/${w.projectA}/contract/sign`, { signerName: 'Mario Rossi', vexatiousAccepted: true });
    expect((await w.clientA.post(`/api/projects/${w.projectA}/billing/checkout`, { tranche: 'saldo' })).status).toBe(409);
    const r = await w.clientA.post(`/api/projects/${w.projectA}/billing/checkout`, { tranche: 'acconto', amountCents: 1 });
    expect(r.status).toBe(201);
    expect(r.body.url).toBe('https://checkout.stripe.com/c/cs_test_1');
    const [p] = await w.t.ctx.db.select().from(payments).where(eq(payments.providerPaymentId, 'cs_test_1'));
    expect(p).toMatchObject({ status: 'in_attesa', amountCents: 27700, currency: 'EUR', tranche: 'acconto' });
  });

  it('webhook: firma errata rifiutata, pagamento confermato una sola volta', async () => {
    expect((await hook(completed('cs_test_1', 27700), 'whsec_sbagliato')).status).toBe(400);
    expect((await hook(completed('cs_test_1', 27700))).body).toEqual({ received: true });
    expect((await hook(completed('cs_test_1', 27700))).body).toMatchObject({ duplicate: true });
    const s = (await w.clientA.get(`/api/projects/${w.projectA}/billing/summary`)).body;
    expect(s.quote.paidNetCents).toBe(27500);
    expect(s.quote.next.tranche).toBe('saldo');
  });

  it('webhook con importo diverso: pagamento non accreditato', async () => {
    const r = await w.clientA.post(`/api/projects/${w.projectA}/billing/checkout`, { tranche: 'saldo' });
    expect(r.status).toBe(201);
    expect((await hook(completed('cs_test_2', 100))).body).toMatchObject({ mismatch: true });
    const [p] = await w.t.ctx.db.select().from(payments).where(eq(payments.providerPaymentId, 'cs_test_2'));
    expect(p!.status).toBe('fallito');
  });

  it('fattura registrata dal team con numero del provider; il cliente la vede', async () => {
    const [p] = await w.t.ctx.db.select().from(payments).where(eq(payments.providerPaymentId, 'cs_test_1'));
    const inv = { number: '1/2026', issueDate: '2026-11-05', amountCents: 27700, paymentId: p!.id, pdfUrl: 'https://example.com/f1.pdf' };
    expect((await w.clientA.post(`/api/projects/${w.projectA}/billing/invoices`, inv)).status).toBe(403);
    expect((await w.admin.post(`/api/projects/${w.projectA}/billing/invoices`, inv)).status).toBe(201);
    expect((await w.admin.post(`/api/projects/${w.projectA}/billing/invoices`, inv)).status).toBe(409);
    const list = (await w.clientA.get(`/api/projects/${w.projectA}/billing/invoices`)).body.items;
    expect(list[0]).toMatchObject({ number: '1/2026', paymentId: p!.id, pdfUrl: 'https://example.com/f1.pdf' });
    expect(list[0]).not.toHaveProperty('providerInvoiceId');
  });
});
