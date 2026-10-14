import type { Request } from 'express';
import type { Database } from '../db/client.js';
import { auditLog } from '../db/schema.js';
import { pseudonymIp } from './privacy.js';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  projectId?: string | null;
  meta?: Record<string, unknown>;
}

/** Scrive una riga di audit. Non blocca mai la richiesta: errori solo loggati. */
export async function audit(db: Database, req: Request, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: req.user?.id ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      projectId: entry.projectId ?? null,
      meta: entry.meta ?? {},
      ipHash: pseudonymIp(req.ip)
    });
  } catch (err) {
    console.error('[audit] scrittura fallita', err);
  }
}
