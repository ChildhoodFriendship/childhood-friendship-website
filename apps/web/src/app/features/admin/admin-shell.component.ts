import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS } from '../../shared/labels';

interface NavItem { path: string; label: string; icon: string; exact?: boolean; adminOnly?: boolean; }

const NAV: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: '◧', exact: true },
  { path: '/admin/progetti', label: 'Progetti', icon: '▦' },
  { path: '/admin/clienti', label: 'Clienti', icon: '◎' },
  { path: '/admin/lead', label: 'Lead', icon: '✦' },
  { path: '/admin/utenti', label: 'Utenti e inviti', icon: '◍', adminOnly: true },
  { path: '/admin/log', label: 'Registro attività', icon: '☰', adminOnly: true }
];

@Component({
  selector: 'cf-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-root shell" [class.nav-open]="navOpen()">
      <a class="skip-link" href="#main">Vai al contenuto</a>
      <aside class="sidebar no-print" aria-label="Navigazione area admin">
        <a class="brand" routerLink="/admin"><span class="brand-mark" aria-hidden="true">CF</span><span>Studio<br /><small class="muted">Childhood Friendship</small></span></a>
        <nav>
          @for (item of nav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="navOpen.set(false)">
              <span class="icon" aria-hidden="true">{{ item.icon }}</span>{{ item.label }}
            </a>
          }
        </nav>
        @let u = auth.user();
        <div class="me">
          <a routerLink="/admin/account" class="me-link" (click)="navOpen.set(false)">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="truncate"><strong>{{ u?.name }}</strong><br /><small class="muted">{{ u ? roles[u.role] : '' }}</small></span>
          </a>
          <button type="button" class="btn btn-ghost btn-sm" (click)="auth.logout()">Esci</button>
        </div>
      </aside>
      <div class="topbar no-print">
        <button type="button" class="btn btn-ghost icon-btn" (click)="navOpen.set(!navOpen())" [attr.aria-expanded]="navOpen()" aria-label="Menu">☰</button>
        <strong>Studio CF</strong>
      </div>
      <div class="scrim" (click)="navOpen.set(false)" aria-hidden="true"></div>
      <main id="main" class="content" tabindex="-1"><router-outlet /></main>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
    .sidebar { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 24px; padding: 20px 14px; border-right: 1px solid var(--cf-color-border); background: #0d0d0f; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--cf-color-text) !important; text-decoration: none !important; font-weight: 700; line-height: 1.2; padding: 0 6px; }
    .brand-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; background: var(--cf-color-violet); color: #fff; font-family: var(--cf-mono); font-size: 13px; flex: none; }
    nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    nav a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; color: var(--cf-color-text-muted); font-weight: 600; text-decoration: none !important; }
    nav a:hover { background: var(--cf-color-surface); color: var(--cf-color-text); }
    nav a.active { background: var(--cf-violet-soft); color: var(--cf-color-text); }
    .icon { width: 18px; text-align: center; color: var(--cf-color-violet-light); }
    .me { display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--cf-color-border); padding-top: 14px; }
    .me-link { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; color: var(--cf-color-text) !important; text-decoration: none !important; }
    .avatar { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--cf-color-surface-raised); font-size: 12px; font-weight: 700; flex: none; }
    .content { min-width: 0; outline: none; }
    .topbar, .scrim { display: none; }
    .skip-link { position: absolute; left: -999px; }
    .skip-link:focus { left: 12px; top: 12px; z-index: 100; background: var(--cf-color-violet); color: #fff; padding: 8px 12px; border-radius: 6px; }
    @media (max-width: 960px) {
      .shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
      .topbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--cf-color-border); position: sticky; top: 0; background: var(--cf-color-black); z-index: 20; }
      .sidebar { position: fixed; inset: 0 auto 0 0; width: 260px; z-index: 40; transform: translateX(-100%); transition: transform .2s; }
      .nav-open .sidebar { transform: none; }
      .nav-open .scrim { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 30; }
    }
    @media print { .shell { display: block; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLE_LABELS;
  protected readonly navOpen = signal(false);
  protected readonly nav = computed(() => NAV.filter((n) => !n.adminOnly || this.auth.isAdmin()));
  protected readonly initials = computed(() => (this.auth.user()?.name ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase());

  constructor() {
    // chiude il menu mobile a ogni navigazione
    toSignal(inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.navOpen.set(false))));
  }
}
