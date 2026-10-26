import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BadgeComponent } from '../../../shared/badge.component';
import { projectStatus } from '../../../shared/labels';
import { AuthService } from '../../../core/auth.service';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { Router } from '@angular/router';
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
                @if (p.archivedAt) {
                  <cf-badge label="Archiviato" tone="red" />
                  <button type="button" class="btn-restore-link" (click)="restore(p)">Ripristina</button>
                }
                @if (p.deadline) { <span class="muted small">Consegna {{ p.deadline | date: 'd MMM y' }}</span> }
                @if (p.targetUrl) { <a class="small" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">{{ p.targetUrl }} ↗</a> }
              </div>
            </div>

            <div class="header-status-box">
              @let st = status();
              @if (st) {
                <cf-badge [label]="st.label" [tone]="st.tone" />
              }
              <button
                type="button"
                class="btn-trash-header"
                (click)="onTrashClick(p)"
                [title]="p.archivedAt ? 'Gestisci archiviazione o eliminazione' : 'Archivia o elimina progetto'"
                aria-label="Cestino progetto">
                🗑️
              </button>
            </div>
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
      gap: 10px;
      padding-top: 6px;
    }
    .btn-trash-header {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.15s ease;
      color: rgba(248, 250, 252, 0.7);
    }
    .btn-trash-header:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #EF4444;
      transform: scale(1.05);
    }
    .btn-restore-link {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: #6EE7B7;
      font-size: 0.72rem;
      padding: 1px 6px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .btn-restore-link:hover {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPage {
  readonly projectId = input.required<string>();
  protected readonly store = inject(ProjectStore);
  protected readonly auth = inject(AuthService);
  protected readonly status = computed(() => { const p = this.store.project(); return p ? projectStatus(p.status) : null; });
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  protected async restore(p: any): Promise<void> {
    try {
      await this.store.setArchived(false);
      this.toast.success('Progetto ripristinato');
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected async onTrashClick(p: any): Promise<void> {
    if (p.archivedAt) {
      if (this.auth.isAdmin()) {
        const del = await this.confirm.ask(
          `Eliminare definitivamente "${p.name}" con tutti i documenti e gli accessi? L'operazione non è reversibile.`,
          { title: 'Elimina definitivamente', confirmLabel: 'Elimina', danger: true }
        );
        if (del) {
          try {
            await this.api.delete(`/projects/${p.id}`);
            this.toast.success('Progetto eliminato definitivamente');
            await this.router.navigateByUrl('/admin/progetti');
          } catch (err) {
            this.toast.error(err);
          }
        }
      }
    } else {
      const ok = await this.confirm.ask(
        `Archiviare il progetto "${p.name}"? Diventerà di sola lettura per tutti.`,
        { title: 'Archivia progetto', confirmLabel: 'Archivia', danger: true }
      );
      if (ok) {
        try {
          await this.store.setArchived(true);
          this.toast.success('Progetto archiviato');
        } catch (err) {
          this.toast.error(err);
        }
      }
    }
  }

  constructor() {
    effect(() => { void this.store.load(this.projectId()); });
  }
}
