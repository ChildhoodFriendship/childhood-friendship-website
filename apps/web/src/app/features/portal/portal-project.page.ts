import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';
import { QuoteReceiptComponent } from './receipt/quote-receipt.component';

/**
 * Vista Progetto per il Portale Clienti:
 * - 2 soli stati: "IN SVILUPPO" e "LIVE"
 * - Sezione "I tuoi materiali" (loghi, asset e file caricati da admin o cliente)
 * - Thread messaggi
 * - Preventivo a forma di Scontrino termico autentico
 */
@Component({
  selector: 'cf-portal-project-page',
  imports: [DatePipe, RouterLink, MessagesThreadComponent, ProjectFilesComponent, QuoteReceiptComponent],
  template: `
    <div class="page" style="max-width: 1160px">
      @if (project(); as p) {
        <header class="stack-sm page-head">
          <a routerLink="/portale" class="small back-link">← I tuoi progetti</a>
          <div class="page-header">
            <div>
              <h1 class="project-title">{{ p.name }}</h1>
              <div class="row tags-row" style="margin-top: 10px">
                <!-- Solo due stati possibili: IN SVILUPPO o LIVE -->
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
                    🗓️ Consegna prevista: {{ p.deadline | date: 'd MMMM y' }}
                  </span>
                }
              </div>
            </div>
          </div>
        </header>

        <!-- Layout principale: Materiali + Messaggi a sinistra, Scontrino a destra -->
        <div class="portal-grid">
          <div class="main-column stack">
            <!-- Sezione Materiali: Loghi, foto, testi caricati da admin o cliente -->
            <section class="stack-sm">
              <cf-project-files
                [projectId]="p.id"
                [readonly]="!!p.archivedAt"
                title="I tuoi materiali"
                hint="Loghi, foto, testi e asset caricati dal team o da te (max 25 MB ciascuno)."
              />
            </section>

            <!-- Thread Comunicazioni / Messaggi -->
            <section class="stack-sm">
              <div class="card stack-sm">
                <div class="row-between">
                  <div>
                    <h3>Messaggi con lo studio</h3>
                    <p class="muted small">Scrivi direttamente a Lorenzo e al team di sviluppo.</p>
                  </div>
                </div>
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
    .page-head {
      margin-bottom: 24px;
    }

    .back-link {
      color: var(--cf-color-violet-light, #A78BFA) !important;
      text-decoration: none !important;
      display: inline-block;
      margin-bottom: 6px;
    }
    .back-link:hover {
      text-decoration: underline !important;
    }

    .project-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .tags-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Tag Badge Esclusivi (LIVE / IN SVILUPPO) */
    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 14px;
      border-radius: 999px;
      font-family: 'DM Mono', monospace;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .tag-dev {
      background: rgba(124, 58, 237, 0.18);
      color: #DDD6FE;
      border: 1px solid rgba(167, 139, 250, 0.5);
      box-shadow: 0 0 16px rgba(124, 58, 237, 0.25);
    }

    .tag-live {
      background: rgba(16, 185, 129, 0.16);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.45);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
    }

    .btn-live-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(167, 139, 250, 0.12);
      border: 1px solid rgba(167, 139, 250, 0.35);
      color: #F6F1FF !important;
      font-size: 0.8rem;
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

    /* Dot pulsanti */
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

    /* Griglia layout: materiali a sinistra, scontrino a destra */
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
