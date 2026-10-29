import { Router } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { CONTRACT_VERSION } from '@cf/shared/contract';
import { projectInputSchema, projectListQuerySchema, projectPatchSchema } from '@cf/shared/schemas';
import type { ProjectHealthCheckDto } from '@cf/shared/types';
import type { AppContext } from '../../context.js';
import { clients, contractSignatures, credentials, projects } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, emptyToNull, parse } from '../../lib/validate.js';
import { isTeam, requireAdmin, requireTeam } from '../../middleware/auth.js';
import { currentProject, projectScope } from './access.js';
import { ProjectsService, toPortalDto } from './projects.service.js';
import { checkPublicUrl } from '../../lib/safe-url.js';

export function projectsRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new ProjectsService(ctx.db);
  const scope = projectScope(ctx);

  router.get('/', async (req, res) => {
    const query = parse(projectListQuerySchema, req.query);
    if (isTeam(req)) { res.json(serialize(await service.list(query))); return; }
    const page = await service.list(query, req.user!.clientId ?? '00000000-0000-0000-0000-000000000000');
    res.json(serialize({ ...page, items: page.items.map(toPortalDto) }));
  });

  router.post('/', requireTeam, async (req, res) => {
    const input = parse(projectInputSchema, req.body);
    const created = await service.create(emptyToNull(input), req.user!.id);
    await audit(ctx.db, req, { action: 'project.created', entity: 'project', entityId: created.id, projectId: created.id, meta: { name: created.name } });
    res.status(201).json(serialize(await service.get(created.id)));
  });

  router.get('/:projectId', scope, async (req, res) => {
    if (isTeam(req)) { res.json(serialize(await service.get(currentProject(res).id))); return; }
    const dto = await service.get(currentProject(res).id, true);
    res.json(serialize(dto && toPortalDto(dto)));
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
    // Dopo la firma preventivo, valuta e cliente sono quelli del contratto: non si cambiano
    const norm = (items: { id: string; name: string; priceCents: number; monthly?: boolean }[]) => JSON.stringify(items.map((i) => [i.id, i.name, i.priceCents, !!i.monthly]));
    const quoteChanged = (input.quoteItems !== undefined && norm(input.quoteItems) !== norm(project.quoteItems))
      || (input.currency !== undefined && input.currency !== project.currency)
      || (input.clientId !== undefined && input.clientId !== project.clientId);
    if (quoteChanged) {
      const [signed] = await ctx.db.select({ id: contractSignatures.id }).from(contractSignatures)
        .where(and(eq(contractSignatures.projectId, project.id), eq(contractSignatures.contractVersion, CONTRACT_VERSION))).limit(1);
      if (signed) throw conflict('Contratto già firmato: preventivo, valuta e cliente non si possono più modificare');
    }
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

    /** Controllo di raggiungibilità: solo indirizzi pubblici, nessun redirect seguito (anti-SSRF). */
    const probe = async (raw: string | null) => {
      if (!raw) return { online: false, status: null as number | null, latencyMs: null as number | null, error: null as string | null };
      const checked = await checkPublicUrl(raw);
      if ('error' in checked) return { online: false, status: null, latencyMs: null, error: checked.error };
      const start = performance.now();
      try {
        const resp = await fetch(checked.url, {
          method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'ChildhoodFriendship-Monitor/1.0' }
        });
        await resp.body?.cancel();
        return { online: resp.status >= 200 && resp.status < 400, status: resp.status, latencyMs: Math.round(performance.now() - start), error: null };
      } catch (err) {
        return { online: false, status: null, latencyMs: Math.round(performance.now() - start), error: (err as Error).name === 'TimeoutError' ? 'Timeout (>6s)' : 'Host non raggiungibile' };
      }
    };
    const site = await probe(project.targetUrl);
    const staging = await probe(project.stagingUrl);
    const siteOnline = site.online, siteStatus = site.status, siteLatencyMs = site.latencyMs, siteError = site.error;
    const stagingOnline = staging.online, stagingStatus = staging.status, stagingLatencyMs = staging.latencyMs;

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

    const credRows = await ctx.db.select().from(credentials).where(eq(credentials.projectId, project.id));
    const credsWithUrl = credRows.filter((c): c is typeof c & { url: string } => Boolean(c.url && /^https?:\/\//i.test(c.url))).slice(0, 6);
    const accessProbes = await Promise.all(credsWithUrl.map(async (c) => {
      const p = await probe(c.url);
      return {
        service: c.service,
        url: c.url,
        online: p.online,
        status: p.status,
        latencyMs: p.latencyMs,
        error: p.error
      };
    }));

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
      checkedAt: new Date().toISOString(),
      accessProbes
    };

    res.json(result);
  });

  return router;
}
