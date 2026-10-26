import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { SessionUser } from '@cf/shared/types';
import { environment } from '../../environments/environment';
import { Api } from './api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<SessionUser | null>(null);
  private loaded: Promise<SessionUser | null> | null = null;
  private refreshing: Promise<boolean> | null = null;

  readonly user = this._user.asReadonly();
  readonly isTeam = computed(() => this._user()?.role === 'admin' || this._user()?.role === 'staff');
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  /** Carica la sessione una sola volta (usato dalle guard). */
  ensureLoaded(): Promise<SessionUser | null> {
    this.loaded ??= this.api.get<{ user: SessionUser }>('/auth/me')
      .then((r) => { this._user.set(r.user); return r.user; })
      .catch(async () => {
        // Access token scaduto ma refresh valido: rinnova in silenzio
        if (await this.refresh()) return this._user();
        this._user.set(null);
        return null;
      });
    return this.loaded;
  }

    async register(name: string, email: string, password: string): Promise<SessionUser> {
    await this.api.get('/auth/csrf');
    const { user } = await this.api.post<{ user: SessionUser }>('/auth/register', { name, email, password });
    this.setUser(user);
    return user;
  }

  async login(email: string, password: string): Promise<SessionUser> {
    await this.api.get('/auth/csrf');
    const { user } = await this.api.post<{ user: SessionUser }>('/auth/login', { email, password });
    this.setUser(user);
    return user;
  }

  async acceptInvite(token: string, name: string, password: string): Promise<SessionUser> {
    await this.api.get('/auth/csrf');
    const { user } = await this.api.post<{ user: SessionUser }>('/auth/invite/accept', { token, name, password });
    this.setUser(user);
    return user;
  }

  /** Rinnovo silenzioso: una sola richiesta anche con più 401 in parallelo. */
  refresh(): Promise<boolean> {
    this.refreshing ??= firstValueFrom(this.http.post<{ user: SessionUser }>(`${environment.apiBaseUrl}/auth/refresh`, {}))
      .then((r) => { this.setUser(r.user); return true; })
      .catch(() => false)
      .finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async logout(): Promise<void> {
    try { await this.api.post('/auth/logout'); } catch { /* sessione già chiusa */ }
    this.clear();
    await this.router.navigateByUrl('/login');
  }

  /** Sessione persa: torna al login conservando la pagina di provenienza. */
  sessionExpired(): void {
    if (!this._user()) return;
    this.clear();
    void this.router.navigate(['/login'], { queryParams: { next: this.router.url, scaduta: 1 } });
  }

  homeFor(user: SessionUser | null): string {
    if (!user) return '/login';
    return user.role === 'client' ? '/portale' : '/admin';
  }

  private setUser(user: SessionUser): void {
    this._user.set(user);
    this.loaded = Promise.resolve(user);
  }

  private clear(): void {
    this._user.set(null);
    this.loaded = Promise.resolve(null);
  }
}
