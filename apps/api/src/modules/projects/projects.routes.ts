import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { projectInputSchema, projectListQuerySchema, projectPatchSchema } from '@cf/shared/schemas';
import type { ProjectHealthCheckDto } from '@cf/shared/types';
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

  router.post('/:projectId/health-check', requireTeam, scope, async (req, res) => {
    const project = currentProject(res);

    let siteOnline = false;
    let siteStatus: number | null = null;
    let siteLatencyMs: number | null = null;
    let siteError: string | null = null;

    if (project.targetUrl) {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const urlToFetch = project.targetUrl.startsWith('http') ? project.targetUrl : `https://${project.targetUrl}`;
        const resp = await fetch(urlToFetch, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'User-Agent': 'ChildhoodFriendship-Monitor/1.0' }
        });
        clearTimeout(timeoutId);
        siteLatencyMs = Math.round(performance.now() - start);
        siteStatus = resp.status;
        siteOnline = resp.ok || (resp.status >= 200 && resp.status < 400);
      } catch (err) {
        siteLatencyMs = Math.round(performance.now() - start);
        siteOnline = false;
        siteError = (err as Error).name === 'AbortError' ? 'Timeout (>6s)' : 'Host non raggiungibile';
      }
    }

    let stagingOnline = false;
    let stagingStatus: number | null = null;
    let stagingLatencyMs: number | null = null;

    if (project.stagingUrl) {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const urlToFetch = project.stagingUrl.startsWith('http') ? project.stagingUrl : `https://${project.stagingUrl}`;
        const resp = await fetch(urlToFetch, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'User-Agent': 'ChildhoodFriendship-Monitor/1.0' }
        });
        clearTimeout(timeoutId);
        stagingLatencyMs = Math.round(performance.now() - start);
        stagingStatus = resp.status;
        stagingOnline = resp.ok || (resp.status >= 200 && resp.status < 400);
      } catch {
        stagingLatencyMs = Math.round(performance.now() - start);
        stagingOnline = false;
      }
    }

    let dbConnected = false;
    let dbLatencyMs = 0;
    try {
      const dbStart = performance.now();
      await ctx.db.execute(sql`SELECT 1`);
      dbLatencyMs = Math.round(performance.now() - dbStart);
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    if (project.targetUrl) {
      await ctx.db.update(projects).set({ isOnline: siteOnline }).where(eq(projects.id, project.id));
    }

    await audit(ctx.db, req, {
      action: 'project.health_checked',
      entity: 'project',
      entityId: project.id,
      projectId: project.id,
      meta: { siteOnline, siteStatus, siteLatencyMs, dbConnected, dbLatencyMs }
    });

    const result: ProjectHealthCheckDto = {
      targetUrl: project.targetUrl,
      stagingUrl: project.stagingUrl,
      siteOnline,
      siteStatus,
      siteLatencyMs,
      siteError,
      stagingOnline,
      stagingStatus,
      stagingLatencyMs,
      dbConnected,
      dbLatencyMs,
      checkedAt: new Date().toISOString()
    };

    res.json(result);
  });

  return router;
}
