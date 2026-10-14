import { Router } from 'express';
import { and, desc, eq, lt } from 'drizzle-orm';
import { rateLimit } from 'express-rate-limit';
import { messageInputSchema, messageListQuerySchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { messages, users } from '../../db/schema.js';
import { serialize } from '../../lib/serialize.js';
import { parse } from '../../lib/validate.js';
import { assertWritable, currentProject } from '../projects/access.js';
import { notifyTeam } from '../../lib/notify.js';
import { appUrl, notifyClient } from '../../lib/mailer.js';

const columns = {
  id: messages.id, projectId: messages.projectId, authorId: messages.authorId, authorName: users.name,
  authorRole: users.role, body: messages.body, createdAt: messages.createdAt
};

export function messagesRouter(ctx: AppContext): Router {
  const router = Router({ mergeParams: true });
  const { db } = ctx;
  const postLimiter = rateLimit({
    windowMs: 60_000, limit: ctx.env.NODE_ENV === 'test' ? 1000 : 20, standardHeaders: 'draft-8', legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? 'anon',
    message: { error: { code: 'rate_limited', message: 'Stai inviando troppi messaggi' } }
  });

  /** Ordine cronologico; paginazione all'indietro con ?before=ISO */
  router.get('/', async (req, res) => {
    const project = currentProject(res);
    const q = parse(messageListQuerySchema, req.query);
    const where = q.before ? and(eq(messages.projectId, project.id), lt(messages.createdAt, new Date(q.before))) : eq(messages.projectId, project.id);
    const rows = await db.select(columns).from(messages).innerJoin(users, eq(users.id, messages.authorId))
      .where(where).orderBy(desc(messages.createdAt)).limit(q.limit);
    res.json(serialize(rows.reverse()));
  });

  router.post('/', postLimiter, async (req, res) => {
    const project = currentProject(res);
    assertWritable(project);
    const { body } = parse(messageInputSchema, req.body);
    const [row] = await db.insert(messages).values({ projectId: project.id, authorId: req.user!.id, body }).returning({ id: messages.id });
    const [full] = await db.select(columns).from(messages).innerJoin(users, eq(users.id, messages.authorId)).where(eq(messages.id, row!.id));
    if (req.user!.role === 'client') {
      await notifyTeam(ctx.env, {
        title: `💬 Messaggio da ${req.user!.name}`,
        lines: [`📁 ${project.name}`],
        path: `/admin/progetti/${project.id}/messaggi`,
        buttonLabel: '💬 Rispondi'
      });
    } else {
      await notifyClient(db, ctx.mailer, project.clientId, {
        subject: `Nuovo messaggio su «${project.name}»`,
        heading: 'Hai un nuovo messaggio',
        paragraphs: [`${req.user!.name} ti ha scritto sul progetto «${project.name}».`],
        quote: body,
        url: appUrl(ctx.env, `portale/progetti/${project.id}`),
        cta: 'Leggi e rispondi'
      });
    }
    res.status(201).json(serialize(full!));
  });

  return router;
}
