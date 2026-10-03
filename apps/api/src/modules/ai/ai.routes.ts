import { Router, type Request, type RequestHandler } from 'express';
import { and, asc, count, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { getDocumentTypeDef, PROJECT_STATUS_LABELS, type AiFeature } from '@cf/shared/catalog';
import { aiDocumentSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { aiUsage, clients, documents, marketingAnalyses, marketingCampaigns, tasks } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { HttpError, badRequest, notFound, tooMany, unavailable } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { requireTeam } from '../../middleware/auth.js';
import { currentProject, type ProjectRow } from '../projects/access.js';
import { extractJson } from './provider.js';
import * as P from './prompts.js';

const uuidParam = z.uuid('ID non valido');
const stringList = z.array(z.string().trim().min(1).max(400)).max(15);
const MAX_CONTEXT = 12_000;

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export function aiUsageRouter(ctx: AppContext): Router {
  const router = Router();
  router.get('/usage', requireTeam, async (req, res) => {
    const [{ n } = { n: 0 }] = await ctx.db.select({ n: count() }).from(aiUsage).where(and(eq(aiUsage.userId, req.user!.id), gte(aiUsage.createdAt, startOfToday())));
    res.json({ usedToday: Number(n), dailyLimit: ctx.env.AI_DAILY_LIMIT, enabled: ctx.ai !== null });
  });
  return router;
}

export function aiRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  router.use(requireTeam);

  const ensureEnabled: RequestHandler = (_req, _res, next) => {
    if (!ctx.ai) return next(unavailable('AI non configurata: imposta GEMINI_API_KEY (o AI_BASE_URL + AI_API_KEY)'));
    next();
  };
  router.use(ensureEnabled);

  async function run(req: Request, project: ProjectRow, feature: AiFeature, system: string, prompt: string, json: boolean): Promise<string> {
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(aiUsage).where(and(eq(aiUsage.userId, req.user!.id), gte(aiUsage.createdAt, startOfToday())));
    if (Number(n) >= ctx.env.AI_DAILY_LIMIT) throw tooMany(`Limite giornaliero AI raggiunto (${ctx.env.AI_DAILY_LIMIT} richieste)`);
    const text = await ctx.ai!.generate({ system, prompt, json, maxOutputTokens: json ? 1500 : 3000 });
    await db.insert(aiUsage).values({ userId: req.user!.id, feature, projectId: project.id, inputChars: prompt.length, outputChars: text.length });
    return text;
  }

  async function projectContext(project: ProjectRow, opts: { includeDocs?: boolean } = {}): Promise<string> {
    const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, project.clientId));
    const lines = [
      `Progetto: ${project.name}`,
      `Cliente: ${client?.name ?? '—'}`,
      `Stato: ${PROJECT_STATUS_LABELS[project.status]}`,
      project.description ? `Descrizione: ${project.description}` : '',
      project.startDate ? `Inizio: ${project.startDate}` : '',
      project.deadline ? `Consegna: ${project.deadline}` : '',
      project.targetUrl ? `Sito: ${project.targetUrl}` : ''
    ].filter(Boolean);
    if (opts.includeDocs !== false) {
      const docs = await db.select({ title: documents.title, type: documents.type, content: documents.content, data: documents.data, status: documents.status })
        .from(documents).where(eq(documents.projectId, project.id)).orderBy(asc(documents.position));
      for (const d of docs) {
        const hasData = Object.values(d.data).some((v) => (Array.isArray(v) ? v.length : !!v));
        if (!d.content.trim() && !hasData) continue;
        lines.push(`\n## ${d.title} [${d.status}]`);
        if (hasData) lines.push(JSON.stringify(d.data));
        if (d.content.trim()) lines.push(d.content.slice(0, 1200));
      }
    }
    const ctxText = lines.join('\n');
    return ctxText.length > MAX_CONTEXT ? `${ctxText.slice(0, MAX_CONTEXT)}\n[...contesto troncato]` : ctxText;
  }

  async function saveAnalysis(req: Request, project: ProjectRow, kind: 'swot' | 'pestel' | 'suggerimenti', data: Record<string, string[]>) {
    const [row] = await db.insert(marketingAnalyses).values({ projectId: project.id, kind, data, createdById: req.user!.id })
      .returning({ id: marketingAnalyses.id, projectId: marketingAnalyses.projectId, kind: marketingAnalyses.kind, data: marketingAnalyses.data, createdAt: marketingAnalyses.createdAt });
    await audit(db, req, { action: `ai.${kind}`, entity: 'marketing_analysis', entityId: row!.id, projectId: project.id });
    return serialize(row!);
  }

  /** Bozza o miglioramento di un documento. Non salva: il testo torna all'editor per revisione umana. */
  router.post('/documents/:docId', async (req, res) => {
    const project = currentProject(res);
    const docId = parse(uuidParam, req.params['docId']);
    const input = parse(aiDocumentSchema, req.body);
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, docId), eq(documents.projectId, project.id)));
    if (!doc) throw notFound('Documento');
    const def = getDocumentTypeDef(doc.type);
    const text = await run(req, project, 'document', P.SYSTEM_BASE, P.documentPrompt({
      title: doc.title,
      typeLabel: def?.label ?? 'documento',
      fields: def?.fields.map((f) => f.label).join(', ') ?? '',
      context: await projectContext(project),
      existing: doc.content,
      action: input.action,
      instructions: input.instructions
    }), false);
    res.json({ text: text.trim() });
  });

  router.post('/suggestions', async (req, res) => {
    const project = currentProject(res);
    const raw = await run(req, project, 'suggestions', P.SYSTEM_BASE, P.suggestionsPrompt(await projectContext(project)), true);
    const parsed = z.object({ suggerimenti: stringList }).safeParse(extractJson(raw));
    if (!parsed.success) throw new HttpError(502, 'ai_bad_json', 'Risposta AI incompleta, riprova');
    res.status(201).json(await saveAnalysis(req, project, 'suggerimenti', parsed.data));
  });

  router.post('/swot', async (req, res) => {
    const project = currentProject(res);
    const raw = await run(req, project, 'swot', P.SYSTEM_BASE, P.swotPrompt(await projectContext(project)), true);
    const parsed = z.object({ strengths: stringList, weaknesses: stringList, opportunities: stringList, threats: stringList }).safeParse(extractJson(raw));
    if (!parsed.success) throw new HttpError(502, 'ai_bad_json', 'Risposta AI incompleta, riprova');
    res.status(201).json(await saveAnalysis(req, project, 'swot', parsed.data));
  });

  router.post('/pestel', async (req, res) => {
    const project = currentProject(res);
    const raw = await run(req, project, 'pestel', P.SYSTEM_BASE, P.pestelPrompt(await projectContext(project)), true);
    const parsed = z.object({ political: stringList, economic: stringList, social: stringList, technological: stringList, environmental: stringList, legal: stringList }).safeParse(extractJson(raw));
    if (!parsed.success) throw new HttpError(502, 'ai_bad_json', 'Risposta AI incompleta, riprova');
    res.status(201).json(await saveAnalysis(req, project, 'pestel', parsed.data));
  });

  router.post('/campaigns/:campaignId/post-idea', async (req, res) => {
    const project = currentProject(res);
    const id = parse(uuidParam, req.params['campaignId']);
    const [c] = await db.select().from(marketingCampaigns).where(and(eq(marketingCampaigns.id, id), eq(marketingCampaigns.projectId, project.id)));
    if (!c) throw notFound('Campagna');
    const text = await run(req, project, 'campaign_post', P.SYSTEM_BASE, P.campaignPostPrompt({
      name: c.name, objective: c.objective, audience: [c.target.audience, c.target.age, c.target.sex].filter(Boolean).join(', '),
      context: await projectContext(project, { includeDocs: false })
    }), false);
    res.json({ text: text.trim() });
  });

  router.post('/tasks/:taskId/due-date', async (req, res) => {
    const project = currentProject(res);
    const id = parse(uuidParam, req.params['taskId']);
    if (!project.deadline) throw badRequest('Imposta la scadenza del progetto per stimare le date dei task');
    const [t] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, project.id)));
    if (!t) throw notFound('Task');
    const today = new Date().toISOString().slice(0, 10);
    const raw = await run(req, project, 'task_due_date', P.SYSTEM_BASE, P.dueDatePrompt({
      task: `${t.title} (fase: ${t.phase})`, start: project.startDate ?? today, deadline: project.deadline, today,
      context: await projectContext(project, { includeDocs: false })
    }), true);
    const parsed = z.object({ dueDate: z.iso.date(), reasoning: z.string().max(500) }).safeParse(extractJson(raw));
    if (!parsed.success) throw new HttpError(502, 'ai_bad_json', 'Risposta AI non valida, riprova');
    const dueDate = parsed.data.dueDate > project.deadline ? project.deadline : parsed.data.dueDate;
    res.json({ dueDate, reasoning: parsed.data.reasoning });
  });

  return router;
}
