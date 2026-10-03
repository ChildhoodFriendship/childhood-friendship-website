import type { z } from 'zod';
import { badRequest } from './http-error.js';

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    throw badRequest(details[0]?.message ?? 'Dati non validi', details);
  }
  return result.data;
}

/** Rimuove le chiavi `undefined` (PATCH: non sovrascrivere campi non inviati). */
export function defined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Stringhe vuote → null per i campi opzionali (URL, email...). */
export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])) as T;
}
