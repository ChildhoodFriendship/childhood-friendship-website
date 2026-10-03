import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { projectInputSchema, projectListQuerySchema, projectPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, projects } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, emptyToNull, parse } from '../../lib/validate.js';
import { isTeam, requireAdmin, requireTeam } from '../../middleware/auth.js';
import { currentProject, projectScope } from './access.js';
import { ProjectsService } from './projects.service.js';

export function projectsRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new ProjectsService(ctx.db);
  const scope = projectScope(ctx);

  router.get('/', async (req, res) => {
    const query = parse(projectListQuerySchema, req.query);
    const onlyClient = isTeam(req) ? undefined : req.user!.clientId ?? '00000000-0000-0000-0000-000000000000';
    res.json(serialize(await service.list(query, onlyClient)));
  });

  router.post('/', requireTeam, async (req, res) => {
    const input = parse(projectInputSchema, req.body);
    const created = await service.create(emptyToNull(input), req.user!.id);
    await audit(ctx.db, req, { action: 'project.created', entity: 'project', entityId: created.id, projectId: created.id, meta: { name: created.name } });
    res.status(201).json(serialize(await service.get(created.id)));
  });

  router.get('/:projectId', scope, async (_req, res) => {
    res.json(serialize(await service.get(currentProject(res).id)));
  });

  router.patch('/:projectId', requireTeam, scope, async (req, res) => {
    const project = currentProject(res);
    const input = defined(emptyToNull(parse(projectPatchSchema, req.body)));
    if (input.clientId) {
      const [c] = await ctx.db.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId));
      if (!c) throw badRequest('Cliente inesistente');
    }
    const start = input.startDate !== undefined ? input.startDate : project.startDate;
    const end = input.deadline !== undefined ? input.deadline : project.deadline;
    if (start && end && end < start) throw badRequest('La scadenza precede la data di inizio');
    await ctx.db.update(projects).set(input).where(eq(projects.id, project.id));
    await audit(ctx.db, req, { action: 'project.updated', entity: 'project', entityId: project.id, projectId: project.id, meta: { fields: Object.keys(input) } });
    res.json(serialize(await service.get(project.id)));
  });

  router.post('/:projectId/archive', requireTeam, scope, async (req, res) => {
    const project = currentProject(res);
    await ctx.db.update(projects).set({ archivedAt: new Date() }).where(eq(projects.id, project.id));
    await audit(ctx.db, req, { action: 'project.archived', entity: 'project', entityId: project.id, projectId: project.id });
    res.json(serialize(await service.get(project.id)));
  });

  router.post('/:projectId/restore', requireTeam, scope, async (req, res) => {
    const project = currentProject(res);
    await ctx.db.update(projects).set({ archivedAt: null }).where(eq(projects.id, project.id));
    await audit(ctx.db, req, { action: 'project.restored', entity: 'project', entityId: project.id, projectId: project.id });
    res.json(serialize(await service.get(project.id)));
  });

  router.delete('/:projectId', requireAdmin, scope, async (req, res) => {
    const project = currentProject(res);
    if (!project.archivedAt) throw badRequest('Archivia il progetto prima di eliminarlo');
    const [row] = await ctx.db.delete(projects).where(eq(projects.id, project.id)).returning({ id: projects.id });
    if (!row) throw notFound('Progetto');
    await audit(ctx.db, req, { action: 'project.deleted', entity: 'project', entityId: project.id, meta: { name: project.name } });
    res.status(204).end();
  });

  return router;
}
