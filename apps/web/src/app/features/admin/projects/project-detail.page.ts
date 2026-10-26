import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BadgeComponent } from '../../../shared/badge.component';
import { projectStatus } from '../../../shared/labels';
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
                @if (p.archivedAt) { <cf-badge label="Archiviato" tone="red" /> }
                @if (p.deadline) { <span class="muted small">Consegna {{ p.deadline | date: 'd MMM y' }}</span> }
                @if (p.targetUrl) { <a class="small" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">{{ p.targetUrl }} ↗</a> }
              </div>
            </div>

            @let st = status();
            @if (st) {
              <div class="header-status-box">
                <cf-badge [label]="st.label" [tone]="st.tone" />
              </div>
            }
          </div>
          <nav class="tabs" aria-label="Sezioni progetto">
            <a [routerLink]="['./']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Panoramica</a>
            <a routerLink="preventivo" routerLinkActive="active">Preventivo</a>
            <a routerLink="checklist" routerLinkActive="active">Checklist</a>
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
  styles: `
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-status-box {
      display: flex;
      align-items: center;
      padding-top: 6px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage {
  readonly projectId = input.required<string>();
  protected readonly store = inject(ProjectStore);
  protected readonly auth = inject(AuthService);
  protected readonly status = computed(() => { const p = this.store.project(); return p ? projectStatus(p.status) : null; });

  constructor() {
    effect(() => { void this.store.load(this.projectId()); });
  }
}
