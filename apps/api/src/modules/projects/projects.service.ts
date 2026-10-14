import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';
import { DEFAULT_PROJECT_DOCUMENTS, PORTAL_HIDDEN_PROJECT_FIELDS } from '@cf/shared/catalog';
import type { z } from 'zod';
import type { projectInputSchema, projectListQuerySchema } from '@cf/shared/schemas';
import type { Database } from '../../db/client.js';
import { clients, documents, projects, tasks } from '../../db/schema.js';
import { badRequest } from '../../lib/http-error.js';

const progressColumns = {
  tasksDone: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.done})`,
  tasksTotal: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id})`,
  documentsApproved: sql<number>`(select count(*)::int from ${documents} where ${documents.projectId} = ${projects.id} and ${documents.status} = 'approvato')`,
  documentsTotal: sql<number>`(select count(*)::int from ${documents} where ${documents.projectId} = ${projects.id})`
};

/** Avanzamento visto dal cliente: solo task senza documento o legati a documenti visibili, solo documenti visibili. */
const clientVisibleTask = sql`(${tasks.documentId} is null or ${tasks.documentId} in (select ${documents.id} from ${documents} where ${documents.clientVisible}))`;
const portalProgressColumns = {
  tasksDone: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id} and ${tasks.done} and ${clientVisibleTask})`,
  tasksTotal: sql<number>`(select count(*)::int from ${tasks} where ${tasks.projectId} = ${projects.id} and ${clientVisibleTask})`,
  documentsApproved: sql<number>`(select count(*)::int from ${documents} where ${documents.projectId} = ${projects.id} and ${documents.clientVisible} and ${documents.status} = 'approvato')`,
  documentsTotal: sql<number>`(select count(*)::int from ${documents} where ${documents.projectId} = ${projects.id} and ${documents.clientVisible})`
};

/** Toglie i campi interni prima di rispondere a un cliente. */
export function toPortalDto<T extends Record<string, unknown>>(dto: T): Omit<T, (typeof PORTAL_HIDDEN_PROJECT_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...dto };
  for (const k of PORTAL_HIDDEN_PROJECT_FIELDS) delete copy[k];
  return copy as Omit<T, (typeof PORTAL_HIDDEN_PROJECT_FIELDS)[number]>;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export type ProjectListQuery = z.output<typeof projectListQuerySchema>;

export class ProjectsService {
  constructor(private readonly db: Database) {}

  async list(query: ProjectListQuery, onlyClientId?: string) {
    const progress = onlyClientId ? portalProgressColumns : progressColumns;
    const where: SQL[] = [query.archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt)];
    if (onlyClientId) where.push(eq(projects.clientId, onlyClientId));
    else if (query.clientId) where.push(eq(projects.clientId, query.clientId));
    if (query.status) where.push(eq(projects.status, query.status));
    if (query.q) {
      const like = `%${escapeLike(query.q)}%`;
      where.push(or(ilike(projects.name, like), ilike(clients.name, like))!);
    }
    const cond = and(...where);
    const [{ total } = { total: 0 }] = await this.db.select({ total: count() }).from(projects).innerJoin(clients, eq(clients.id, projects.clientId)).where(cond);
    const rows = await this.db
      .select({ project: projects, clientName: clients.name, ...progress })
      .from(projects).innerJoin(clients, eq(clients.id, projects.clientId))
      .where(cond)
      .orderBy(asc(sql`${projects.deadline} is null`), asc(projects.deadline), desc(projects.updatedAt))
      .limit(query.pageSize).offset((query.page - 1) * query.pageSize);
    return { items: rows.map(toDto), total: Number(total), page: query.page, pageSize: query.pageSize };
  }

  async get(id: string, forClient = false) {
    const [row] = await this.db
      .select({ project: projects, clientName: clients.name, ...(forClient ? portalProgressColumns : progressColumns) })
      .from(projects).innerJoin(clients, eq(clients.id, projects.clientId))
      .where(eq(projects.id, id)).limit(1);
    return row ? toDto(row) : undefined;
  }

  /** Crea progetto + 22 documenti standard + checklist collegata, in un'unica transazione. */
  async create(input: z.output<typeof projectInputSchema>, actorId: string) {
    const { withTemplate, ...data } = input;
    const [client] = await this.db.select({ id: clients.id }).from(clients).where(eq(clients.id, data.clientId));
    if (!client) throw badRequest('Cliente inesistente');
    if (data.startDate && data.deadline && data.deadline < data.startDate) throw badRequest('La scadenza precede la data di inizio');
    return this.db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values(data).returning();
      if (withTemplate) {
        const docs = await tx.insert(documents).values(DEFAULT_PROJECT_DOCUMENTS.map((d, i) => ({
          projectId: project!.id,
          type: d.type,
          title: d.label,
          content: '',
          data: {},
          clientVisible: d.clientVisible,
          position: i,
          updatedById: actorId
        }))).returning({ id: documents.id, type: documents.type, title: documents.title });
        await tx.insert(tasks).values(DEFAULT_PROJECT_DOCUMENTS.map((d, i) => ({
          projectId: project!.id,
          title: d.label,
          phase: d.phase,
          documentId: docs.find((x) => x.type === d.type)?.id ?? null,
          position: i
        })));
      }
      return project!;
    });
  }
}

function toDto(row: { project: typeof projects.$inferSelect; clientName: string; tasksDone: number; tasksTotal: number; documentsApproved: number; documentsTotal: number }) {
  return {
    ...row.project,
    clientName: row.clientName,
    progress: {
      tasksDone: Number(row.tasksDone), tasksTotal: Number(row.tasksTotal),
      documentsApproved: Number(row.documentsApproved), documentsTotal: Number(row.documentsTotal)
    }
  };
}
