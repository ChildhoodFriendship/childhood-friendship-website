import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import type { Paginated, PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { PortalI18nService } from '../../core/portal-i18n.service';

@Component({
  selector: 'cf-portal-projects-page',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="page" style="max-width: 960px">
      <header class="page-header">
        <div>
          <span class="eyebrow">{{ i18n.isEn() ? 'Welcome' : 'Benvenuto' }}</span>
          <h1>
            {{ i18n.isEn() ? 'Hello ' + firstName + ', here are your active projects' : 'Ciao ' + firstName + ', ecco i tuoi progetti' }}
          </h1>
        </div>
      </header>
      @if (loading()) { <div class="skeleton" style="height: 140px"></div> }
      <div class="grid">
        @for (p of items(); track p.id) {
          <a class="card stack-sm proj" [routerLink]="['progetti', p.id]">
            <div class="row-between">
              <h2>{{ p.name }}</h2>
              <!-- Solo due stati possibili: IN DEVELOPMENT / IN SVILUPPO o LIVE -->
              @if (p.isOnline || p.status === 'lanciato') {
                <span class="tag-badge tag-live">
                  <span class="dot pulse-green"></span> LIVE
                </span>
              } @else {
                <span class="tag-badge tag-dev">
                  <span class="dot pulse-violet"></span> {{ i18n.isEn() ? 'IN DEVELOPMENT' : 'IN SVILUPPO' }}
                </span>
              }
            </div>
            @if (p.description) { <p class="muted small clamp">{{ p.description }}</p> }
            @if (p.deadline) {
              <span class="muted small">
                🗓️ {{ i18n.isEn() ? 'Estimated delivery' : 'Consegna prevista' }} {{ p.deadline | date: (i18n.isEn() ? 'MMMM d, y' : 'd MMMM y') }}
              </span>
            }
          </a>
        } @empty {
          @if (!loading()) {
            <div class="card empty">
              <strong>{{ i18n.isEn() ? 'No active projects yet' : 'Nessun progetto attivo' }}</strong>
              {{ i18n.isEn() ? 'Once we start a project together, all your assets, contracts, and updates will appear here.' : 'Quando avvieremo un progetto insieme lo troverai qui.' }}
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .proj {
      color: inherit !important;
      text-decoration: none !important;
      transition: border-color .15s, transform .15s;
    }
    .proj:hover {
      border-color: var(--cf-color-violet-light);
      transform: translateY(-2px);
    }
    .clamp {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-family: 'DM Mono', monospace;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .tag-dev {
      background: rgba(124, 58, 237, 0.18);
      color: #DDD6FE;
      border: 1px solid rgba(167, 139, 250, 0.5);
    }
    .tag-live {
      background: rgba(16, 185, 129, 0.16);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.45);
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }
    .pulse-violet {
      background: #C4B5FD;
      box-shadow: 0 0 6px #8B5CF6;
    }
    .pulse-green {
      background: #34D399;
      box-shadow: 0 0 6px #10B981;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalProjectsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly items = signal<PortalProjectDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly firstName = inject(AuthService).user()?.name.split(' ')[0] ?? '';

  async ngOnInit(): Promise<void> {
    try {
      const r = await this.api.get<Paginated<PortalProjectDto>>('/projects', { pageSize: 50 });
      this.items.set(r.items);
      if (r.items.length === 1) await this.router.navigate(['/portale/progetti', r.items[0]!.id], { replaceUrl: true });
    } catch (err) { this.toast.error(err); } finally { this.loading.set(false); }
  }
}
