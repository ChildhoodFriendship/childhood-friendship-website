import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { acceptInviteSchema, changePasswordSchema, loginSchema } from '@cf/shared/schemas';
import type { AppContext } from '../../context.js';
import { audit } from '../../lib/audit.js';
import { parse } from '../../lib/validate.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, requireAuth } from '../../middleware/auth.js';
import { AuthService, type IssuedTokens } from './auth.service.js';
import { z } from 'zod';

export function authRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new AuthService(ctx);
  const secure = ctx.env.NODE_ENV === 'production';

  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.env.NODE_ENV === 'test' ? 1000 : 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Troppi tentativi. Riprova tra qualche minuto.' } }
  });

  // Il refresh avviene in automatico ogni ~15 minuti per scheda: limite più ampio del login
  const refreshLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: ctx.env.NODE_ENV === 'test' ? 1000 : 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'rate_limited', message: 'Troppe richieste di sessione.' } }
  });

  const setCookies = (res: Response, t: IssuedTokens) => {
    res.cookie(ACCESS_COOKIE, t.accessToken, { httpOnly: true, secure, sameSite: 'lax', path: '/api', maxAge: t.accessMaxAgeMs });
    res.cookie(REFRESH_COOKIE, t.refreshToken, { httpOnly: true, secure, sameSite: 'strict', path: '/api/auth', maxAge: t.refreshMaxAgeMs });
  };
  const clearCookies = (res: Response) => {
    res.clearCookie(ACCESS_COOKIE, { path: '/api' });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  };

  /** Endpoint "vuoto": garantisce che il cookie XSRF-TOKEN sia impostato. */
  router.get('/csrf', (_req, res) => { res.status(204).end(); });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const tokens = await service.login(email, password, req.get('user-agent'));
    setCookies(res, tokens);
    req.user = tokens.user;
    await audit(ctx.db, req, { action: 'auth.login', entity: 'user', entityId: tokens.user.id });
    res.json({ user: tokens.user });
  });

  router.post('/refresh', refreshLimiter, async (req, res) => {
    const token: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string' || !token) {
      clearCookies(res);
      res.status(401).json({ error: { code: 'unauthorized', message: 'Sessione assente' } });
      return;
    }
    try {
      const tokens = await service.refresh(token, req.get('user-agent'));
      setCookies(res, tokens);
      res.json({ user: tokens.user });
    } catch (err) {
      clearCookies(res);
      throw err;
    }
  });

  router.post('/logout', async (req, res) => {
    const token: unknown = req.cookies?.[REFRESH_COOKIE];
    await service.logout(typeof token === 'string' ? token : undefined, req.sessionId);
    if (req.user) await audit(ctx.db, req, { action: 'auth.logout', entity: 'user', entityId: req.user.id });
    clearCookies(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => { res.json({ user: req.user }); });

  router.get('/invite/:token', loginLimiter, async (req, res) => {
    const token = parse(z.string().min(20).max(200), req.params['token']);
    const info = await service.inviteInfo(token);
    res.json({ email: info.email, role: info.role, expiresAt: info.expiresAt.toISOString() });
  });

  router.post('/invite/accept', loginLimiter, async (req, res) => {
    const input = parse(acceptInviteSchema, req.body);
    const tokens = await service.acceptInvite(input.token, input.name, input.password, req.get('user-agent'));
    setCookies(res, tokens);
    req.user = tokens.user;
    await audit(ctx.db, req, { action: 'auth.invite_accepted', entity: 'user', entityId: tokens.user.id });
    res.status(201).json({ user: tokens.user });
  });

  router.post('/password', requireAuth, async (req, res) => {
    const input = parse(changePasswordSchema, req.body);
    await service.changePassword(req.user!.id, input.currentPassword, input.newPassword, req.sessionId);
    await audit(ctx.db, req, { action: 'auth.password_changed', entity: 'user', entityId: req.user!.id });
    res.status(204).end();
  });

  return router;
}
