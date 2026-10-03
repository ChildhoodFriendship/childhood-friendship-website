import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiErrorBody } from '@cf/shared/types';
import { environment } from '../../environments/environment';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Errore applicativo con messaggio già in italiano, pronto da mostrare. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorBody> | null;
    if (body?.error?.message) return new ApiError(err.status, body.error.code ?? 'error', body.error.message, body.error.details);
    if (err.status === 0) return new ApiError(0, 'network', 'Connessione assente o server non raggiungibile');
    return new ApiError(err.status, 'http', `Errore ${err.status}`);
  }
  return new ApiError(500, 'unknown', 'Errore imprevisto');
}

/** Client HTTP minimale basato su Promise: i componenti gestiscono lo stato con Signals. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private params(query?: QueryParams): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return p;
  }

  private async run<T>(obs: Promise<T>): Promise<T> {
    try { return await obs; } catch (err) { throw toApiError(err); }
  }

  get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.run(firstValueFrom(this.http.get<T>(`${this.base}${path}`, { params: this.params(query) })));
  }
  post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.run(firstValueFrom(this.http.post<T>(`${this.base}${path}`, body)));
  }
  patch<T>(path: string, body: unknown): Promise<T> {
    return this.run(firstValueFrom(this.http.patch<T>(`${this.base}${path}`, body)));
  }
  delete(path: string): Promise<void> {
    return this.run(firstValueFrom(this.http.delete<void>(`${this.base}${path}`)));
  }
}
