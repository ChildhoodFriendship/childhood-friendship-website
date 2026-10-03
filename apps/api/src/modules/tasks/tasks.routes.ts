import { Router } from 'express';
import { and, asc, eq, inArray, max } from 'drizzle-orm';
import { z } from 'zod';
import { taskInputSchema, taskPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { documents, tasks, users } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, parse } from '../../lib/validate.js';
import { requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';

const uuidParam = z.uuid('ID non valido');
const columns = {
  id: tasks.id, projectId: tasks.projectId, title: tasks.title, phase: tasks.phase, done: tasks.done, dueDate: tasks.dueDate,
  assigneeId: tasks.assigneeId, documentId: tasks.documentId, position: tasks.position, completedAt: tasks.completedAt
};

export function tasksRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;

  async function checkRefs(projectId: string, input: { assigneeId?: string | null; documentId?: string | null }) {
    if (input.documentId) {
      const [d] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, input.documentId), eq(documents.projectId, projectId)));
      if (!d) throw badRequest('Documento non appartenente al progetto');
    }
    if (input.assigneeId) {
      const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.assigneeId));
      if (!u || u.role === 'client') throw badRequest('Assegnatario non valido');
    }
  }

  router.get('/', async (_req, res) => {
    const rows = await db.select(columns).from(tasks).where(eq(tasks.projectId, currentProject(res).id)).orderBy(asc(tasks.position), asc(tasks.createdAt));
    res.json(serialize(rows));
  });

  router.post('/', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const input = parse(taskInputSchema, req.body);
    await checkRefs(project.id, input);
    const [{ maxPos } = { maxPos: null }] = await db.select({ maxPos: max(tasks.position) }).from(tasks).where(eq(tasks.projectId, project.id));
    const [row] = await db.insert(tasks).values({
      ...input, projectId: project.id, position: input.position ?? (maxPos ?? -1) + 1, completedAt: input.done ? new Date() : null
    }).returning(columns);
    await audit(db, req, { action: 'task.created', entity: 'task', entityId: row!.id, projectId: project.id, meta: { title: row!.title } });
    res.status(201).json(serialize(row!));
  });

  router.post('/reorder', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const { ids } = parse(z.object({ ids: z.array(z.uuid()).min(1).max(500) }), req.body);
    const owned = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.projectId, project.id), inArray(tasks.id, ids)));
    if (owned.length !== new Set(ids).size) throw badRequest('Elenco task non valido');
    await db.transaction(async (tx) => {
      for (const [i, id] of ids.entries()) await tx.update(tasks).set({ position: i }).where(eq(tasks.id, id));
    });
    res.status(204).end();
  });

  router.patch('/:taskId', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const id = parse(uuidParam, req.params['taskId']);
    const input = defined(parse(taskPatchSchema, req.body));
    await checkRefs(project.id, input);
    const patch: Partial<typeof tasks.$inferInsert> = { ...input };
    if (input.done !== undefined) patch.completedAt = input.done ? new Date() : null;
    const [row] = await db.update(tasks).set(patch).where(and(eq(tasks.id, id), eq(tasks.projectId, project.id))).returning(columns);
    if (!row) throw notFound('Task');
    await audit(db, req, { action: input.done === undefined ? 'task.updated' : input.done ? 'task.completed' : 'task.reopened', entity: 'task', entityId: id, projectId: project.id });
    res.json(serialize(row));
  });

  router.delete('/:taskId', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const id = parse(uuidParam, req.params['taskId']);
    const [row] = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, project.id))).returning({ id: tasks.id, title: tasks.title });
    if (!row) throw notFound('Task');
    await audit(db, req, { action: 'task.deleted', entity: 'task', entityId: id, projectId: project.id, meta: { title: row.title } });
    res.status(204).end();
  });

  return router;
}
