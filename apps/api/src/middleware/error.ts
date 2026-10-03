import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Endpoint non trovato' } });
};

export function errorHandler(isProd: boolean): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
      return;
    }
    const e = err as { type?: string; status?: number };
    if (e?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'bad_json', message: 'JSON non valido' } });
      return;
    }
    if (e?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'too_large', message: 'Richiesta troppo grande' } });
      return;
    }
    const pgCode = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
    if (pgCode === '23505') {
      res.status(409).json({ error: { code: 'conflict', message: 'Elemento già esistente' } });
      return;
    }
    if (pgCode === '23503') {
      res.status(409).json({ error: { code: 'conflict', message: 'Elemento collegato ad altri dati' } });
      return;
    }
    console.error(`[api] ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ error: { code: 'internal', message: isProd ? 'Errore interno' : String((err as Error)?.message ?? err) } });
  };
}
