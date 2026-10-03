import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import type { Role } from '@cf/shared/catalog';
import type { AppContext } from '../context.js';
import { sessions, users } from '../db/schema.js';
import { forbidden, unauthorized } from '../lib/http-error.js';

export const ACCESS_COOKIE = 'cf_at';
export const REFRESH_COOKIE = 'cf_rt';
export const CSRF_COOKIE = 'XSRF-TOKEN';
export const CSRF_HEADER = 'x-xsrf-token';

export const jwtKey = (secret: string): Uint8Array => new TextEncoder().encode(secret);

/** Popola req.user se il token di accesso è valido, la sessione attiva e l'utente abilitato. */
export function authenticate(ctx: AppContext): RequestHandler {
  const key = jwtKey(ctx.env.JWT_SECRET);
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[ACCESS_COOKIE];
    if (typeof token !== 'string' || !token) return next();
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: 'cf-api', audience: 'cf-app' });
      const userId = payload.sub;
      const sid = payload['sid'];
      if (typeof userId !== 'string' || typeof sid !== 'string') return next();
      const [row] = await ctx.db
        .select({ id: users.id, email: users.email, name: users.name, role: users.role, clientId: users.clientId })
        .from(users)
        .innerJoin(sessions, eq(sessions.userId, users.id))
        .where(and(eq(users.id, userId), eq(users.isActive, true), eq(sessions.id, sid), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
        .limit(1);
      if (row) {
        req.user = row;
        req.sessionId = sid;
      }
    } catch {
      // token scaduto o manomesso: richiesta trattata come anonima
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** admin + staff = team interno */
export const requireTeam = requireRole('admin', 'staff');
export const requireAdmin = requireRole('admin');

export const isTeam = (req: Request): boolean => req.user?.role === 'admin' || req.user?.role === 'staff';
