import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PROJECT_STATUSES } from '@cf/shared/catalog';
import type { DashboardDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BadgeComponent } from '../../shared/badge.component';
import { documentStatus, projectStatus } from '../../shared/labels';

@Component({
  selector: 'cf-dashboard-page',
  imports: [DatePipe, RouterLink, BadgeComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div><span class="eyebrow">Panoramica</span><h1>Buongiorno, {{ firstName() }}</h1><p>{{ today | date: 'EEEE d MMMM y' }}</p></div>
        <a class="btn btn-primary" routerLink="/admin/progetti" [queryParams]="{ nuovo: 1 }">+ Nuovo progetto</a>
      </header>

      @if (error()) { <div class="alert alert-error">{{ error() }} <button class="btn btn-sm" (click)="load()">Riprova</button></div> }

      @if (data(); as d) {
        <section class="grid" aria-label="Indicatori">
          <a class="card stat kpi" routerLink="/admin/progetti"><span class="muted">Progetti attivi</span><strong>{{ activeProjects() }}</strong></a>
          <a class="card stat kpi" routerLink="/admin/lead"><span class="muted">Nuovi lead</span><strong>{{ d.newLeads }}</strong></a>
          <div class="card stat"><span class="muted">Documenti in attesa</span><strong>{{ d.documentsInReview.length }}</strong></div>
          <div class="card stat"><span class="muted">Task in ritardo</span><strong [class.danger]="d.overdueTasks.length">{{ d.overdueTasks.length }}</strong></div>
        </section>

        <section class="card">
          <h2>Pipeline</h2>
          <div class="pipeline">
            @for (s of statuses; track s) {
              @let st = projectStatus(s);
              <a class="pipe" [routerLink]="['/admin/progetti']" [queryParams]="{ stato: s }">
                <cf-badge [label]="st.label" [tone]="st.tone" /><strong>{{ d.projectsByStatus[s] }}</strong>
              </a>
            }
          </div>
        </section>

        <div class="grid-2">
          <section class="card">
            <h2>Scadenze nei prossimi 30 giorni</h2>
            @for (p of d.upcomingDeadlines; track p.projectId) {
              <a class="line" [routerLink]="['/admin/progetti', p.projectId]"><span class="grow truncate">{{ p.projectName }}</span><span class="mono small">{{ p.deadline | date: 'd MMM' }}</span></a>
            } @empty { <p class="muted">Nessuna consegna imminente.</p> }
          </section>
          <section class="card">
            <h2>Task in ritardo</h2>
            @for (t of d.overdueTasks; track t.taskId) {
              <a class="line" [routerLink]="['/admin/progetti', t.projectId, 'checklist']"><span class="grow truncate">{{ t.title }} <span class="muted">· {{ t.projectName }}</span></span><span class="mono small danger">{{ t.dueDate | date: 'd MMM' }}</span></a>
            } @empty { <p class="muted">Tutto in orario.</p> }
          </section>
          <section class="card">
            <h2>Documenti in revisione</h2>
            @for (doc of d.documentsInReview; track doc.documentId) {
              @let ds = documentStatus(doc.status);
              <a class="line" [routerLink]="['/admin/progetti', doc.projectId, 'documenti', doc.documentId]"><span class="grow truncate">{{ doc.title }} <span class="muted">· {{ doc.projectName }}</span></span><cf-badge [label]="ds.label" [tone]="ds.tone" /></a>
            } @empty { <p class="muted">Nessun documento in attesa del cliente.</p> }
          </section>
        </div>

      } @else if (!error()) {
        <div class="grid">@for (i of [1, 2, 3, 4]; track i) { <div class="card skeleton" style="height: 96px"></div> }</div>
      }
    </div>
  `,
  styles: `
    .kpi { color: inherit !important; text-decoration: none !important; transition: border-color .15s; }
    .kpi:hover { border-color: var(--cf-color-violet-light); }
    .danger { color: var(--cf-color-danger); }
    .gap { margin-left: 8px; }
    .pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .pipe { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; background: var(--cf-surface-2); color: inherit !important; text-decoration: none !important; }
    .pipe strong { font-size: 1.25rem; }
    .line { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--cf-color-border); color: inherit !important; text-decoration: none !important; }
    .line:last-child { border-bottom: 0; }
    a.line:hover .grow { color: var(--cf-color-violet-light); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = PROJECT_STATUSES;
  protected readonly projectStatus = projectStatus;
  protected readonly documentStatus = documentStatus;
  protected readonly today = new Date();
  protected readonly data = signal<DashboardDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  protected readonly activeProjects = computed(() => {
    const d = this.data();
    return d ? Object.entries(d.projectsByStatus).filter(([s]) => s !== 'in_pausa').reduce((a, [, n]) => a + n, 0) : 0;
  });

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    this.error.set(null);
    try { this.data.set(await this.api.get<DashboardDto>('/dashboard')); }
    catch (err) { this.error.set((err as Error).message); }
  }
}
