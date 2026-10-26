import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { fileRegisterSchema, fileUploadRequestSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { projectFiles, users } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound, unavailable } from '../../lib/http-error.js';
import { notifyTeam } from '../../lib/notify.js';
import { serialize } from '../../lib/serialize.js';
import { isAllowedFileType, MAX_FILE_BYTES, safeFileName, type FileStorage } from '../../lib/storage.js';
import { parse } from '../../lib/validate.js';
import { isTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';

const uuidParam = z.uuid('ID non valido');
const columns = {
  id: projectFiles.id, projectId: projectFiles.projectId, name: projectFiles.name, contentType: projectFiles.contentType,
  sizeBytes: projectFiles.sizeBytes, url: projectFiles.url, uploadedById: projectFiles.uploadedById,
  uploadedByName: users.name, uploadedByRole: users.role, createdAt: projectFiles.createdAt
};

/**
 * Materiali del progetto (logo, foto, testi...). Il browser carica il file direttamente su Vercel Blob
 * con un token monouso limitato a un percorso del progetto; poi lo registra qui.
 * Cliente e team vedono e caricano; il cliente elimina solo i propri file.
 */
export function filesRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  const storage = (): FileStorage => {
    if (!ctx.storage) throw unavailable('Caricamento file non configurato');
    return ctx.storage;
  };
  const prefix = (projectId: string) => `projects/${projectId}/`;

  async function load(id: string, projectId: string) {
    const [row] = await db.select(columns).from(projectFiles).leftJoin(users, eq(users.id, projectFiles.uploadedById))
      .where(and(eq(projectFiles.id, id), eq(projectFiles.projectId, projectId)));
    if (!row) throw notFound('File');
    return row;
  }

  router.get('/', async (_req, res) => {
    const rows = await db.select(columns).from(projectFiles).leftJoin(users, eq(users.id, projectFiles.uploadedById))
      .where(eq(projectFiles.projectId, currentProject(res).id)).orderBy(desc(projectFiles.createdAt));
    res.json(serialize(rows));
  });

  /** Passo 1: token di caricamento per un percorso univoco del progetto. */
  router.post('/upload-token', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const input = parse(fileUploadRequestSchema, req.body);
    if (!isAllowedFileType(input.contentType)) throw badRequest('Tipo di file non ammesso (immagini, PDF, documenti Office, ZIP, testo, audio, video)');
    const pathname = `${prefix(project.id)}${randomBytes(8).toString('hex')}-${safeFileName(input.name)}`;
    const clientToken = await storage().createUploadToken(pathname, { maxBytes: MAX_FILE_BYTES, contentType: input.contentType });
    res.json({ pathname, clientToken });
  });

  /** Passo 2: registra il file caricato (verificato sull'archivio, non ci si fida del browser). */
  router.post('/', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const input = parse(fileRegisterSchema, req.body);
    if (!input.pathname.startsWith(prefix(project.id)) || input.pathname.includes('..')) throw badRequest('Percorso file non valido');
    const info = await storage().head(input.pathname);
    if (!info) throw badRequest('File non trovato: ricarica il file');
    if (info.size > MAX_FILE_BYTES) throw badRequest('File troppo grande (max 25 MB)');
    const [row] = await db.insert(projectFiles).values({
      projectId: project.id, uploadedById: req.user!.id, name: input.name, contentType: info.contentType,
      sizeBytes: info.size, url: info.url, pathname: info.pathname
    }).onConflictDoNothing({ target: projectFiles.pathname }).returning({ id: projectFiles.id });
    if (!row) throw badRequest('File già registrato');
    await audit(db, req, { action: 'file.uploaded', entity: 'file', entityId: row.id, projectId: project.id, meta: { name: input.name, size: info.size } });
    if (!isTeam(req)) {
      await notifyTeam(ctx.env, {
        title: `📎 ${req.user!.name} ha caricato un file`,
        lines: [`📄 ${input.name} (${Math.max(1, Math.round(info.size / 1024))} KB)`, `📁 ${project.name}`],
        path: `/admin/progetti/${project.id}/materiali`,
        buttonLabel: '📎 Apri i materiali'
      });
    }
    res.status(201).json(serialize(await load(row.id, project.id)));
  });

  router.delete('/:fileId', async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const file = await load(parse(uuidParam, req.params['fileId']), project.id);
    const canDelete = isTeam(req) || file.uploadedById === req.user!.id || (req.user?.clientId != null && req.user.clientId === project.clientId);
    if (!canDelete) throw forbidden('Puoi eliminare solo i file del tuo progetto o caricati da te');
    if (ctx.storage) {
      try {
        await ctx.storage.remove(file.url);
      } catch (storageErr) {
        console.warn(`[files] Rimozione blob storage ignorata o fallita (${file.url}):`, storageErr);
      }
    }
    await db.delete(projectFiles).where(eq(projectFiles.id, file.id));
    await audit(db, req, { action: 'file.deleted', entity: 'file', entityId: file.id, projectId: project.id, meta: { name: file.name } });
    res.status(204).end();
  });

  return router;
}
