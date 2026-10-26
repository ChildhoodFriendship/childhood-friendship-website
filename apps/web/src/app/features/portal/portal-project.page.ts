import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';
import { PaymentBoxesComponent } from './receipt/payment-boxes.component';
import { QuoteReceiptComponent } from './receipt/quote-receipt.component';

/**
 * Vista Progetto per il Portale Clienti:
 * - 2 soli stati: "IN SVILUPPO" e "LIVE" (centrati)
 * - Link di anteprima staging se presente sotto lo stato
 * - Box DA PAGARE e PAGATO posizionati sotto al link
 * - Sezione "I tuoi materiali" con anteprime visive
 * - Scontrino termico preventivo con dati reali del progetto
 * - Chat moderna con button fisso in basso a destra e supporto foto/video
 */
@Component({
  selector: 'cf-portal-project-page',
  imports: [DatePipe, MessagesThreadComponent, ProjectFilesComponent, PaymentBoxesComponent, QuoteReceiptComponent],
  template: `
    <div class="page portal-container">
      @if (project(); as p) {
        <!-- Header centrato senza link di ritorno -->
        <header class="page-head">
          <h1 class="project-title">{{ p.name }}</h1>
          <div class="tags-row">
            @if (isLive(p)) {
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

              @if (p.stagingUrl) {
                <a class="btn-preview-link" [href]="p.stagingUrl" target="_blank" rel="noopener noreferrer" title="Apri anteprima staging">
                  Anteprima ↗
                </a>
              }

              @if (p.deadline) {
                <span class="deadline-pill">
                  🗓️ Consegna: {{ p.deadline | date: 'd MMMM y' }}
                </span>
              }
            }
          </div>
        </header>

        <!-- Box DA PAGARE e PAGATO -->
        <div class="payment-boxes-wrapper">
          <cf-payment-boxes [project]="p" />
        </div>

        <!-- Layout principale: Materiali a sinistra, Scontrino a destra (chiusi ma espandibili dalla freccetta) -->
        <div class="portal-grid">
          <div class="main-column stack">
            <section class="collapsible-card">
              <button
                type="button"
                class="collapsible-header"
                (click)="materialsOpen.set(!materialsOpen())"
                [attr.aria-expanded]="materialsOpen()">
                <div class="collapsible-title-wrap">
                  <span class="collapsible-icon">📁</span>
                  <h3 class="collapsible-title">I tuoi materiali</h3>
                </div>
                <span class="btn-arrow-wrap">
                  <svg class="chevron-icon" [class.open]="materialsOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </button>

              @if (materialsOpen()) {
                <div class="collapsible-body">
                  <cf-project-files
                    [projectId]="p.id"
                    [readonly]="!!p.archivedAt"
                    title=""
                    hint=""
                  />
                </div>
              }
            </section>
          </div>

          <!-- Colonna Scontrino Preventivo (chiuso ma espandibile dalla freccetta) -->
          <aside class="receipt-column">
            <section class="collapsible-card receipt-card">
              <button
                type="button"
                class="collapsible-header"
                (click)="receiptOpen.set(!receiptOpen())"
                [attr.aria-expanded]="receiptOpen()">
                <div class="collapsible-title-wrap">
                  <span class="collapsible-icon">🧾</span>
                  <h3 class="collapsible-title">Scontrino preventivo</h3>
                </div>
                <span class="btn-arrow-wrap">
                  <svg class="chevron-icon" [class.open]="receiptOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </button>

              @if (receiptOpen()) {
                <div class="collapsible-body receipt-body">
                  <cf-quote-receipt [project]="p" />
                </div>
              }
            </section>
          </aside>
        </div>

        <!-- Floating Chat Widget con Button fisso in basso a destra -->
        <cf-messages-thread [projectId]="p.id" [floating]="true" />

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
      padding: 12px 16px 64px;
    }

    /* Header e Titolo centrati */
    .page-head {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
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

    /* Staging link pill */
    .staging-row {
      display: flex;
      justify-content: center;
      margin-top: 2px;
    }

    .staging-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 18px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(129, 140, 248, 0.45);
      color: #E0E7FF !important;
      text-decoration: none !important;
      transition: all 0.2s ease;
      box-shadow: 0 2px 14px rgba(99, 102, 241, 0.2);
      max-width: 100%;
    }
    .staging-pill:hover {
      background: rgba(99, 102, 241, 0.28);
      border-color: #A5B4FC;
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
    }

    .staging-badge {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: rgba(99, 102, 241, 0.35);
      color: #DDD6FE;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .staging-url {
      font-size: 0.84rem;
      font-weight: 500;
      color: #FFFFFF;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
    }

    .staging-arrow {
      font-size: 0.95rem;
      font-weight: 700;
      color: #C7D2FE;
    }

    /* Contenitori DA PAGARE e PAGATO sotto al link di staging */
    .payment-boxes-wrapper {
      max-width: 600px;
      margin: 0 auto 32px auto;
      width: 100%;
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

    .btn-live-link,
    .btn-preview-link {
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
    .btn-live-link:hover,
    .btn-preview-link:hover {
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

    /* Cards collassabili per Materiali e Scontrino */
    .collapsible-card {
      border-radius: var(--cf-radius-md, 16px);
      background: rgba(18, 16, 26, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
      overflow: hidden;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .collapsible-card:hover {
      border-color: rgba(167, 139, 250, 0.25);
    }
    .receipt-card {
      width: 100%;
    }

    .collapsible-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      color: inherit;
      transition: background 0.15s ease;
    }
    .collapsible-header:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .collapsible-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .collapsible-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .collapsible-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0;
      color: #F6F1FF;
    }

    .btn-arrow-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #C4B5FD;
      transition: all 0.2s ease;
    }
    .collapsible-header:hover .btn-arrow-wrap {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(167, 139, 250, 0.4);
      color: #DDD6FE;
    }

    .chevron-icon {
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      transform: rotate(0deg);
    }
    .chevron-icon.open {
      transform: rotate(90deg);
    }

    .collapsible-body {
      padding: 4px 18px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      animation: fadeIn 0.2s ease;
    }
    .receipt-body {
      display: flex;
      justify-content: center;
      padding: 10px 14px 18px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
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
  protected readonly materialsOpen = signal(false);
  protected readonly receiptOpen = signal(false);

  constructor() {
    effect(() => { void this.load(this.projectId()); });
  }

  protected isLive(p: PortalProjectDto): boolean {
    return p.status === 'lanciato';
  }

  private async load(id: string): Promise<void> {
    try {
      const p = await this.api.get<PortalProjectDto>(`/projects/${id}`);
      this.project.set(p);
      const live = this.isLive(p);
      this.materialsOpen.set(!live);
      this.receiptOpen.set(!live);
    } catch (err) {
      this.error.set((err as Error).message);
      this.toast.error(err);
    }
  }
}
