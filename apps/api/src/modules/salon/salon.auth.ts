import crypto from 'node:crypto';
import type { Request } from 'express';

/** Ruoli dell'app salone. `owner` = titolare (accesso completo), `staff` = dipendente, `client` = cliente finale. */
export type SalonRole = 'owner' | 'staff' | 'client';

export interface SalonUser {
  role: SalonRole;
  employeeId?: string | null;
  clientId?: string | null;
  exp: number;
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Token firmati HMAC-SHA256 (formato `payload.firma`, base64url), senza stato lato server.
 * La chiave è derivata da JWT_SECRET con un contesto dedicato, così non è riusabile per l'auth della piattaforma.
 */
export function salonTokens(secret: string) {
  const key = crypto.createHmac('sha256', secret).update('salon-token-v1').digest();
  const sig = (body: string) => crypto.createHmac('sha256', key).update(body).digest('base64url');

  function sign(user: Omit<SalonUser, 'exp'>): string {
    const body = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
    return `${body}.${sig(body)}`;
  }

  function verify(token: string | undefined | null): SalonUser | null {
    if (!token) return null;
    const [body, mac] = token.split('.');
    if (!body || !mac) return null;
    const expected = Buffer.from(sig(body));
    const given = Buffer.from(mac);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    try {
      const user = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SalonUser;
      if (typeof user.exp !== 'number' || user.exp < Date.now()) return null;
      if (!['owner', 'staff', 'client'].includes(user.role)) return null;
      return user;
    } catch {
      return null;
    }
  }

  function fromRequest(req: Request): SalonUser | null {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return null;
    return verify(h.slice(7).trim());
  }

  return { sign, verify, fromRequest };
}

export const isTeam = (u: SalonUser | null): boolean => !!u && (u.role === 'owner' || u.role === 'staff');

export function verifyPassword(plain: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  const [salt, derived] = hash.split(':');
  if (!salt || !derived) return false;
  const expected = Buffer.from(derived, 'hex');
  const actual = crypto.scryptSync(plain, salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(plain, salt, 64).toString('hex')}`;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
