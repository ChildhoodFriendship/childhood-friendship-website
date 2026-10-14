import { Router, type Request } from 'express';
import { aliasedTable, and, asc, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import { getDocumentTypeDef } from '@cf/shared/catalog';
import { documentCreateSchema, documentDataSchema, documentPatchSchema, documentReviewSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { documents, documentVersions, tasks, users } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { isTeam, requireAdmin, requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';
import { notifyTeam } from '../../lib/notify.js';
import { appUrl, notifyClient } from '../../lib/mailer.js';

const uuidParam = z.uuid('ID non valido');
const summary = {
  id: documents.id, projectId: documents.projectId, type: documents.type, title: documents.title, status: documents.status,
  clientVisible: documents.clientVisible, version: documents.version, updatedAt: documents.updatedAt
};
const editor = aliasedTable(users, 'editor');

export function documentsRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;

  async function loadDoc(req: Request, projectId: string) {
    const id = parse(uuidParam, req.params['docId']);
    const [row] = await db.select({ doc: documents, updatedByName: editor.name })
      .from(documents).leftJoin(editor, eq(editor.id, documents.updatedById))
      .where(and(eq(documents.id, id), eq(documents.projectId, projectId))).limit(1);
    if (!row || (!isTeam(req) && !row.doc.clientVisible)) throw notFound('Documento');
    return { ...row.doc, updatedByName: row.updatedByName };
  }

  const toDto = (d: Awaited<ReturnType<typeof loadDoc>>) => {
    const { updatedById: _u, reviewedById: _r, position: _p, createdAt: _c, ...rest } = d;
    return serialize(rest);
  };

  router.get('/', async (req, res) => {
    const project = currentProject(res);
    const where = isTeam(req) ? eq(documents.projectId, project.id) : and(eq(documents.projectId, project.id), eq(documents.clientVisible, true));
    res.json(serialize(await db.select(summary).from(documents).where(where).orderBy(asc(documents.position), asc(documents.createdAt))));
  });

  router.post('/', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const input = parse(documentCreateSchema, req.body);
    const data = parse(documentDataSchema(input.type), input.data);
    const def = getDocumentTypeDef(input.type);
    const [{ maxPos } = { maxPos: null }] = await db.select({ maxPos: max(documents.position) }).from(documents).where(eq(documents.projectId, project.id));
    const [row] = await db.insert(documents).values({
      projectId: project.id, type: input.type, title: input.title, content: input.content, data,
      clientVisible: input.clientVisible ?? def?.clientVisible ?? true, position: (maxPos ?? -1) + 1, updatedById: req.user!.id
    }).returning({ id: documents.id });
    await audit(db, req, { action: 'document.created', entity: 'document', entityId: row!.id, projectId: project.id, meta: { title: input.title } });
    req.params['docId'] = row!.id;
    res.status(201).json(toDto(await loadDoc(req, project.id)));
  });

  router.get('/:docId', async (req, res) => {
    res.json(toDto(await loadDoc(req, currentProject(res).id)));
  });

  router.patch('/:docId', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const doc = await loadDoc(req, project.id);
    const input = parse(documentPatchSchema, req.body);
    if (input.baseVersion !== doc.version) {
      throw conflict('Il documento è stato modificato da qualcun altro. Ricarica per vedere la versione aggiornata.', { currentVersion: doc.version });
    }
    const data = input.data !== undefined ? parse(documentDataSchema(doc.type), input.data) : undefined;
    const contentChanged = (input.title !== undefined && input.title !== doc.title)
      || (input.content !== undefined && input.content !== doc.content)
      || data !== undefined;
    await db.transaction(async (tx) => {
      if (contentChanged) {
        await tx.insert(documentVersions).values({
          documentId: doc.id, version: doc.version, title: doc.title, content: doc.content, data: doc.data, createdById: req.user!.id
        });
      }
      const [updated] = await tx.update(documents).set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(data !== undefined && { data }),
        ...(input.clientVisible !== undefined && { clientVisible: input.clientVisible }),
        ...(contentChanged && { version: doc.version + 1, status: 'bozza' as const, reviewComment: null, reviewedAt: null, reviewedById: null }),
        updatedById: req.user!.id
      }).where(and(eq(documents.id, doc.id), eq(documents.version, doc.version))).returning({ id: documents.id });
      if (!updated) throw conflict('Il documento è stato modificato in contemporanea. Ricarica.');
    });
    await audit(db, req, { action: 'document.updated', entity: 'document', entityId: doc.id, projectId: project.id, meta: { version: contentChanged ? doc.version + 1 : doc.version } });
    res.json(toDto(await loadDoc(req, project.id)));
  });

  router.post('/:docId/submit', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const doc = await loadDoc(req, project.id);
    if (!doc.clientVisible) throw badRequest('Rendi il documento visibile al cliente prima di inviarlo in revisione');
    if (doc.status === 'in_revisione') throw badRequest('Documento già in revisione');
    await db.update(documents).set({ status: 'in_revisione', reviewComment: null, reviewedAt: null, reviewedById: null }).where(eq(documents.id, doc.id));
    await audit(db, req, { action: 'document.submitted', entity: 'document', entityId: doc.id, projectId: project.id });
    await notifyClient(db, ctx.mailer, project.clientId, {
      subject: `Documento da approvare: «${doc.title}»`,
      heading: 'C\'è un documento da rivedere',
      paragraphs: [`Abbiamo preparato «${doc.title}» per il progetto «${project.name}».`, 'Aprilo, controllalo e approvalo oppure chiedi le modifiche: ci arriva subito.'],
      url: appUrl(ctx.env, `portale/progetti/${project.id}/documenti/${doc.id}`),
      cta: 'Apri il documento'
    });
    res.json(toDto(await loadDoc(req, project.id)));
  });

  /** Revisione: il cliente (o il team, per approvazioni ricevute fuori piattaforma). */
  router.post('/:docId/review', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const doc = await loadDoc(req, project.id);
    const input = parse(documentReviewSchema, req.body);
    if (doc.status !== 'in_revisione') throw badRequest('Il documento non è in revisione');
    if (input.decision === 'request_changes' && !input.comment?.trim()) throw badRequest('Indica le modifiche richieste');
    const status = input.decision === 'approve' ? 'approvato' as const : 'modifiche_richieste' as const;
    await db.transaction(async (tx) => {
      await tx.update(documents).set({ status, reviewComment: input.comment ?? null, reviewedAt: new Date(), reviewedById: req.user!.id }).where(eq(documents.id, doc.id));
      if (status === 'approvato') {
        await tx.update(tasks).set({ done: true, completedAt: new Date() }).where(and(eq(tasks.documentId, doc.id), eq(tasks.done, false)));
      }
    });
    await audit(db, req, { action: `document.${status}`, entity: 'document', entityId: doc.id, projectId: project.id, meta: { comment: input.comment ?? null } });
    if (!isTeam(req)) {
      await notifyTeam(ctx.env, {
        title: status === 'approvato' ? `✅ ${req.user!.name} ha approvato un documento` : `✏️ ${req.user!.name} chiede modifiche`,
        lines: [`📄 ${doc.title}`, `📁 ${project.name}`],
        quote: input.comment ?? null,
        path: `/admin/progetti/${project.id}/documenti/${doc.id}`,
        buttonLabel: '📄 Apri il documento'
      });
    }
    res.json(toDto(await loadDoc(req, project.id)));
  });

  router.get('/:docId/versions', requireTeam, async (req, res) => {
    const doc = await loadDoc(req, currentProject(res).id);
    const rows = await db.select({ version: documentVersions.version, title: documentVersions.title, createdAt: documentVersions.createdAt, createdByName: users.name })
      .from(documentVersions).leftJoin(users, eq(users.id, documentVersions.createdById))
      .where(eq(documentVersions.documentId, doc.id)).orderBy(desc(documentVersions.version));
    res.json(serialize(rows));
  });

  router.get('/:docId/versions/:version', requireTeam, async (req, res) => {
    const doc = await loadDoc(req, currentProject(res).id);
    const version = parse(z.coerce.number().int().min(1), req.params['version']);
    const [row] = await db.select({ version: documentVersions.version, title: documentVersions.title, content: documentVersions.content, data: documentVersions.data, createdAt: documentVersions.createdAt })
      .from(documentVersions).where(and(eq(documentVersions.documentId, doc.id), eq(documentVersions.version, version)));
    if (!row) throw notFound('Versione');
    res.json(serialize(row));
  });

  router.delete('/:docId', requireAdmin, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const doc = await loadDoc(req, project.id);
    await db.delete(documents).where(eq(documents.id, doc.id));
    await audit(db, req, { action: 'document.deleted', entity: 'document', entityId: doc.id, projectId: project.id, meta: { title: doc.title } });
    res.status(204).end();
  });

  return router;
}
