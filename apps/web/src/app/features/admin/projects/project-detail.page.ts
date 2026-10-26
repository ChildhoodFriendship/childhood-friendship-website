import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BadgeComponent } from '../../../shared/badge.component';
import { percent, projectStatus } from '../../../shared/labels';
import { AuthService } from '../../../core/auth.service';
import { ProjectStore } from './project.store';

@Component({
  selector: 'cf-project-detail-page',
  imports: [DatePipe, RouterLink, RouterLinkActive, RouterOutlet, BadgeComponent],
  providers: [ProjectStore],
  template: `
    <div class="page">
      @if (store.error(); as err) {
        <div class="alert alert-error">{{ err }} · <a routerLink="/admin/progetti">Torna ai progetti</a></div>
      } @else if (store.project(); as p) {
        <header class="stack-sm no-print">
          <a routerLink="/admin/progetti" class="small">← Progetti</a>
          <div class="page-header">
            <div>
              <span class="eyebrow">{{ p.clientName }}</span>
              <h1>{{ p.name }}</h1>
              <div class="row" style="margin-top: 8px">
                @let st = status();
                @if (st) { <cf-badge [label]="st.label" [tone]="st.tone" /> }
                @if (p.archivedAt) { <cf-badge label="Archiviato" tone="red" /> }
                @if (p.deadline) { <span class="muted small">Consegna {{ p.deadline | date: 'd MMM y' }}</span> }
                @if (p.targetUrl) { <a class="small" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">{{ p.targetUrl }} ↗</a> }
              </div>
            </div>
            <div class="progress-box">
              <div class="row-between small"><span class="muted">Avanzamento</span><strong class="mono">{{ pct() }}%</strong></div>
              <div class="progress"><span [style.width.%]="pct()"></span></div>
            </div>
          </div>
          <nav class="tabs" aria-label="Sezioni progetto">
            <a [routerLink]="['./']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Panoramica</a>
            <a routerLink="checklist" routerLinkActive="active">Checklist</a>
            @if (p.marketingEnabled) { <a routerLink="marketing" routerLinkActive="active">Marketing</a> }
            <a routerLink="messaggi" routerLinkActive="active">Messaggi</a>
            <a routerLink="materiali" routerLinkActive="active">Materiali</a>
            <a routerLink="accessi" routerLinkActive="active">Accessi</a>
          </nav>
        </header>
        <router-outlet />
      } @else {
        <div class="skeleton" style="height: 120px"></div>
      }
    </div>
  `,
  styles: `.progress-box { min-width: 220px; display: flex; flex-direction: column; gap: 6px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage {
  readonly projectId = input.required<string>();
  protected readonly store = inject(ProjectStore);
  protected readonly auth = inject(AuthService);
  protected readonly status = computed(() => { const p = this.store.project(); return p ? projectStatus(p.status) : null; });
  protected readonly pct = computed(() => { const p = this.store.project()?.progress; return p ? percent(p.tasksDone, p.tasksTotal) : 0; });

  constructor() {
    effect(() => { void this.store.load(this.projectId()); });
  }
}
