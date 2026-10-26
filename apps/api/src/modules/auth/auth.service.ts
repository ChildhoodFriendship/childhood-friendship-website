import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm';
import { SignJWT } from 'jose';
import type { SessionUser } from '@cf/shared/types';
import type { AppContext } from '../../context.js';
import { clients, invites, leads, passwordResets, sessions, users } from '../../db/schema.js';
import { appUrl, renderWelcomeMail } from '../../lib/mailer.js';
import { getDummyHash, hashPassword, randomToken, sha256, verifyPassword } from '../../lib/crypto.js';
import { HttpError, badRequest, notFound, unauthorized } from '../../lib/http-error.js';
import { jwtKey } from '../../middleware/auth.js';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  user: SessionUser;
  sessionId: string;
}

export class AuthService {
  constructor(private readonly ctx: AppContext) {}

  private toSessionUser(u: typeof users.$inferSelect): SessionUser {
    return { id: u.id, email: u.email, name: u.name, role: u.role, clientId: u.clientId };
  }

  private async issue(user: typeof users.$inferSelect, userAgent: string | undefined): Promise<IssuedTokens> {
    const { env, db } = this.ctx;
    const refreshToken = randomToken(32);
    const refreshMaxAgeMs = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;
    const [session] = await db.insert(sessions).values({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshMaxAgeMs),
      userAgent: userAgent?.slice(0, 300) ?? null
    }).returning({ id: sessions.id });
    return { ...(await this.signAccess(user.id, session!.id)), refreshToken, refreshMaxAgeMs, user: this.toSessionUser(user), sessionId: session!.id };
  }

  private async signAccess(userId: string, sessionId: string) {
    const accessMaxAgeMs = this.ctx.env.ACCESS_TOKEN_TTL_MIN * 60_000;
    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('cf-api')
      .setAudience('cf-app')
      .setIssuedAt()
      .setExpirationTime(`${this.ctx.env.ACCESS_TOKEN_TTL_MIN}m`)
      .sign(jwtKey(this.ctx.env.JWT_SECRET));
    return { accessToken, accessMaxAgeMs };
  }

  async login(email: string, password: string, userAgent?: string): Promise<IssuedTokens> {
    const { db } = this.ctx;
    const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase())).limit(1);
    if (!user) {
      await verifyPassword(password, await getDummyHash());
      throw unauthorized('Credenziali non valide');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpError(423, 'locked', 'Account temporaneamente bloccato per troppi tentativi. Riprova più tardi.');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok || !user.isActive) {
      if (!ok) {
        const failed = user.failedLogins + 1;
        await db.update(users).set({
          failedLogins: failed >= MAX_FAILED ? 0 : failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null
        }).where(eq(users.id, user.id));
      }
      throw unauthorized('Credenziali non valide');
    }
    await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return this.issue(user, userAgent);
  }

  /** Rotazione del refresh token con rilevamento del riuso (token rubato → revoca totale). */
  async refresh(refreshToken: string, userAgent?: string): Promise<IssuedTokens> {
    const { db } = this.ctx;
    const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, sha256(refreshToken))).limit(1);
    if (!session) throw unauthorized('Sessione non valida');
    if (session.revokedAt) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt)));
      throw unauthorized('Sessione revocata');
    }
    if (session.expiresAt <= new Date()) throw unauthorized('Sessione scaduta');
    const [user] = await db.select().from(users).where(and(eq(users.id, session.userId), eq(users.isActive, true))).limit(1);
    if (!user) throw unauthorized('Utente non attivo');
    const issued = await this.issue(user, userAgent);
    await db.update(sessions).set({ revokedAt: new Date(), replacedById: issued.sessionId }).where(eq(sessions.id, session.id));
    return issued;
  }

  async logout(refreshToken: string | undefined, sessionId: string | undefined): Promise<void> {
    const { db } = this.ctx;
    if (sessionId) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
    if (refreshToken) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, sha256(refreshToken)));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.ctx.db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async inviteInfo(token: string) {
    const [invite] = await this.ctx.db.select({ email: invites.email, role: invites.role, expiresAt: invites.expiresAt })
      .from(invites)
      .where(and(eq(invites.tokenHash, sha256(token)), isNull(invites.acceptedAt), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
      .limit(1);
    if (!invite) throw badRequest('Invito non valido o scaduto');
    return invite;
  }

  
  async register(name: string, email: string, password: string, userAgent?: string): Promise<IssuedTokens> {
    const { db } = this.ctx;
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const passwordHash = await hashPassword(password);

    const user = await db.transaction(async (tx) => {
      // 1. Check if user already exists
      const [existingUser] = await tx.select().from(users).where(eq(sql`lower(${users.email})`, cleanEmail)).limit(1);
      if (existingUser) {
        throw badRequest('Un account con questa email esiste già. Accedi con la tua password.');
      }

      // 2. Find or create client record
      let [client] = await tx.select().from(clients).where(eq(sql`lower(${clients.contactEmail})`, cleanEmail)).limit(1);
      if (!client) {
        const [newClient] = await tx.insert(clients).values({
          name: cleanName,
          contactName: cleanName,
          contactEmail: cleanEmail
        }).returning();
        client = newClient!;
      }

      // 3. Create user with role 'client'
      const [created] = await tx.insert(users).values({
        email: cleanEmail,
        name: cleanName,
        passwordHash,
        role: 'client',
        clientId: client.id,
        isActive: true
      }).returning();

      // 4. Se esiste un lead corrispondente con questa email, collegalo al clientId
      await tx.update(leads).set({ clientId: client.id }).where(eq(sql`lower(${leads.email})`, cleanEmail));

      return created!;
    });

    // 5. Invia email di benvenuto
    if (this.ctx.mailer) {
      try {
        const mail = renderWelcomeMail({
          name: user.name,
          portalUrl: appUrl(this.ctx.env, 'portale')
        });
        void this.ctx.mailer.send({
          to: [user.email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text
        });
      } catch (err) {
        console.error('Errore invio mail benvenuto:', err);
      }
    }

    return this.issue(user, userAgent);
  }

  async acceptInvite(token: string, name: string, password: string, userAgent?: string): Promise<IssuedTokens> {
    const { db } = this.ctx;
    const passwordHash = await hashPassword(password);
    const user = await db.transaction(async (tx) => {
      const [invite] = await tx.select().from(invites)
        .where(and(eq(invites.tokenHash, sha256(token)), isNull(invites.acceptedAt), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
        .limit(1);
      if (!invite) throw badRequest('Invito non valido o scaduto');
      const [existing] = await tx.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, invite.email.toLowerCase())).limit(1);
      if (existing) throw badRequest('Esiste già un account con questa email');
      const [created] = await tx.insert(users).values({
        email: invite.email, name, passwordHash, role: invite.role, clientId: invite.clientId
      }).returning();
      await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));
      return created!;
    });
    return this.issue(user, userAgent);
  }

  async changePassword(userId: string, current: string, next: string, keepSessionId?: string): Promise<void> {
    const { db } = this.ctx;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !(await verifyPassword(current, user.passwordHash))) throw badRequest('Password attuale errata');
    await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
    // Invalida tutte le altre sessioni
    const others = [eq(sessions.userId, userId), isNull(sessions.revokedAt)];
    if (keepSessionId) others.push(ne(sessions.id, keepSessionId));
    await db.update(sessions).set({ revokedAt: new Date() }).where(and(...others));
  }

  async requestPasswordReset(email: string): Promise<{ token: string; user: { id: string; email: string; name: string } } | null> {
    const { db } = this.ctx;
    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
      .from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase().trim())).limit(1);
    if (!user || !user.isActive) return null;
    const token = randomToken(32);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 3_600_000); // 1 ora
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt
    });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async verifyResetToken(token: string): Promise<{ user: { id: string; email: string; name: string } }> {
    const { db } = this.ctx;
    const tokenHash = sha256(token);
    const [reset] = await db.select({
      id: passwordResets.id,
      userId: passwordResets.userId,
      expiresAt: passwordResets.expiresAt,
      usedAt: passwordResets.usedAt
    }).from(passwordResets).where(eq(passwordResets.tokenHash, tokenHash)).limit(1);
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw badRequest('Link di recupero password non valido o scaduto');
    }
    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
      .from(users).where(eq(users.id, reset.userId)).limit(1);
    if (!user || !user.isActive) throw badRequest('Utente non trovato o disattivato');
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    const { db } = this.ctx;
    const tokenHash = sha256(token);
    const [reset] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, tokenHash)).limit(1);
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw badRequest('Link di recupero password non valido o scaduto');
    }
    const passwordHash = await hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash, failedLogins: 0, lockedUntil: null }).where(eq(users.id, reset.userId));
      await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
      await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt)));
    });
  }

  async adminSetPassword(userId: string, newPassword: string): Promise<void> {
    const { db } = this.ctx;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw notFound('Utente');
    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, failedLogins: 0, lockedUntil: null }).where(eq(users.id, userId));
    await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async adminGenerateResetLink(userId: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    const { db } = this.ctx;
    const [user] = await db.select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw notFound('Utente');
    const token = randomToken(32);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 24 * 3_600_000); // 24 ore
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt
    });
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }
}
