import { rateLimit, type IncrementResponse, type Options, type RateLimitRequestHandler, type Store } from 'express-rate-limit';
import { lt, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { rateLimits } from '../db/schema.js';

/**
 * Contatori del rate limit su Postgres: condivisi tra tutte le istanze serverless,
 * così un attaccante non aggira il limite colpendo istanze diverse.
 */
export class DbRateLimitStore implements Store {
  readonly localKeys = false;
  private windowMs = 60_000;

  constructor(private readonly db: Database, readonly prefix: string) {}

  init(options: Options): void { this.windowMs = options.windowMs; }

  async increment(key: string): Promise<IncrementResponse> {
    const k = `${this.prefix}:${key}`;
    const reset = new Date(Date.now() + this.windowMs);
    const [row] = await this.db.insert(rateLimits).values({ key: k, hits: 1, resetAt: reset })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          hits: sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.hits} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} <= now() then excluded.reset_at else ${rateLimits.resetAt} end`
        }
      })
      .returning({ hits: rateLimits.hits, resetAt: rateLimits.resetAt });
    // Pulizia occasionale dei contatori scaduti (nessun job dedicato necessario)
    if (Math.random() < 0.02) void this.db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date())).catch(() => undefined);
    return { totalHits: row?.hits ?? 1, resetTime: row?.resetAt ?? reset };
  }

  async decrement(key: string): Promise<void> {
    await this.db.update(rateLimits).set({ hits: sql`greatest(${rateLimits.hits} - 1, 0)` }).where(sql`${rateLimits.key} = ${`${this.prefix}:${key}`}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.db.delete(rateLimits).where(sql`${rateLimits.key} = ${`${this.prefix}:${key}`}`);
  }
}

/** Limiter per gli endpoint sensibili (login, sessione, form pubblici) con contatori condivisi. */
export function sharedLimiter(db: Database, name: string, windowMs: number, limit: number, message: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    store: new DbRateLimitStore(db, name),
    // Se il database non risponde non blocchiamo gli utenti: resta il limite globale in memoria
    passOnStoreError: true,
    message: { error: { code: 'rate_limited', message } }
  });
}
