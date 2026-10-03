import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'cf-portal-shell',
  imports: [LogoComponent, RouterOutlet, RouterLink],
  template: `
    <div class="app-root">
      <header class="bar no-print">
        <a class="brand" routerLink="/portale"><cf-logo class="brand-mark" /><span>Area clienti</span></a>
        <nav class="row">
          <a routerLink="/portale/account" class="small">{{ auth.user()?.name }}</a>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Esci</button>
        </nav>
      </header>
      <main id="main"><router-outlet /></main>
      <footer class="foot muted small no-print">Childhood Friendship — Codice su misura, radici solide</footer>
    </div>
  `,
  styles: `
    .bar { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--cf-color-border); position: sticky; top: 0; background: rgba(10,10,10,.9); backdrop-filter: blur(6px); z-index: 10; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--cf-color-text) !important; font-weight: 700; text-decoration: none !important; }
    .brand-mark { width: 32px; height: 32px; flex: none; }
    .foot { text-align: center; padding: 32px 16px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalShellComponent {
  protected readonly auth = inject(AuthService);
}
