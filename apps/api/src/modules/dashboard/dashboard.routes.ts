import { Router } from 'express';
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte } from 'drizzle-orm';
import { PROJECT_STATUSES, type ProjectStatus } from '@cf/shared/catalog';
import type { AppContext } from '../../context.js';
import { documents, leads, projects, tasks } from '../../db/schema.js';
import { serialize } from '../../lib/serialize.js';
import { requireTeam } from '../../middleware/auth.js';

export function dashboardRouter(ctx: AppContext): Router {
  const router = Router();
  const { db } = ctx;

  router.get('/', requireTeam, async (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const active = isNull(projects.archivedAt);

    const [byStatus, deadlines, overdue, inReview, newLeads] = await Promise.all([
      db.select({ status: projects.status, n: count() }).from(projects).where(active).groupBy(projects.status),
      db.select({ projectId: projects.id, projectName: projects.name, deadline: projects.deadline }).from(projects)
        .where(and(active, gte(projects.deadline, today), lte(projects.deadline, in30))).orderBy(asc(projects.deadline)).limit(10),
      db.select({ taskId: tasks.id, projectId: projects.id, projectName: projects.name, title: tasks.title, dueDate: tasks.dueDate })
        .from(tasks).innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(and(active, eq(tasks.done, false), lt(tasks.dueDate, today))).orderBy(asc(tasks.dueDate)).limit(15),
      db.select({ documentId: documents.id, projectId: projects.id, projectName: projects.name, title: documents.title, status: documents.status })
        .from(documents).innerJoin(projects, eq(projects.id, documents.projectId))
        .where(and(active, inArray(documents.status, ['in_revisione', 'modifiche_richieste']))).orderBy(desc(documents.updatedAt)).limit(15),
      db.select({ n: count() }).from(leads).where(eq(leads.status, 'nuovo'))
    ]);

    const projectsByStatus = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<ProjectStatus, number>;
    for (const r of byStatus) projectsByStatus[r.status] = Number(r.n);

    res.json(serialize({
      projectsByStatus,
      upcomingDeadlines: deadlines,
      overdueTasks: overdue,
      documentsInReview: inReview,
      newLeads: Number(newLeads[0]?.n ?? 0)
    }));
  });

  return router;
}
