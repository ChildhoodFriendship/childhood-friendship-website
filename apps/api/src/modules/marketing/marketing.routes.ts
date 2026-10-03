import { Router } from 'express';
import { and, asc, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import {
  campaignInputSchema, campaignPatchSchema, contentInputSchema, contentPatchSchema, platformInputSchema, platformPatchSchema
} from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { marketingAnalyses, marketingCampaigns, marketingContents, marketingPlatforms } from '../../db/schema.js';
import type { Database } from '../../db/client.js';
import { audit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { omit, serialize } from '../../lib/serialize.js';
import { defined, emptyToNull, parse } from '../../lib/validate.js';
import { requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';

const uuidParam = z.uuid('ID non valido');
const rangeQuery = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() });

async function assertRefs(db: Database, projectId: string, refs: { platformId?: string | null; campaignId?: string | null }) {
  if (refs.platformId) {
    const [p] = await db.select({ id: marketingPlatforms.id }).from(marketingPlatforms).where(and(eq(marketingPlatforms.id, refs.platformId), eq(marketingPlatforms.projectId, projectId)));
    if (!p) throw badRequest('Piattaforma non appartenente al progetto');
  }
  if (refs.campaignId) {
    const [c] = await db.select({ id: marketingCampaigns.id }).from(marketingCampaigns).where(and(eq(marketingCampaigns.id, refs.campaignId), eq(marketingCampaigns.projectId, projectId)));
    if (!c) throw badRequest('Campagna non appartenente al progetto');
  }
}

const clean = <T extends { createdAt?: Date; updatedAt?: Date }>(row: T) => serialize(omit(row, 'createdAt', 'updatedAt'));

export function marketingRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  router.use(requireTeam);

  /* ----- Piattaforme ----- */
  router.get('/platforms', async (_req, res) => {
    const rows = await db.select().from(marketingPlatforms).where(eq(marketingPlatforms.projectId, currentProject(res).id)).orderBy(asc(marketingPlatforms.name));
    res.json(rows.map(clean));
  });
  router.post('/platforms', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const input = emptyToNull(parse(platformInputSchema, req.body));
    const [row] = await db.insert(marketingPlatforms).values({ ...input, frequency: input.frequency ?? {}, projectId: project.id }).returning();
    await audit(db, req, { action: 'marketing.platform_created', entity: 'marketing_platform', entityId: row!.id, projectId: project.id });
    res.status(201).json(clean(row!));
  });
  router.patch('/platforms/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const input = defined(emptyToNull(parse(platformPatchSchema, req.body)));
    const [row] = await db.update(marketingPlatforms).set(input).where(and(eq(marketingPlatforms.id, id), eq(marketingPlatforms.projectId, project.id))).returning();
    if (!row) throw notFound('Piattaforma');
    res.json(clean(row));
  });
  router.delete('/platforms/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.delete(marketingPlatforms).where(and(eq(marketingPlatforms.id, id), eq(marketingPlatforms.projectId, project.id))).returning({ id: marketingPlatforms.id });
    if (!row) throw notFound('Piattaforma');
    await audit(db, req, { action: 'marketing.platform_deleted', entity: 'marketing_platform', entityId: id, projectId: project.id });
    res.status(204).end();
  });

  /* ----- Calendario contenuti ----- */
  router.get('/contents', async (req, res) => {
    const project = currentProject(res);
    const range = parse(rangeQuery, req.query);
    const where: SQL[] = [eq(marketingContents.projectId, project.id)];
    if (range.from) where.push(gte(marketingContents.scheduledFor, range.from));
    if (range.to) where.push(lte(marketingContents.scheduledFor, range.to));
    const rows = await db.select().from(marketingContents).where(and(...where)).orderBy(asc(marketingContents.scheduledFor)).limit(1000);
    res.json(rows.map(clean));
  });
  router.post('/contents', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const input = emptyToNull(parse(contentInputSchema, req.body));
    await assertRefs(db, project.id, input);
    const [row] = await db.insert(marketingContents).values({ ...input, target: input.target ?? {}, projectId: project.id }).returning();
    await audit(db, req, { action: 'marketing.content_created', entity: 'marketing_content', entityId: row!.id, projectId: project.id });
    res.status(201).json(clean(row!));
  });
  router.patch('/contents/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const input = defined(emptyToNull(parse(contentPatchSchema, req.body)));
    await assertRefs(db, project.id, input);
    const [row] = await db.update(marketingContents).set(input).where(and(eq(marketingContents.id, id), eq(marketingContents.projectId, project.id))).returning();
    if (!row) throw notFound('Contenuto');
    res.json(clean(row));
  });
  router.delete('/contents/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.delete(marketingContents).where(and(eq(marketingContents.id, id), eq(marketingContents.projectId, project.id))).returning({ id: marketingContents.id });
    if (!row) throw notFound('Contenuto');
    res.status(204).end();
  });

  /* ----- Campagne ADS ----- */
  router.get('/campaigns', async (_req, res) => {
    const rows = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.projectId, currentProject(res).id)).orderBy(desc(marketingCampaigns.startDate));
    res.json(rows.map(clean));
  });
  router.post('/campaigns', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const input = emptyToNull(parse(campaignInputSchema, req.body));
    await assertRefs(db, project.id, input);
    const [row] = await db.insert(marketingCampaigns).values({ ...input, target: input.target ?? {}, metrics: input.metrics ?? {}, projectId: project.id }).returning();
    await audit(db, req, { action: 'marketing.campaign_created', entity: 'marketing_campaign', entityId: row!.id, projectId: project.id, meta: { name: row!.name } });
    res.status(201).json(clean(row!));
  });
  router.patch('/campaigns/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const input = defined(emptyToNull(parse(campaignPatchSchema, req.body)));
    await assertRefs(db, project.id, input);
    const [current] = await db.select().from(marketingCampaigns).where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.projectId, project.id)));
    if (!current) throw notFound('Campagna');
    const start = input.startDate !== undefined ? input.startDate : current.startDate;
    const end = input.endDate !== undefined ? input.endDate : current.endDate;
    if (start && end && end < start) throw badRequest('La data di fine precede l\'inizio');
    const [row] = await db.update(marketingCampaigns).set(input).where(eq(marketingCampaigns.id, id)).returning();
    await audit(db, req, { action: 'marketing.campaign_updated', entity: 'marketing_campaign', entityId: id, projectId: project.id, meta: { fields: Object.keys(input) } });
    res.json(clean(row!));
  });
  router.delete('/campaigns/:id', async (req, res) => {
    const project = currentProject(res); assertWritable(project);
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.delete(marketingCampaigns).where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.projectId, project.id))).returning({ id: marketingCampaigns.id });
    if (!row) throw notFound('Campagna');
    await audit(db, req, { action: 'marketing.campaign_deleted', entity: 'marketing_campaign', entityId: id, projectId: project.id });
    res.status(204).end();
  });

  /* ----- Analisi salvate (SWOT, PESTEL, suggerimenti) ----- */
  router.get('/analyses', async (_req, res) => {
    const rows = await db.select({ id: marketingAnalyses.id, projectId: marketingAnalyses.projectId, kind: marketingAnalyses.kind, data: marketingAnalyses.data, createdAt: marketingAnalyses.createdAt })
      .from(marketingAnalyses).where(eq(marketingAnalyses.projectId, currentProject(res).id)).orderBy(desc(marketingAnalyses.createdAt)).limit(50);
    res.json(serialize(rows));
  });
  router.delete('/analyses/:id', async (req, res) => {
    const project = currentProject(res);
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.delete(marketingAnalyses).where(and(eq(marketingAnalyses.id, id), eq(marketingAnalyses.projectId, project.id))).returning({ id: marketingAnalyses.id });
    if (!row) throw notFound('Analisi');
    res.status(204).end();
  });

  /** Riepilogo budget per la dashboard marketing. */
  router.get('/summary', async (_req, res) => {
    const project = currentProject(res);
    const campaigns = await db.select({ budgetCents: marketingCampaigns.budgetCents, spentCents: marketingCampaigns.spentCents, status: marketingCampaigns.status })
      .from(marketingCampaigns).where(eq(marketingCampaigns.projectId, project.id));
    const allocated = campaigns.reduce((s, c) => s + c.budgetCents, 0);
    const spent = campaigns.reduce((s, c) => s + c.spentCents, 0);
    res.json({
      budgetCents: project.marketingBudgetCents ?? 0,
      allocatedCents: allocated,
      spentCents: spent,
      activeCampaigns: campaigns.filter((c) => c.status === 'attiva').length
    });
  });

  return router;
}
