import { Router } from 'express';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { leadListQuerySchema, leadPatchSchema, leadPublicSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { sharedLimiter } from '../../lib/rate-limit.js';
import { clients, leads } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { PRIVACY_POLICY_VERSION } from '../../lib/privacy.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { omit, serialize } from '../../lib/serialize.js';
import { defined, parse } from '../../lib/validate.js';
import { requireAdmin, requireTeam } from '../../middleware/auth.js';
import { notifyTeam } from '../../lib/notify.js';
import { appUrl, renderWelcomeMail } from '../../lib/mailer.js';

const uuidParam = z.uuid('ID non valido');
const toDto = (l: typeof leads.$inferSelect) => serialize(omit(l, 'updatedAt'));

/** Form contatti del sito pubblico (sostituisce Formspree). */
export function publicLeadsRouter(ctx: AppContext): Router {
  const router = Router();
  const limiter = sharedLimiter(ctx.db, 'public-leads', 60 * 60_000, ctx.env.NODE_ENV === 'test' ? 1000 : 5,
    'Hai già inviato diverse richieste. Riprova più tardi o scrivici via email.');
  router.post('/', limiter, async (req, res) => {
    const input = parse(leadPublicSchema, req.body);
    // Honeypot compilato: rispondiamo OK senza salvare (non diamo segnali ai bot)
    if (input.website) { res.status(202).json({ ok: true }); return; }
    await ctx.db.insert(leads).values({
      name: input.name, email: input.email, phone: input.phone ?? null, company: input.company ?? null,
      service: input.service, message: input.message, source: 'sito',
      privacyVersion: PRIVACY_POLICY_VERSION, privacyAcceptedAt: new Date()
    });
    const services: Record<string, string> = { landing: 'Sito web / landing page', webapp: 'Web app', mobile: 'App mobile', manutenzione: 'Manutenzione', altro: 'Altro' };
    await notifyTeam(ctx.env, {
      title: '🆕 Nuovo lead dal sito',
      lines: [`${services[input.service] ?? input.service}`],
      path: '/admin/lead',
      buttonLabel: '📋 Apri i lead'
    });
    res.status(202).json({ ok: true });
  });
  return router;
}

export function leadsRouter(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;
  router.use(requireTeam);

  router.get('/', async (req, res) => {
    const q = parse(leadListQuerySchema, req.query);
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(leads.status, q.status));
    if (q.source) conds.push(eq(leads.source, q.source));
    if (q.q) {
      const like = '%' + q.q + '%';
      conds.push(or(ilike(leads.name, like), ilike(leads.company, like), ilike(leads.category, like), ilike(leads.address, like), ilike(leads.offeredService, like))!);
    }
    const where = conds.length ? and(...conds) : undefined;
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(leads).where(where);
    const wonOrder = sql`CASE WHEN ${leads.status} = 'convertito' THEN 1 ELSE 0 END`;
    const rows = await db.select().from(leads).where(where).orderBy(asc(wonOrder), desc(leads.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map(toDto), total: Number(total), page: q.page, pageSize: q.pageSize });
  });

  router.patch('/:id', async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const input = defined(parse(leadPatchSchema, req.body));
    const [current] = await db.select({ contactedAt: leads.contactedAt, closedAt: leads.closedAt }).from(leads).where(eq(leads.id, id));
    if (!current) throw notFound('Lead');
    const patch: Partial<typeof leads.$inferInsert> = { ...input };
    if (input.status && input.status !== 'nuovo' && !current.contactedAt) patch.contactedAt = new Date();
    if (input.status) patch.closedAt = input.status === 'convertito' ? current.closedAt ?? new Date() : null;
    const [row] = await db.update(leads).set(patch).where(eq(leads.id, id)).returning();
    if (!row) throw notFound('Lead');
    await audit(db, req, { action: 'lead.updated', entity: 'lead', entityId: id, meta: { fields: Object.keys(input) } });
    res.json(toDto(row));
  });

  /** Converte il lead in cliente (anagrafica precompilata). */
  router.post('/:id/convert', async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const result = await db.transaction(async (tx) => {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, id));
      if (!lead) throw notFound('Lead');
      if (lead.clientId) throw badRequest('Lead già convertito');
      const [client] = await tx.insert(clients).values({
        name: lead.company || lead.name, contactName: lead.name, contactEmail: lead.email, contactPhone: lead.phone,
        notes: `Da lead del ${lead.createdAt.toISOString().slice(0, 10)}:\n${lead.message ?? lead.outreachMessage ?? ''}`
      }).returning();
      const [updated] = await tx.update(leads).set({ status: 'convertito', clientId: client!.id }).where(eq(leads.id, id)).returning();
      return { client: client!, lead: updated! };
    });
    await audit(db, req, { action: 'lead.converted', entity: 'lead', entityId: id, meta: { clientId: result.client.id } });
    res.status(201).json({ lead: toDto(result.lead), client: serialize(result.client) });
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
    if (!row) throw notFound('Lead');
    await audit(db, req, { action: 'lead.deleted', entity: 'lead', entityId: id });
    res.status(204).end();
  });

  return router;
}
