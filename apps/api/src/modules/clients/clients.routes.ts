import { Router } from 'express';
import { and, count, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { clientInputSchema, clientPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, projects, users } from '../../db/schema.js';
import { appUrl, renderPasswordResetMail } from '../../lib/mailer.js';
import { AuthService } from '../auth/auth.service.js';
import { audit } from '../../lib/audit.js';
import { conflict, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, emptyToNull, parse } from '../../lib/validate.js';
import { requireAdmin, requireTeam } from '../../middleware/auth.js';

const uuidParam = z.uuid('ID non valido');
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export function clientsRouter(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;
  router.use(requireTeam);

  router.get('/', async (req, res) => {
    const q = parse(z.string().trim().max(100).optional(), req.query['q']);
    const where = q ? or(ilike(clients.name, `%${escapeLike(q)}%`), ilike(clients.vatNumber, `%${escapeLike(q)}%`)) : undefined;
    const rows = await db.select({ client: clients, projectCount: count(projects.id) })
      .from(clients).leftJoin(projects, eq(projects.clientId, clients.id))
      .where(where).groupBy(clients.id).orderBy(clients.name).limit(500);
    res.json(serialize(rows.map((r) => ({ ...r.client, projectCount: Number(r.projectCount) }))));
  });

  router.get('/:id', async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.select().from(clients).where(eq(clients.id, id));
    if (!row) throw notFound('Cliente');
    res.json(serialize(row));
  });

  router.post('/', async (req, res) => {
    const input = emptyToNull(parse(clientInputSchema, req.body));
    const [row] = await db.insert(clients).values(input).returning();
    await audit(db, req, { action: 'client.created', entity: 'client', entityId: row!.id, meta: { name: row!.name } });
    res.status(201).json(serialize(row!));
  });

  router.patch('/:id', async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const input = defined(emptyToNull(parse(clientPatchSchema, req.body)));
    const [row] = await db.update(clients).set(input).where(eq(clients.id, id)).returning();
    if (!row) throw notFound('Cliente');
    await audit(db, req, { action: 'client.updated', entity: 'client', entityId: id, meta: { fields: Object.keys(input) } });
    res.json(serialize(row));
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(projects).where(eq(projects.clientId, id));
    if (Number(n) > 0) throw conflict('Il cliente ha progetti collegati: archiviali o spostali prima');
    const [row] = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id, name: clients.name });
    if (!row) throw notFound('Cliente');
    await audit(db, req, { action: 'client.deleted', entity: 'client', entityId: id, meta: { name: row.name } });
    res.status(204).end();
  });


  router.post('/:id/reset-password', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const [clientUser] = await db.select({ id: users.id, email: users.email, name: users.name })
      .from(users).where(and(eq(users.clientId, id), eq(users.isActive, true))).limit(1);
    if (!clientUser) {
      throw notFound('Nessun utente attivo trovato per questo cliente. Crea prima un invito.');
    }
    const authService = new AuthService(ctx);
    const result = await authService.adminGenerateResetLink(clientUser.id);
    const resetUrl = appUrl(ctx.env, `reset-password/${result.token}`);
    let emailSent = false;
    if (ctx.mailer) {
      emailSent = await ctx.mailer.send({
        to: [result.user.email],
        ...renderPasswordResetMail({ name: result.user.name, resetUrl })
      });
    }
    await audit(db, req, { action: 'client.password_reset_requested', entity: 'client', entityId: id, meta: { email: result.user.email, emailSent } });
    res.json({ ok: true, resetUrl, emailSent, email: result.user.email, name: result.user.name });
  });

  router.post('/:id/set-password', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const { password } = parse(z.object({ password: z.string().min(8, 'Almeno 8 caratteri') }), req.body);
    const [clientUser] = await db.select({ id: users.id })
      .from(users).where(and(eq(users.clientId, id), eq(users.isActive, true))).limit(1);
    if (!clientUser) {
      throw notFound('Nessun utente attivo trovato per questo cliente.');
    }
    const authService = new AuthService(ctx);
    await authService.adminSetPassword(clientUser.id, password);
    await audit(db, req, { action: 'client.password_set_by_admin', entity: 'client', entityId: id });
    res.json({ ok: true });
  });

  return router;
}
