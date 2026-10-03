import { Router } from 'express';
import { count, desc, eq } from 'drizzle-orm';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { leadListQuerySchema, leadPatchSchema, leadPublicSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, leads } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { sha256 } from '../../lib/crypto.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { omit, serialize } from '../../lib/serialize.js';
import { defined, parse } from '../../lib/validate.js';
import { requireAdmin, requireTeam } from '../../middleware/auth.js';

const uuidParam = z.uuid('ID non valido');
const toDto = (l: typeof leads.$inferSelect) => serialize(omit(l, 'ipHash', 'updatedAt'));

/** Form contatti del sito pubblico (sostituisce Formspree). */
export function publicLeadsRouter(ctx: AppContext): Router {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60 * 60_000, limit: ctx.env.NODE_ENV === 'test' ? 1000 : 5, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Hai già inviato diverse richieste. Riprova più tardi o scrivici via email.' } }
  });
  router.post('/', limiter, async (req, res) => {
    const input = parse(leadPublicSchema, req.body);
    // Honeypot compilato: rispondiamo OK senza salvare (non diamo segnali ai bot)
    if (input.website) { res.status(202).json({ ok: true }); return; }
    await ctx.db.insert(leads).values({
      name: input.name, email: input.email, phone: input.phone ?? null, company: input.company ?? null,
      service: input.service, message: input.message, source: 'sito', ipHash: req.ip ? sha256(req.ip).slice(0, 16) : null
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
    const where = q.status ? eq(leads.status, q.status) : undefined;
    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(leads).where(where);
    const rows = await db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    res.json({ items: rows.map(toDto), total: Number(total), page: q.page, pageSize: q.pageSize });
  });

  router.patch('/:id', async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const input = defined(parse(leadPatchSchema, req.body));
    const [row] = await db.update(leads).set(input).where(eq(leads.id, id)).returning();
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
        notes: `Da lead del ${lead.createdAt.toISOString().slice(0, 10)}:\n${lead.message}`
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
