import type { RequestHandler } from 'express';
import { randomToken, safeEqual } from '../lib/crypto.js';
import { HttpError } from '../lib/http-error.js';
import { CSRF_COOKIE, CSRF_HEADER } from './auth.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie compatibile con HttpClient di Angular
 * (cookie XSRF-TOKEN leggibile → header X-XSRF-TOKEN).
 */
export function csrf(secure: boolean, exempt: (path: string) => boolean): RequestHandler {
  return (req, res, next) => {
    let token: unknown = req.cookies?.[CSRF_COOKIE];
    if (typeof token !== 'string' || token.length < 20) {
      token = randomToken(24);
      res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'strict', secure, path: '/' });
      req.cookies[CSRF_COOKIE] = token;
    }
    if (SAFE.has(req.method) || exempt(req.path)) return next();
    const header = req.get(CSRF_HEADER);
    if (typeof header !== 'string' || !safeEqual(header, token as string)) {
      return next(new HttpError(403, 'csrf', 'Token CSRF mancante o non valido. Ricarica la pagina.'));
    }
    next();
  };
}
