import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';
import { QuoteReceiptComponent } from './receipt/quote-receipt.component';

/**
 * Vista Progetto per il Portale Clienti:
 * - 2 soli stati: "IN SVILUPPO" e "LIVE" (centrati)
 * - Titoli e badge centrati
 * - Sezione "I tuoi materiali" pulita e centrata
 * - Sezione "Messaggi con lo studio" pulita e centrata
 * - Scontrino termico preventivo realistico sotto / a fianco
 */
@Component({
  selector: 'cf-portal-project-page',
  imports: [DatePipe, MessagesThreadComponent, ProjectFilesComponent, QuoteReceiptComponent],
  template: `
    <div class="page portal-container">
      @if (project(); as p) {
        <!-- Header centrato senza link di ritorno -->
        <header class="page-head">
          <h1 class="project-title">{{ p.name }}</h1>
          <div class="tags-row">
            @if (p.isOnline || p.status === 'lanciato') {
              <span class="tag-badge tag-live">
                <span class="dot pulse-green" aria-hidden="true"></span>
                LIVE
              </span>
              @if (p.targetUrl) {
                <a class="btn-live-link" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">
                  Visita il sito ↗
                </a>
              }
            } @else {
              <span class="tag-badge tag-dev">
                <span class="dot pulse-violet" aria-hidden="true"></span>
                IN SVILUPPO
              </span>
            }

            @if (p.deadline) {
              <span class="deadline-pill">
                🗓️ Consegna: {{ p.deadline | date: 'd MMMM y' }}
              </span>
            }
          </div>
        </header>

        <!-- Layout principale -->
        <div class="portal-grid">
          <div class="main-column stack">
            <!-- Sezione Materiali: centrata, senza sottotitolo -->
            <section class="section-box">
              <cf-project-files
                [projectId]="p.id"
                [readonly]="!!p.archivedAt"
                title="I tuoi materiali"
                hint=""
              />
            </section>

            <!-- Thread Comunicazioni / Messaggi: centrato, senza sottotitolo -->
            <section class="section-box">
              <div class="card stack-sm">
                <h3 class="center-heading">Messaggi con lo studio</h3>
                <cf-messages-thread [projectId]="p.id" />
              </div>
            </section>
          </div>

          <!-- Colonna Scontrino Preventivo -->
          <aside class="receipt-column">
            <cf-quote-receipt [project]="p" />
          </aside>
        </div>
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }} · <a routerLink="/portale">Torna ai progetti</a></div>
      } @else {
        <div class="skeleton" style="height: 280px"></div>
      }
    </div>
  `,
  styles: `
    .portal-container {
      max-width: 1160px;
      margin: 0 auto;
      padding: 12px 16px 48px;
    }

    /* Header e Titolo centrati */
    .page-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 32px;
      gap: 12px;
    }

    .project-title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      text-align: center;
    }

    .tags-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Tag Badge IN SVILUPPO / LIVE centrati */
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      font-family: 'DM Mono', monospace;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .tag-dev {
      background: rgba(124, 58, 237, 0.22);
      color: #DDD6FE;
      border: 1px solid rgba(167, 139, 250, 0.6);
      box-shadow: 0 0 18px rgba(124, 58, 237, 0.35);
    }

    .tag-live {
      background: rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.55);
      box-shadow: 0 0 18px rgba(16, 185, 129, 0.35);
    }

    .btn-live-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(167, 139, 250, 0.15);
      border: 1px solid rgba(167, 139, 250, 0.4);
      color: #F6F1FF !important;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none !important;
      transition: all 0.2s ease;
    }
    .btn-live-link:hover {
      background: rgba(124, 58, 237, 0.35);
      border-color: #C4B5FD;
    }

    .deadline-pill {
      font-size: 0.82rem;
      color: rgba(246, 241, 255, 0.7);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .pulse-violet {
      background: #C4B5FD;
      box-shadow: 0 0 8px #8B5CF6;
      animation: pulseV 2s infinite alternate;
    }
    .pulse-green {
      background: #34D399;
      box-shadow: 0 0 8px #10B981;
      animation: pulseG 1.8s infinite alternate;
    }

    @keyframes pulseV {
      0% { opacity: 0.6; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes pulseG {
      0% { opacity: 0.6; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1.15); }
    }

    /* Centratura titoli card */
    .center-heading {
      text-align: center;
      width: 100%;
      margin: 0 0 12px;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    /* Titolo e upload allineati in cf-project-files (Carica file in alto a destra) */
    :host ::ng-deep .files .row-between {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    :host ::ng-deep .files h3 {
      font-size: 1.18rem;
      font-weight: 700;
      margin: 0;
      text-align: left;
    }

    /* Griglia layout */
    .portal-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 440px;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 992px) {
      .portal-grid {
        grid-template-columns: 1fr;
      }
      .receipt-column {
        order: 2;
        width: 100%;
        display: flex;
        justify-content: center;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalProjectPage {
  readonly projectId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly project = signal<PortalProjectDto | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => { void this.load(this.projectId()); });
  }

  private async load(id: string): Promise<void> {
    try {
      const p = await this.api.get<PortalProjectDto>(`/projects/${id}`);
      this.project.set(p);
    } catch (err) {
      this.error.set((err as Error).message);
      this.toast.error(err);
    }
  }
}
