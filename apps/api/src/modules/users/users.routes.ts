import { Router } from 'express';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createInviteSchema, updateUserSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { clients, invites, sessions, users } from '../../db/schema.js';
import { audit } from '../../lib/audit.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { appUrl, renderMail } from '../../lib/mailer.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { serialize } from '../../lib/serialize.js';
import { defined, parse } from '../../lib/validate.js';
import { requireAdmin, requireTeam } from '../../middleware/auth.js';

const uuidParam = z.uuid('ID non valido');

const publicUser = {
  id: users.id, email: users.email, name: users.name, role: users.role, clientId: users.clientId,
  isActive: users.isActive, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt
};

export function usersRouter(ctx: AppContext): Router {
  const router = Router();
  const { db, env } = ctx;

  /** Team: elenco utenti (serve anche per assegnare i task). */
  router.get('/', requireTeam, async (_req, res) => {
    const rows = await db.select(publicUser).from(users).orderBy(users.name);
    res.json(serialize(rows));
  });

  router.patch('/:id', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const input = parse(updateUserSchema, req.body);
    if (id === req.user!.id && (input.role && input.role !== 'admin' || input.isActive === false)) {
      throw badRequest('Non puoi rimuovere i tuoi permessi di admin o disattivarti');
    }
    if (input.role === 'client' && input.clientId === undefined) {
      const [current] = await db.select({ clientId: users.clientId }).from(users).where(eq(users.id, id));
      if (!current?.clientId) throw badRequest('Un utente cliente deve essere collegato a un cliente');
    }
    if (input.clientId) {
      const [c] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId));
      if (!c) throw badRequest('Cliente inesistente');
    }
    const [updated] = await db.update(users).set(defined(input)).where(eq(users.id, id)).returning(publicUser);
    if (!updated) throw notFound('Utente');
    if (input.isActive === false || input.role) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
    }
    await audit(db, req, { action: 'user.updated', entity: 'user', entityId: id, meta: { fields: Object.keys(defined(input)) } });
    res.json(serialize(updated));
  });

  router.get('/invites', requireAdmin, async (_req, res) => {
    const rows = await db.select({
      id: invites.id, email: invites.email, role: invites.role, clientId: invites.clientId,
      expiresAt: invites.expiresAt, acceptedAt: invites.acceptedAt, createdAt: invites.createdAt
    }).from(invites).where(isNull(invites.revokedAt)).orderBy(desc(invites.createdAt)).limit(200);
    res.json(serialize(rows));
  });

  router.post('/invites', requireAdmin, async (req, res) => {
    const input = parse(createInviteSchema, req.body);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, input.email)).limit(1);
    if (existing) throw conflict('Esiste già un utente con questa email');
    if (input.clientId) {
      const [c] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId));
      if (!c) throw badRequest('Cliente inesistente');
    }
    const token = randomToken(32);
    const [invite] = await db.insert(invites).values({
      email: input.email,
      role: input.role,
      clientId: input.role === 'client' ? input.clientId ?? null : null,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + env.INVITE_TTL_HOURS * 3_600_000),
      createdById: req.user!.id
    }).returning({
      id: invites.id, email: invites.email, role: invites.role, clientId: invites.clientId,
      expiresAt: invites.expiresAt, acceptedAt: invites.acceptedAt, createdAt: invites.createdAt
    });
    await audit(db, req, { action: 'invite.created', entity: 'invite', entityId: invite!.id, meta: { email: input.email, role: input.role } });
    const acceptUrl = appUrl(env, `invito/${token}`);
    const hours = env.INVITE_TTL_HOURS;
    const emailSent = ctx.mailer ? await ctx.mailer.send({
      to: [input.email],
      ...renderMail({
        subject: input.role === 'client' ? 'Il tuo accesso all\'area clienti Childhood Friendship' : 'Invito al team Childhood Friendship',
        heading: input.role === 'client' ? 'Benvenuto nell\'area clienti' : 'Sei stato invitato nel team',
        paragraphs: [
          `${req.user!.name} ti ha invitato su Childhood Friendship.`,
          input.role === 'client'
            ? 'Dall\'area clienti segui l\'avanzamento del tuo progetto, approvi i documenti, carichi i materiali e ci scrivi.'
            : 'Dalla piattaforma gestisci progetti, clienti e lead.',
          `Il link è personale e scade tra ${hours >= 48 ? `${Math.round(hours / 24)} giorni` : `${hours} ore`}.`
        ],
        url: acceptUrl,
        cta: 'Crea il tuo accesso'
      })
    }) : false;
    res.status(201).json({ ...serialize(invite!), acceptUrl, emailSent });
  });

  router.delete('/invites/:id', requireAdmin, async (req, res) => {
    const id = parse(uuidParam, req.params['id']);
    const [row] = await db.update(invites).set({ revokedAt: new Date() }).where(and(eq(invites.id, id), isNull(invites.acceptedAt))).returning({ id: invites.id });
    if (!row) throw notFound('Invito');
    await audit(db, req, { action: 'invite.revoked', entity: 'invite', entityId: id });
    res.status(204).end();
  });

  return router;
}
