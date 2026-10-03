import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AppContext } from '../../context.js';
import { projects } from '../../db/schema.js';
import { forbidden, notFound, unauthorized } from '../../lib/http-error.js';
import { parse } from '../../lib/validate.js';

export type ProjectRow = typeof projects.$inferSelect;

const uuidParam = z.uuid('ID progetto non valido');

/** Unico punto di controllo accessi ai progetti. Un cliente vede solo i progetti del proprio cliente. */
export async function loadProjectFor(ctx: AppContext, req: Request, projectId: string): Promise<ProjectRow> {
  const user = req.user;
  if (!user) throw unauthorized();
  const [project] = await ctx.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw notFound('Progetto');
  if (user.role === 'client' && (!user.clientId || project.clientId !== user.clientId)) throw notFound('Progetto');
  return project;
}

/** Middleware per i router annidati /projects/:projectId/... */
export function projectScope(ctx: AppContext): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const projectId = parse(uuidParam, req.params['projectId']);
    res.locals['project'] = await loadProjectFor(ctx, req, projectId);
    next();
  };
}

export function currentProject(res: Response): ProjectRow {
  const p = res.locals['project'] as ProjectRow | undefined;
  if (!p) throw new Error('projectScope non applicato');
  return p;
}

/** Il cliente non può modificare un progetto archiviato né scrivere dove non previsto. */
export function assertWritable(project: ProjectRow): void {
  if (project.archivedAt) throw forbidden('Progetto archiviato: ripristinalo per modificarlo');
}
