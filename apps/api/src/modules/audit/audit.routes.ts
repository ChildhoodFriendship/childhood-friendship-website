import { Router } from 'express';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { auditListQuerySchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { auditLog, users } from '../../db/schema.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { requireAdmin } from '../../middleware/auth.js';

export const auditColumns = {
  id: auditLog.id,
  actorId: auditLog.actorId,
  actorName: users.name,
  actorRole: users.role,
  action: auditLog.action,
  entity: auditLog.entity,
  entityId: auditLog.entityId,
  projectId: auditLog.projectId,
  ipHash: auditLog.ipHash,
  meta: auditLog.meta,
  createdAt: auditLog.createdAt
};

export function auditRouter(ctx: AppContext): Router {
  const router = Router();
  router.get('/', requireAdmin, async (req, res) => {
    const q = parse(auditListQuerySchema, req.query);
    const where: SQL[] = [];
    if (q.entity) where.push(eq(auditLog.entity, q.entity));
    if (q.entityId) where.push(eq(auditLog.entityId, q.entityId));
    if (q.actorId) where.push(eq(auditLog.actorId, q.actorId));
    const cond = where.length ? and(...where) : undefined;
    const [{ total } = { total: 0 }] = await ctx.db.select({ total: count() }).from(auditLog).where(cond);
    const rows = await ctx.db.select(auditColumns).from(auditLog).leftJoin(users, eq(users.id, auditLog.actorId))
      .where(cond).orderBy(desc(auditLog.createdAt)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
    res.json({ items: serialize(rows), total: Number(total), page: q.page, pageSize: q.pageSize });
  });
  return router;
}
