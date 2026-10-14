import { Router } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { appointmentInputSchema, appointmentPatchSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { appointments } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, parse } from '../../lib/validate.js';
import { isTeam, requireTeam } from '../../middleware/auth.js';
import { assertWritable, currentProject } from '../projects/access.js';

const uuidParam = z.uuid('ID non valido');
const portalColumns = { id: appointments.id, projectId: appointments.projectId, title: appointments.title, startsAt: appointments.startsAt, kind: appointments.kind };
const columns = { ...portalColumns, notes: appointments.notes };

export function appointmentsRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;

  router.get('/', async (req, res) => {
    // Le note sono interne al team
    const cols = isTeam(req) ? columns : portalColumns;
    res.json(serialize(await db.select(cols).from(appointments).where(eq(appointments.projectId, currentProject(res).id)).orderBy(asc(appointments.startsAt))));
  });

  router.post('/', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const input = parse(appointmentInputSchema, req.body);
    const [row] = await db.insert(appointments).values({ ...input, startsAt: new Date(input.startsAt), projectId: project.id }).returning(columns);
    await audit(db, req, { action: 'appointment.created', entity: 'appointment', entityId: row!.id, projectId: project.id });
    res.status(201).json(serialize(row!));
  });

  router.patch('/:appointmentId', requireTeam, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const id = parse(uuidParam, req.params['appointmentId']);
    const input = defined(parse(appointmentPatchSchema, req.body));
    const { startsAt, ...rest } = input;
    const [row] = await db.update(appointments).set({ ...rest, ...(startsAt && { startsAt: new Date(startsAt) }) })
      .where(and(eq(appointments.id, id), eq(appointments.projectId, project.id))).returning(columns);
    if (!row) throw notFound('Appuntamento');
    res.json(serialize(row));
  });

  router.delete('/:appointmentId', requireTeam, async (req, res) => {
    const project = currentProject(res);
    const id = parse(uuidParam, req.params['appointmentId']);
    const [row] = await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.projectId, project.id))).returning({ id: appointments.id });
    if (!row) throw notFound('Appuntamento');
    await audit(db, req, { action: 'appointment.deleted', entity: 'appointment', entityId: id, projectId: project.id });
    res.status(204).end();
  });

  return router;
}
