import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { computeQuote, type Currency } from '@cf/shared/billing';
import { COMPANY, isFiscallyActive, vatLabel, type CompanyProfile } from '@cf/shared/company';
import { checkoutRequestSchema, invoiceRegisterSchema, manualPaymentSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/client.js';
import { contractSignatures, invoices, payments, projects } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, forbidden, unavailable } from '../../lib/http-error.js';
import { appUrl } from '../../lib/mailer.js';
import { notifyTeam } from '../../lib/notify.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { isTeam, requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject, type ProjectRow } from '../projects/access.js';

/** Colonne esposte: niente id/metadati del provider (restano solo lato server). */
const paymentColumns = {
  id: payments.id, projectId: payments.projectId, clientId: payments.clientId, tranche: payments.tranche,
  provider: payments.provider, amountCents: payments.amountCents, currency: payments.currency,
  status: payments.status, paidAt: payments.paidAt, createdAt: payments.createdAt
};
const invoiceColumns = {
  id: invoices.id, projectId: invoices.projectId, clientId: invoices.clientId, paymentId: invoices.paymentId,
  provider: invoices.provider, number: invoices.number, issueDate: invoices.issueDate, amountCents: invoices.amountCents,
  currency: invoices.currency, status: invoices.status, sdiStatus: invoices.sdiStatus, pdfUrl: invoices.pdfUrl,
  xmlUrl: invoices.xmlUrl, createdAt: invoices.createdAt
};

type PaymentMeta = { netCents?: number; stampDutyCents?: number };

/** Incassato al netto dei bolli: somma dei pagamenti riusciti. È l'unica fonte di `projects.paid_amount_cents`. */
export async function paidNetCents(db: Database, projectId: string): Promise<number> {
  const rows = await db.select({ amountCents: payments.amountCents, metadata: payments.metadata }).from(payments)
    .where(and(eq(payments.projectId, projectId), eq(payments.status, 'riuscito')));
  return rows.reduce((a, r) => {
    const m = r.metadata as PaymentMeta;
    return a + (typeof m.netCents === 'number' ? m.netCents : r.amountCents - (m.stampDutyCents ?? 0));
  }, 0);
}

async function syncPaid(db: Database, projectId: string): Promise<number> {
  const paid = await paidNetCents(db, projectId);
  await db.update(projects).set({ paidAmountCents: paid }).where(eq(projects.id, projectId));
  return paid;
}

const companyOf = (ctx: AppContext): CompanyProfile => ctx.company ?? COMPANY;
const currencyOf = (p: ProjectRow): Currency => (p.currency === 'USD' ? 'USD' : 'EUR');

/**
 * Incassi e fatture del progetto.
 * - Lettura: team e cliente del progetto.
 * - Pagamento online: il server calcola l'importo e crea la sessione sul gateway; lo stato "pagato"
 *   arriva SOLO dal webhook firmato (vedi `paymentsWebhookRouter`). Attivo solo con P.IVA registrata.
 * - Bonifico e fatture: il team li registra; numero e data della fattura sono quelli del servizio di fatturazione.
 */
export function billingRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  const paymentsEnabled = () => Boolean(ctx.payments) && isFiscallyActive(companyOf(ctx));

  router.get('/summary', async (_req, res) => {
    const project = currentProject(res);
    const company = companyOf(ctx);
    const [pays, invs, paid] = await Promise.all([
      db.select(paymentColumns).from(payments).where(eq(payments.projectId, project.id)).orderBy(desc(payments.createdAt)),
      db.select(invoiceColumns).from(invoices).where(eq(invoices.projectId, project.id)).orderBy(desc(invoices.createdAt)),
      paidNetCents(db, project.id)
    ]);
    res.json(serialize({
      currency: currencyOf(project),
      quote: computeQuote(project.quoteItems, paid),
      paymentsEnabled: paymentsEnabled(),
      invoicingEnabled: isFiscallyActive(company),
      company: { brand: company.brand, owner: company.owner, vatLabel: vatLabel(company), email: company.email, taxRegime: company.taxRegime },
      payments: pays,
      invoices: invs
    }));
  });

  router.get('/payments', async (_req, res) => {
    const project = currentProject(res);
    const rows = await db.select(paymentColumns).from(payments).where(eq(payments.projectId, project.id)).orderBy(desc(payments.createdAt));
    res.json(serialize({ items: rows }));
  });

  router.get('/invoices', async (_req, res) => {
    const project = currentProject(res);
    const rows = await db.select(invoiceColumns).from(invoices).where(eq(invoices.projectId, project.id)).orderBy(desc(invoices.createdAt));
    res.json(serialize({ items: rows }));
  });

  /** Avvia il pagamento online della prossima tranche. Il browser riceve solo l'URL della pagina sicura del gateway. */
  router.post('/checkout', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const gateway = ctx.payments;
    if (!gateway || !isFiscallyActive(companyOf(ctx))) throw unavailable('Il pagamento online non è ancora attivo');
    const { tranche } = parse(checkoutRequestSchema, req.body);

    const [signed] = await db.select({ id: contractSignatures.id }).from(contractSignatures).where(eq(contractSignatures.projectId, project.id)).limit(1);
    if (!signed) throw conflict('Firma prima il contratto per procedere al pagamento');

    const quote = computeQuote(project.quoteItems, await paidNetCents(db, project.id));
    const next = quote.next;
    if (!next) throw conflict('Non ci sono importi da pagare');
    if (next.tranche !== tranche) throw conflict(tranche === 'saldo' ? 'Prima va pagato l\'acconto' : 'L\'acconto risulta già pagato');
    // Importo dovuto per arrivare alla tranche richiesta (copre anche pagamenti parziali registrati a mano)
    const target = tranche === 'acconto' ? quote.tranches[0]!.netCents : quote.oneOffCents;
    const netCents = target - quote.paidNetCents;
    if (netCents <= 0) throw conflict('Non ci sono importi da pagare');
    const stampDutyCents = next.stampDutyCents;
    const currency = currencyOf(project);

    const session = await gateway.createCheckout({
      amountCents: netCents + stampDutyCents,
      currency,
      description: `${project.name} — ${tranche === 'acconto' ? 'acconto' : 'saldo'}`,
      customerEmail: req.user?.email ?? null,
      successUrl: appUrl(ctx.env, `portale/progetti/${project.id}?pagamento=ok`),
      cancelUrl: appUrl(ctx.env, `portale/progetti/${project.id}?pagamento=annullato`),
      metadata: { projectId: project.id, tranche }
    });
    await db.insert(payments).values({
      projectId: project.id, clientId: project.clientId, tranche, provider: gateway.name, providerPaymentId: session.id,
      amountCents: netCents + stampDutyCents, currency, status: 'in_attesa', metadata: { netCents, stampDutyCents }
    }).onConflictDoNothing();
    await audit(db, req, { action: 'payment.checkout_started', entity: 'payment', projectId: project.id, meta: { tranche, amountCents: netCents + stampDutyCents, currency } });
    res.status(201).json({ url: session.url });
  });

  /** Incasso fuori piattaforma (bonifico): solo team. */
  router.post('/payments', requireTeam, async (req, res) => {
    const project = currentProject(res);
    const body = parse(manualPaymentSchema, req.body);
    const [row] = await db.insert(payments).values({
      projectId: project.id, clientId: project.clientId, tranche: body.tranche, provider: body.method,
      providerPaymentId: `${body.method}-${randomUUID()}`, amountCents: body.netCents + body.stampDutyCents,
      currency: currencyOf(project), status: 'riuscito', paidAt: new Date(`${body.paidAt}T12:00:00Z`),
      metadata: { netCents: body.netCents, stampDutyCents: body.stampDutyCents, reference: body.reference ?? null, recordedBy: req.user?.id ?? null }
    }).returning(paymentColumns);
    const paid = await syncPaid(db, project.id);
    await audit(db, req, { action: 'payment.recorded', entity: 'payment', entityId: row!.id, projectId: project.id, meta: { method: body.method, netCents: body.netCents } });
    res.status(201).json(serialize({ payment: row, paidNetCents: paid }));
  });

  /** Registra una fattura emessa sul servizio di fatturazione elettronica: solo team e solo con P.IVA attiva. */
  router.post('/invoices', requireTeam, async (req, res) => {
    const project = currentProject(res);
    if (!isFiscallyActive(companyOf(ctx))) throw forbidden('Fatturazione non attiva: manca la partita IVA nel profilo aziendale');
    const body = parse(invoiceRegisterSchema, req.body);
    if (body.paymentId) {
      const [p] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.id, body.paymentId), eq(payments.projectId, project.id)));
      if (!p) throw badRequest('Pagamento non trovato in questo progetto');
    }
    try {
      const [row] = await db.insert(invoices).values({
        projectId: project.id, clientId: project.clientId, paymentId: body.paymentId ?? null, provider: body.provider,
        providerInvoiceId: body.providerInvoiceId ?? `${body.provider}:${body.number}:${body.issueDate.slice(0, 4)}`,
        number: body.number, issueDate: body.issueDate, amountCents: body.amountCents, currency: currencyOf(project),
        status: body.status, sdiStatus: body.sdiStatus ?? null, pdfUrl: body.pdfUrl || null, xmlUrl: body.xmlUrl || null
      }).returning(invoiceColumns);
      await audit(db, req, { action: 'invoice.registered', entity: 'invoice', entityId: row!.id, projectId: project.id, meta: { number: body.number } });
      res.status(201).json(serialize(row));
    } catch (err) {
      if (String((err as { cause?: unknown })?.cause ?? err).includes('invoices_provider_uq')) throw conflict('Fattura già registrata');
      throw err;
    }
  });

  // Il cliente non può scrivere nulla qui tranne avviare il checkout (sopra)
  router.use((req, _res, next) => { if (req.method !== 'GET' && !isTeam(req)) return next(forbidden()); next(); });
  return router;
}

/**
 * Webhook del gateway di pagamento: corpo grezzo (serve alla verifica della firma), nessuna sessione né CSRF.
 * Idempotente: il pagamento è identificato dall'id della sessione.
 */
export function paymentsWebhookRouter(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;
  router.post('/', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    const gateway = ctx.payments;
    if (!gateway) throw unavailable('Pagamenti non configurati');
    let event;
    try {
      event = gateway.parseWebhook(Buffer.isBuffer(req.body) ? req.body : Buffer.from(''), req.get('stripe-signature'));
    } catch {
      throw badRequest('Firma del webhook non valida');
    }
    if (event.type === 'ignored' || !event.sessionId) return void res.json({ received: true });

    const [row] = await db.select().from(payments).where(and(eq(payments.provider, gateway.name), eq(payments.providerPaymentId, event.sessionId))).limit(1);
    if (!row) return void res.json({ received: true, unknown: true });

    if (event.type === 'checkout.expired') {
      if (row.status === 'in_attesa') await db.update(payments).set({ status: 'annullato' }).where(eq(payments.id, row.id));
      return void res.json({ received: true });
    }
    if (row.status === 'riuscito') return void res.json({ received: true, duplicate: true });
    if (event.amountCents !== row.amountCents || (event.currency && event.currency !== row.currency)) {
      console.error('[payments] importo/valuta non corrispondenti', { id: row.id });
      await db.update(payments).set({ status: 'fallito', metadata: { ...row.metadata, mismatch: true } }).where(eq(payments.id, row.id));
      return void res.json({ received: true, mismatch: true });
    }
    await db.update(payments).set({
      status: 'riuscito', paidAt: new Date(), metadata: { ...row.metadata, paymentIntentId: event.paymentIntentId }
    }).where(eq(payments.id, row.id));
    await syncPaid(db, row.projectId);
    const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.projectId));
    void notifyTeam(ctx.env, {
      title: 'Pagamento ricevuto',
      lines: [`Progetto: ${project?.name ?? ''}`, `Tranche: ${row.tranche}`, 'Da fare: emettere la fattura elettronica'],
      path: `/admin/progetti/${row.projectId}/preventivo`
    });
    res.json({ received: true });
  });
  return router;
}
