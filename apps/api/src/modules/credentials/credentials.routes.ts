import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { credentialInputSchema, credentialPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { credentials } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { emptyToNull, parse } from '../../lib/validate.js';
import { requireAdmin, requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';

const uuidParam = z.uuid('ID non valido');

/** Accessi ai sistemi del cliente. Il segreto è cifrato AES-256-GCM e mai restituito negli elenchi. */
export function credentialsRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db, box } = ctx;
  router.use(requireTeam);

  const toDto = (c: typeof credentials.$inferSelect) => serialize({
    id: c.id, service: c.service, url: c.url, username: c.username, hasSecret: !!c.secretEnc, notes: c.notes, updatedAt: c.updatedAt
  });

  router.get('/', async (_req, res) => {
    const rows = await db.select().from(credentials).where(eq(credentials.projectId, currentProject(res).id)).orderBy(asc(credentials.service));
    res.json(rows.map(toDto));
  });

  router.post('/', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const { secret, ...input } = emptyToNull(parse(credentialInputSchema, req.body));
    const [row] = await db.insert(credentials).values({ ...input, projectId: project.id, secretEnc: secret ? box.encrypt(secret) : null }).returning();
    await audit(db, req, { action: 'credential.created', entity: 'credential', entityId: row!.id, projectId: project.id, meta: { service: row!.service } });
    res.status(201).json(toDto(row!));
  });

  router.patch('/:credId', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const id = parse(uuidParam, req.params['credId']);
    const { secret, ...input } = emptyToNull(parse(credentialPatchSchema, req.body));
    const patch: Partial<typeof credentials.$inferInsert> = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (secret !== undefined) patch.secretEnc = secret ? box.encrypt(secret) : null;
    const [row] = await db.update(credentials).set(patch).where(and(eq(credentials.id, id), eq(credentials.projectId, project.id))).returning();
    if (!row) throw notFound('Credenziale');
    await audit(db, req, { action: 'credential.updated', entity: 'credential', entityId: id, projectId: project.id, meta: { secretChanged: secret !== undefined } });
    res.json(toDto(row));
  });

  /** Mostra il segreto in chiaro: solo admin, sempre tracciato. */
  router.post('/:credId/reveal', requireAdmin, async (req, res) => {
    const project = currentProject(res);
    const id = parse(uuidParam, req.params['credId']);
    const [row] = await db.select().from(credentials).where(and(eq(credentials.id, id), eq(credentials.projectId, project.id)));
    if (!row) throw notFound('Credenziale');
    await audit(db, req, { action: 'credential.revealed', entity: 'credential', entityId: id, projectId: project.id, meta: { service: row.service } });
    res.set('Cache-Control', 'no-store').json({ secret: row.secretEnc ? box.decrypt(row.secretEnc) : null });
  });

  router.delete('/:credId', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const id = parse(uuidParam, req.params['credId']);
    const [row] = await db.delete(credentials).where(and(eq(credentials.id, id), eq(credentials.projectId, project.id))).returning({ service: credentials.service });
    if (!row) throw notFound('Credenziale');
    await audit(db, req, { action: 'credential.deleted', entity: 'credential', entityId: id, projectId: project.id, meta: { service: row.service } });
    res.status(204).end();
  });

  return router;
}
