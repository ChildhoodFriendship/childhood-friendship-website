import { Router } from 'express';
import { and, isNotNull, isNull, lt, ne, or, eq } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/client.js';
import { aiUsage, auditLog, invites, leads, rateLimits, sessions } from '../../db/schema.js';
import { safeEqual } from '../../lib/crypto.js';

const DAY = 86_400_000;

/**
 * Tempi di conservazione (GDPR art. 5.1.e). Gli stessi valori sono scritti nell'informativa privacy:
 * se cambiano qui, va aggiornata anche la pagina /privacy (packages/shared/src/legal.ts).
 */
export const RETENTION_DAYS = {
  /** Richieste dal sito che non sono diventate clienti. */
  siteLeads: 730,
  /** Attività trovate con la prospezione automatica e non diventate clienti. */
  prospectLeads: 365,
  /** Sessioni di accesso scadute o revocate. */
  sessions: 30,
  /** Inviti scaduti, revocati o accettati. */
  invites: 90,
  /** Registro attività (sicurezza e responsabilità). */
  audit: 730,
  /** Contatori di utilizzo dell'AI. */
  aiUsage: 365
} as const;

export type RetentionReport = Record<string, number>;

/** Elimina i dati oltre i tempi di conservazione. I lead diventati clienti restano (rapporto contrattuale). */
export async function applyRetention(db: Database, now = new Date()): Promise<RetentionReport> {
  const before = (days: number) => new Date(now.getTime() - days * DAY);
  const notCustomer = and(isNull(leads.clientId), ne(leads.status, 'convertito'));
  const siteLeads = await db.delete(leads)
    .where(and(notCustomer, eq(leads.source, 'sito'), lt(leads.updatedAt, before(RETENTION_DAYS.siteLeads)))).returning({ id: leads.id });
  const prospectLeads = await db.delete(leads)
    .where(and(notCustomer, ne(leads.source, 'sito'), lt(leads.updatedAt, before(RETENTION_DAYS.prospectLeads)))).returning({ id: leads.id });
  const oldSessions = await db.delete(sessions)
    .where(or(lt(sessions.expiresAt, before(RETENTION_DAYS.sessions)), and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, before(RETENTION_DAYS.sessions)))))
    .returning({ id: sessions.id });
  const oldInvites = await db.delete(invites).where(lt(invites.expiresAt, before(RETENTION_DAYS.invites))).returning({ id: invites.id });
  const oldAudit = await db.delete(auditLog).where(lt(auditLog.createdAt, before(RETENTION_DAYS.audit))).returning({ id: auditLog.id });
  const oldAi = await db.delete(aiUsage).where(lt(aiUsage.createdAt, before(RETENTION_DAYS.aiUsage))).returning({ id: aiUsage.id });
  const counters = await db.delete(rateLimits).where(lt(rateLimits.resetAt, now)).returning({ key: rateLimits.key });
  return {
    siteLeads: siteLeads.length, prospectLeads: prospectLeads.length, sessions: oldSessions.length,
    invites: oldInvites.length, audit: oldAudit.length, aiUsage: oldAi.length, rateLimits: counters.length
  };
}

/** Endpoint per il cron giornaliero di Vercel: autenticato con CRON_SECRET (Bearer). */
export function retentionRouter(ctx: AppContext): Router {
  const router = Router();
  router.get('/retention', async (req, res) => {
    const secret = ctx.env.CRON_SECRET;
    const auth = req.get('authorization') ?? '';
    if (!secret || !safeEqual(auth, `Bearer ${secret}`)) { res.status(404).json({ error: { code: 'not_found', message: 'Endpoint non trovato' } }); return; }
    const report = await applyRetention(ctx.db);
    console.log('[retention]', JSON.stringify(report));
    res.json(report);
  });
  return router;
}
