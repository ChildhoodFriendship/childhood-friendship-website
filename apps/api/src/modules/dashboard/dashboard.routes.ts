import { Router } from 'express';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte } from 'drizzle-orm';
import { LEAD_STATUSES, PROJECT_STATUSES, type LeadStatus, type ProjectStatus } from '@cf/shared/catalog';
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

    const now = new Date();
    const weeks12 = mondays(now, 12);
    const weeks8 = weeks12.slice(-8);
    const months6 = lastMonths(now, 6);
    const [leadStatusRows, recentLeads, closedLeads, openValue, doneTasks] = await Promise.all([
      db.select({ status: leads.status, n: count() }).from(leads).groupBy(leads.status),
      db.select({ createdAt: leads.createdAt, source: leads.source }).from(leads).where(gte(leads.createdAt, new Date(weeks12[0]!))),
      db.select({ closedAt: leads.closedAt, priceCents: leads.priceCents }).from(leads)
        .where(and(isNotNull(leads.closedAt), gte(leads.closedAt, new Date(`${months6[0]}-01`)))),
      db.select({ priceCents: leads.priceCents }).from(leads)
        .where(and(isNull(leads.closedAt), inArray(leads.status, ['nuovo', 'contattato', 'qualificato']), isNotNull(leads.priceCents))),
      db.select({ completedAt: tasks.completedAt }).from(tasks).where(and(eq(tasks.done, true), gte(tasks.completedAt, new Date(weeks8[0]!))))
    ]);

    const leadsByStatus = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    for (const r of leadStatusRows) leadsByStatus[r.status] = Number(r.n);

    const leadsWeekly = weeks12.map((week) => ({ week, sito: 0, prospezione: 0 }));
    for (const l of recentLeads) {
      const b = leadsWeekly.find((w) => w.week === mondayOf(new Date(l.createdAt)));
      if (b) l.source === 'sito' ? b.sito++ : b.prospezione++;
    }
    const revenueMonthly = months6.map((month) => ({ month, cents: 0, deals: 0 }));
    for (const l of closedLeads) {
      const b = revenueMonthly.find((m) => m.month === new Date(l.closedAt!).toISOString().slice(0, 7));
      if (b) { b.cents += l.priceCents ?? 0; b.deals++; }
    }
    const tasksWeekly = weeks8.map((week) => ({ week, completed: 0 }));
    for (const t of doneTasks) {
      const b = tasksWeekly.find((w) => w.week === mondayOf(new Date(t.completedAt!)));
      if (b) b.completed++;
    }
    const pipelineValueCents = openValue.reduce((a, l) => a + (l.priceCents ?? 0), 0);

    const projectsByStatus = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<ProjectStatus, number>;
    for (const r of byStatus) projectsByStatus[r.status] = Number(r.n);

    res.json(serialize({
      projectsByStatus,
      upcomingDeadlines: deadlines,
      overdueTasks: overdue,
      documentsInReview: inReview,
      newLeads: Number(newLeads[0]?.n ?? 0),
      leadsByStatus,
      leadsWeekly,
      revenueMonthly,
      pipelineValueCents,
      tasksWeekly
    }));
  });

  return router;
}

/** Lunedì (UTC, YYYY-MM-DD) della settimana che contiene la data. */
function mondayOf(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** Gli ultimi n lunedì, dal più vecchio alla settimana corrente. */
function mondays(now: Date, n: number): string[] {
  const start = new Date(mondayOf(now));
  return Array.from({ length: n }, (_, i) => new Date(start.getTime() - (n - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10));
}

/** Gli ultimi n mesi (YYYY-MM), dal più vecchio al corrente. */
function lastMonths(now: Date, n: number): string[] {
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1)).toISOString().slice(0, 7));
}
