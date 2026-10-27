import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PortalI18nService } from '../../core/portal-i18n.service';

@Component({
  selector: 'cf-portal-shell',
  imports: [LogoComponent, RouterOutlet, RouterLink],
  template: `
    <div class="app-root">
      <header class="bar no-print">
        <a class="brand" routerLink="/portale">
          <cf-logo class="brand-mark" />
          <span>{{ i18n.isEn() ? 'Client Portal' : 'Area clienti' }}</span>
        </a>
        <nav class="row">
          <button
            type="button"
            class="lang-switch-btn font-mono"
            (click)="i18n.toggle()"
            [title]="i18n.isEn() ? 'Switch to Italian (EUR €)' : 'Switch to English (USD $)'">
            {{ i18n.isEn() ? '🇺🇸 USD ($)' : '🇮🇹 EUR (€)' }}
          </button>
          <a routerLink="/portale/account" class="small">{{ auth.user()?.name }}</a>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">
            {{ i18n.isEn() ? 'Sign out' : 'Esci' }}
          </button>
        </nav>
      </header>
      <main id="main"><router-outlet /></main>
      <footer class="foot muted small no-print">
        {{ i18n.isEn() ? 'Childhood Friendship — Bespoke Code, Solid Foundations' : 'Childhood Friendship — Codice su misura, radici solide' }}
      </footer>
    </div>
  `,
  styles: `
    .bar { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--cf-color-border); position: sticky; top: 0; background: rgba(10,10,10,.9); backdrop-filter: blur(6px); z-index: 10; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--cf-color-text) !important; font-weight: 700; text-decoration: none !important; }
    .brand-mark { width: 32px; height: 32px; flex: none; }
    .row { display: flex; align-items: center; gap: 12px; }
    .lang-switch-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .lang-switch-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-1px);
    }
    .foot { text-align: center; padding: 32px 16px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(PortalI18nService);
}
