import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import type { Paginated, PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { BadgeComponent } from '../../shared/badge.component';
import { percent, projectStatus } from '../../shared/labels';

@Component({
  selector: 'cf-portal-projects-page',
  imports: [DatePipe, RouterLink, BadgeComponent],
  template: `
    <div class="page" style="max-width: 960px">
      <header class="page-header"><div><span class="eyebrow">Benvenuto</span><h1>Ciao {{ firstName }}, ecco i tuoi progetti</h1></div></header>
      @if (loading()) { <div class="skeleton" style="height: 140px"></div> }
      <div class="grid">
        @for (p of items(); track p.id) {
          @let st = projectStatus(p.status);
          @let pct = pctOf(p);
          <a class="card stack-sm proj" [routerLink]="['progetti', p.id]">
            <div class="row-between"><h2>{{ p.name }}</h2><cf-badge [label]="st.label" [tone]="st.tone" /></div>
            @if (p.description) { <p class="muted small clamp">{{ p.description }}</p> }
            <div class="row-between small"><span class="muted">Avanzamento</span><strong class="mono">{{ pct }}%</strong></div>
            <div class="progress"><span [style.width.%]="pct"></span></div>
            @if (p.deadline) { <span class="muted small">Consegna prevista {{ p.deadline | date: 'd MMMM y' }}</span> }
          </a>
        } @empty {
          @if (!loading()) { <div class="card empty"><strong>Nessun progetto attivo</strong>Quando avvieremo un progetto insieme lo troverai qui.</div> }
        }
      </div>
    </div>
  `,
  styles: `.proj { color: inherit !important; text-decoration: none !important; transition: border-color .15s, transform .15s; }
    .proj:hover { border-color: var(--cf-color-violet-light); transform: translateY(-2px); }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalProjectsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly projectStatus = projectStatus;
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

  protected pctOf(p: PortalProjectDto): number { return p.progress ? percent(p.progress.tasksDone, p.progress.tasksTotal) : 0; }
}
