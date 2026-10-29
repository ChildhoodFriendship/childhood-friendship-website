import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { invoices, payments } from '../../db/schema.js';
import { serialize } from '../../lib/serialize.js';
import { currentProject } from '../projects/access.js';

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

/**
 * Incassi e fatture del progetto, in sola lettura (team e cliente del progetto).
 * Le scritture arriveranno solo da webhook firmati del provider di pagamento/fatturazione:
 * nessun endpoint permette al browser di segnare un pagamento o numerare una fattura.
 */
export function billingRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;

  router.get('/payments', async (_req, res) => {
    const project = currentProject(res);
    const rows = await db.select(paymentColumns).from(payments)
      .where(eq(payments.projectId, project.id)).orderBy(desc(payments.createdAt));
    res.json(serialize({ items: rows }));
  });

  router.get('/invoices', async (_req, res) => {
    const project = currentProject(res);
    const rows = await db.select(invoiceColumns).from(invoices)
      .where(eq(invoices.projectId, project.id)).orderBy(desc(invoices.createdAt));
    res.json(serialize({ items: rows }));
  });

  return router;
}
