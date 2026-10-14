import { Router, type RequestHandler } from 'express';
import { eq, isNotNull, sql } from 'drizzle-orm';
import { leadIngestBatchSchema, leadIngestStatusSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { leads } from '../../db/schema.js';
import { safeEqual } from '../../lib/crypto.js';
import { HttpError, notFound, unauthorized } from '../../lib/http-error.js';
import { parse } from '../../lib/validate.js';

/**
 * Integrazione con n8n (prospezione automatica): token Bearer condiviso, nessuna sessione.
 * È l'unica scrittura sui lead fuori dall'area admin.
 */
export function integrationsRouter(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;

  const requireToken: RequestHandler = (req, _res, next) => {
    const expected = ctx.env.LEADS_INGEST_TOKEN;
    if (!expected) return next(new HttpError(503, 'unavailable', 'Integrazione lead non configurata'));
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !safeEqual(token, expected)) return next(unauthorized('Token di integrazione non valido'));
    next();
  };
  router.use(requireToken);

  /** Place ID già presenti: n8n li salta per non proporre due volte lo stesso locale. */
  router.get('/leads/place-ids', async (_req, res) => {
    const rows = await db.select({ placeId: leads.placeId }).from(leads).where(isNotNull(leads.placeId));
    res.json(rows.map((r) => r.placeId));
  });

  /** Inserisce i nuovi lead; quelli già noti (stesso placeId) vengono ignorati. */
  router.post('/leads', async (req, res) => {
    const { leads: input } = parse(leadIngestBatchSchema, req.body);
    const values = input.map((l) => ({
      name: l.name,
      company: l.name,
      phone: l.phone ?? null,
      placeId: l.placeId,
      score: l.score ?? null,
      category: l.category ?? null,
      address: l.address ?? null,
      website: l.website ?? null,
      mapsUrl: l.mapsUrl ?? null,
      outreachMessage: l.outreachMessage ?? null,
      waLink: l.waLink ?? null,
      notes: l.signals ? `Segnali: ${l.signals}` : null,
      source: l.source,
      service: 'landing' as const
    }));
    const inserted = await db.insert(leads).values(values).onConflictDoNothing({ target: leads.placeId }).returning({ id: leads.id });
    res.status(201).json({ received: input.length, inserted: inserted.length });
  });

  /** Aggiornamento rapido dello stato (bottoni del bot Telegram). */
  router.post('/leads/status', async (req, res) => {
    const { placeId, status } = parse(leadIngestStatusSchema, req.body);
    const [current] = await db.select({ id: leads.id, contactedAt: leads.contactedAt, closedAt: leads.closedAt }).from(leads).where(eq(leads.placeId, placeId));
    if (!current) throw notFound('Lead');
    const [row] = await db.update(leads).set({
      status,
      contactedAt: status !== 'nuovo' ? current.contactedAt ?? new Date() : current.contactedAt,
      closedAt: status === 'convertito' ? current.closedAt ?? new Date() : null
    }).where(eq(leads.id, current.id)).returning({ id: leads.id, name: leads.name, status: leads.status });
    res.json(row);
  });

  /** Riepilogo per il comando /stats del bot. */
  router.get('/leads/stats', async (_req, res) => {
    const [row] = await db.select({
      tot: sql<number>`count(*)::int`,
      nuovi: sql<number>`(count(*) filter (where ${leads.status} = 'nuovo'))::int`,
      trattativa: sql<number>`(count(*) filter (where ${leads.status} in ('contattato', 'qualificato')))::int`,
      chiusi: sql<number>`(count(*) filter (where ${leads.status} = 'convertito'))::int`,
      persi: sql<number>`(count(*) filter (where ${leads.status} = 'perso'))::int`,
      fatturatoCents: sql<number>`coalesce(sum(${leads.priceCents}) filter (where ${leads.status} = 'convertito'), 0)::int`,
      trattativaCents: sql<number>`coalesce(sum(${leads.priceCents}) filter (where ${leads.status} in ('contattato', 'qualificato')), 0)::int`
    }).from(leads);
    res.json(row);
  });

  return router;
}
