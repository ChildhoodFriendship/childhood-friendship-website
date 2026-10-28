import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

          <!-- Avatar rotondo con iniziali e menu a tendina -->
          <div class="user-menu-wrapper">
            <button
              type="button"
              class="avatar-btn"
              (click)="toggleMenu()"
              [attr.aria-expanded]="menuOpen()"
              [attr.aria-label]="i18n.isEn() ? 'User account menu' : 'Menu account utente'"
              [title]="auth.user()?.name || (i18n.isEn() ? 'User account' : 'Account utente')">
              <span class="avatar-initials">{{ userInitials() }}</span>
            </button>

            @if (menuOpen()) {
              <div class="menu-backdrop" (click)="closeMenu()"></div>

              <div class="user-dropdown-card" role="menu">
                <div class="user-dropdown-header">
                  <div class="user-avatar-sm" aria-hidden="true">{{ userInitials() }}</div>
                  <div class="user-info">
                    <strong class="user-name">{{ auth.user()?.name || (i18n.isEn() ? 'Client' : 'Cliente') }}</strong>
                    <span class="user-email">{{ auth.user()?.email }}</span>
                  </div>
                </div>

                <div class="dropdown-divider"></div>

                <a
                  routerLink="/portale/account"
                  class="dropdown-item"
                  role="menuitem"
                  (click)="closeMenu()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>{{ i18n.isEn() ? 'Reset password' : 'Reset password' }}</span>
                </a>

                <div class="dropdown-divider"></div>

                <button
                  type="button"
                  class="dropdown-item dropdown-logout"
                  role="menuitem"
                  (click)="logout()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{{ i18n.isEn() ? 'Sign out' : 'Esci' }}</span>
                </button>
              </div>
            }
          </div>
        </nav>
      </header>
      <main id="main"><router-outlet /></main>
      <footer class="foot muted small no-print">
        {{ i18n.isEn() ? 'Childhood Friendship — Bespoke Code, Solid Foundations' : 'Childhood Friendship — Codice su misura, radici solide' }}
      </footer>
    </div>
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      border-bottom: 1px solid var(--cf-color-border);
      position: sticky;
      top: 0;
      background: rgba(10, 10, 10, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 80;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--cf-color-text) !important;
      font-weight: 700;
      text-decoration: none !important;
    }
    .brand-mark { width: 32px; height: 32px; flex: none; }
    .row { display: flex; align-items: center; gap: 12px; }
    .lang-switch-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
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

    /* Avatar & Dropdown */
    .user-menu-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .avatar-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
      border: 1.5px solid rgba(167, 139, 250, 0.45);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.28);
    }
    .avatar-btn:hover {
      transform: translateY(-1px) scale(1.05);
      border-color: rgba(167, 139, 250, 0.8);
      box-shadow: 0 0 14px rgba(124, 58, 237, 0.55);
    }
    .avatar-initials {
      line-height: 1;
      user-select: none;
    }

    .menu-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      background: transparent;
    }

    .user-dropdown-card {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 95;
      min-width: 240px;
      max-width: calc(100vw - 32px);
      background: rgba(15, 12, 24, 0.97);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 8px;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .user-dropdown-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
    }
    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      color: #fff;
      flex: none;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .user-name {
      font-size: 0.84rem;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-email {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.55);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 6px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: #E2E8F0;
      font-size: 0.82rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      font-family: inherit;
      text-align: left;
    }
    .dropdown-item:hover {
      background: rgba(167, 139, 250, 0.14);
      color: #FFFFFF;
    }
    .dropdown-logout {
      color: #F87171;
    }
    .dropdown-logout:hover {
      background: rgba(239, 68, 68, 0.14);
      color: #EF4444;
    }

    .foot { text-align: center; padding: 32px 16px; }

    @media (max-width: 600px) {
      .bar { padding: 12px 16px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly menuOpen = signal(false);

  protected readonly userInitials = computed(() => {
    const user = this.auth.user();
    const name = user?.name?.trim() || user?.email?.split('@')[0]?.trim() || '';
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}