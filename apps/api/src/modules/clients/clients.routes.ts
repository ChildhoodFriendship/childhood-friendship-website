import { Router } from 'express';
import { count, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import { clientInputSchema, clientPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, projects } from '../../db/schema.js';
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

  return router;
}
