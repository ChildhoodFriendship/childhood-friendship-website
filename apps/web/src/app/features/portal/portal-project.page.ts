import { ChangeDetectionStrategy, Component, effect, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { PortalI18nService } from '../../core/portal-i18n.service';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';
import { PaymentBoxesComponent } from './receipt/payment-boxes.component';
import { QuoteReceiptComponent } from './receipt/quote-receipt.component';
import { ProjectContractComponent } from './contract/project-contract.component';

export type PortalTab = 'overview' | 'timeline' | 'documents' | 'payments';

interface ProjectMilestone {
  number: number;
  titleEn: string;
  titleIt: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  dateEn: string;
  dateIt: string;
  descEn: string;
  descIt: string;
  deliverablesEn: string[];
  deliverablesIt: string[];
}

interface SoldServiceModule {
  icon: string;
  titleEn: string;
  titleIt: string;
  badgeEn: string;
  badgeIt: string;
  descEn: string;
  descIt: string;
  featuresEn: string[];
  featuresIt: string[];
}

/**
 * Portale Cliente Childhood Friendship — Redesign Mobile App Style
 * - Floating Bottom Dock con SOLO ICONE (Overview, Timeline, Documenti, Pagamenti)
 * - Vista 1: Overview (Stato, Live Preview, Obiettivi di Business, Prodotti/Servizi Venduti)
 * - Vista 2: Timeline (Milestone di progetto, avanzamento fasi, consegne stimate)
 * - Vista 3: Documenti (Contratto B2B firmabile con 1-click, file e materiali di progetto)
 * - Vista 4: Pagamenti (Gestione 2 Tranche, Apple Pay / Card checkout, Scontrino termico ufficiale)
 * - Chat fluttuante con lo studio sincronizzata in tempo reale
 */
@Component({
  selector: 'cf-portal-project-page',
  imports: [
    DatePipe,
    MessagesThreadComponent,
    ProjectFilesComponent,
    PaymentBoxesComponent,
    QuoteReceiptComponent,
    ProjectContractComponent
  ],
  template: `
    <div class="page portal-container">
      @if (project(); as p) {

        <!-- HEADER PRINCIPALE DEL PROGETTO -->
        <header class="project-header">
          <div class="header-badge-row">
            @if (isLive(p)) {
              <span class="tag-badge tag-live">
                <span class="dot pulse-green" aria-hidden="true"></span>
                LIVE
              </span>
              @if (p.targetUrl) {
                <a class="btn-preview-primary" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  {{ i18n.isEn() ? 'Visit Live App ↗' : 'Visita il sito Live ↗' }}
                </a>
              }
            } @else {
              <span class="tag-badge tag-dev">
                <span class="dot pulse-violet" aria-hidden="true"></span>
                {{ i18n.isEn() ? 'IN DEVELOPMENT' : 'IN SVILUPPO' }}
              </span>

              @if (p.stagingUrl) {
                <a class="btn-preview-primary" [href]="p.stagingUrl" target="_blank" rel="noopener noreferrer" [title]="i18n.isEn() ? 'Open interactive staging preview' : 'Apri anteprima interattiva staging'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  {{ i18n.isEn() ? 'Live Staging Preview ↗' : 'Anteprima Staging ↗' }}
                </a>
              }

              @if (p.deadline) {
                <span class="deadline-badge">
                  🗓️ {{ i18n.isEn() ? 'Delivery' : 'Consegna' }}: {{ p.deadline | date: (i18n.isEn() ? 'MMMM d, y' : 'd MMMM y') }}
                </span>
              }
            }
          </div>

          <h1 class="project-title">{{ p.name }}</h1>
          @if (p.description) {
            <p class="project-tagline">{{ p.description }}</p>
          }
        </header>

        <!-- CONTENUTO DELLE 4 VISTE SELEZIONABILI -->
        <main class="portal-main-view">

          <!-- ========================================== -->
          <!-- 1. VISTA OVERVIEW (Panoramica & Servizi) -->
          <!-- ========================================== -->
          @if (activeTab() === 'overview') {
            <section class="tab-view animate-fade-in" aria-labelledby="overview-heading">
              <h2 id="overview-heading" class="sr-only">{{ i18n.isEn() ? 'Project Overview' : 'Panoramica Progetto' }}</h2>

              <!-- Hero Overview Cards -->
              <div class="overview-metrics-grid">
                <div class="metric-card">
                  <div class="metric-icon-wrap">⚡</div>
                  <div class="metric-content">
                    <span class="metric-label">{{ i18n.isEn() ? 'Current Stage' : 'Stato Attuale' }}</span>
                    <strong class="metric-val">{{ isLive(p) ? 'Production Live' : (i18n.isEn() ? 'Phase 3: Core Engineering' : 'Fase 3: Sviluppo Core') }}</strong>
                  </div>
                </div>

                <div class="metric-card">
                  <div class="metric-icon-wrap">🛡️</div>
                  <div class="metric-content">
                    <span class="metric-label">{{ i18n.isEn() ? 'Studio Warranty' : 'Garanzia Studio' }}</span>
                    <strong class="metric-val">{{ i18n.isEn() ? '30 Days Post-Launch' : '30 Giorni Inclusi' }}</strong>
                  </div>
                </div>

                <div class="metric-card">
                  <div class="metric-icon-wrap">☁️</div>
                  <div class="metric-content">
                    <span class="metric-label">{{ i18n.isEn() ? 'Architecture' : 'Infrastruttura' }}</span>
                    <strong class="metric-val">Vercel Edge & Neon Cloud</strong>
                  </div>
                </div>
              </div>

              <!-- Quick Banner Action Anteprima -->
              @if (p.stagingUrl) {
                <div class="staging-hero-banner">
                  <div class="staging-banner-info">
                    <span class="staging-eyebrow">{{ i18n.isEn() ? 'PROTOTYPE PREVIEW READY' : 'ANTEPRIMA PROTOTIPO PRONTA' }}</span>
                    <h3>{{ i18n.isEn() ? 'Explore the active build on staging environment' : 'Esplora il prototipo attivo nell’ambiente di staging' }}</h3>
                    <p class="muted small">{{ p.stagingUrl }}</p>
                  </div>
                  <a class="btn-hero-launch" [href]="p.stagingUrl" target="_blank" rel="noopener noreferrer">
                    <span>{{ i18n.isEn() ? 'Launch Live Preview' : 'Apri Anteprima Live' }}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                </div>
              }

              <!-- SEZIONE OBIETTIVI DI BUSINESS -->
              <div class="section-block">
                <div class="section-title-wrap">
                  <span class="section-icon">🎯</span>
                  <div>
                    <h3 class="section-title">{{ i18n.isEn() ? 'Project Targets & Objectives' : 'Obiettivi & Target di Business' }}</h3>
                    <p class="section-subtitle">{{ i18n.isEn() ? 'Strategic milestones aligned with your operational ROI' : 'Indicatori chiave concordati per massimizzare il ritorno operativo' }}</p>
                  </div>
                </div>

                <div class="objectives-grid">
                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Zero Bounce 1-Tap Emergency Calling' : 'Chiamata Immediata 1-Tap Senza Rimbalzo' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Instant mobile dispatch trigger capturing high-intent lockouts without navigation hurdles.' : 'Inoltro telefonico immediato per convertire istantaneamente gli utenti in emergenza da smartphone.' }}</p>
                    <span class="obj-kpi">{{ i18n.isEn() ? 'Conversion Target: > 35%' : 'Target Conversione: > 35%' }}</span>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Instant Apple Pay Retainer Lock-in' : 'Incasso Acconto Istantaneo Apple Pay' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Secures customer booking deposit with biometric Face ID before technician dispatch.' : 'Blocca l’acconto con Face ID / Carta prima della partenza del tecnico, azzerando le uscite a vuoto.' }}</p>
                    <span class="obj-kpi">{{ i18n.isEn() ? 'Zero No-Shows Target' : 'Azzeramento No-Show' }}</span>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Sub-Second Edge Latency PWA' : 'Latenza Sub-Secondo & PWA Mobile' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Global edge caching ensuring near-instant load even under unstable 4G/5G mobile networks.' : 'Caching CDN edge globale per caricamento immediato anche su reti cellulari deboli.' }}</p>
                    <span class="obj-kpi">{{ i18n.isEn() ? 'Target LCP: < 1.1s' : 'Target LCP: < 1.1s' }}</span>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Local Authority & High Ticket Reach' : 'Dominio Locale Nevada & Alto Spreading' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Geotargeted schema markup positioning your service in high-ticket suburbs and commercial zones.' : 'Markup schema.org strutturato per presidiare i quartieri a maggior capacità di spesa.' }}</p>
                    <span class="obj-kpi">{{ i18n.isEn() ? '100% Geo-Schema Index' : 'Indicizzazione Territoriale 100%' }}</span>
                  </div>
                </div>
              </div>

              <!-- SEZIONE PRODOTTI E SERVIZI VENDUTI -->
              <div class="section-block">
                <div class="section-title-wrap">
                  <span class="section-icon">📦</span>
                  <div>
                    <h3 class="section-title">{{ i18n.isEn() ? 'Commissioned Services & Modules' : 'Prodotti & Servizi Commissionati' }}</h3>
                    <p class="section-subtitle">{{ i18n.isEn() ? 'Engineered modules included in your bespoke contract scope' : 'I moduli architetturali e i software inclusi nella fornitura' }}</p>
                  </div>
                </div>

                <div class="services-grid">
                  @for (mod of serviceModules; track mod.titleEn) {
                    <div class="service-module-card">
                      <div class="module-top">
                        <span class="module-icon">{{ mod.icon }}</span>
                        <span class="module-badge">{{ i18n.isEn() ? mod.badgeEn : mod.badgeIt }}</span>
                      </div>
                      <h4 class="module-title">{{ i18n.isEn() ? mod.titleEn : mod.titleIt }}</h4>
                      <p class="module-desc">{{ i18n.isEn() ? mod.descEn : mod.descIt }}</p>
                      <ul class="module-features">
                        @for (feat of (i18n.isEn() ? mod.featuresEn : mod.featuresIt); track feat) {
                          <li>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>{{ feat }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </div>
            </section>
          }

          <!-- ========================================== -->
          <!-- 2. VISTA TIMELINE (Roadmap & Milestone) -->
          <!-- ========================================== -->
          @if (activeTab() === 'timeline') {
            <section class="tab-view animate-fade-in" aria-labelledby="timeline-heading">
              <div class="section-header-row">
                <div>
                  <h2 id="timeline-heading" class="section-title">{{ i18n.isEn() ? 'Project Roadmap & Milestones' : 'Roadmap & Milestone di Progetto' }}</h2>
                  <p class="section-subtitle">{{ i18n.isEn() ? 'Real-time production pipeline from initial kick-off to official live deployment' : 'Avanzamento in tempo reale dalla pianificazione al rilascio ufficiale' }}</p>
                </div>
                <div class="progress-pill">
                  <span class="progress-text">{{ i18n.isEn() ? 'Progress: 60%' : 'Avanzamento: 60%' }}</span>
                  <div class="progress-bar-mini">
                    <div class="progress-fill" style="width: 60%"></div>
                  </div>
                </div>
              </div>

              <!-- TIMELINE VERTICALE MOBILE APP STYLE -->
              <div class="timeline-container">
                @for (m of milestones; track m.number) {
                  <div class="timeline-step" [class.step-completed]="m.status === 'completed'" [class.step-active]="m.status === 'in_progress'" [class.step-upcoming]="m.status === 'upcoming'">
                    <div class="timeline-marker-col">
                      <div class="timeline-marker">
                        @if (m.status === 'completed') {
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else if (m.status === 'in_progress') {
                          <span class="pulse-ring"></span>
                          <span class="marker-dot"></span>
                        } @else {
                          <span class="marker-number">{{ m.number }}</span>
                        }
                      </div>
                      <div class="timeline-connector"></div>
                    </div>

                    <div class="timeline-card">
                      <div class="timeline-card-head">
                        <div class="step-badge-wrap">
                          <span class="status-pill status-{{ m.status }}">
                            @if (m.status === 'completed') { {{ i18n.isEn() ? 'COMPLETED' : 'COMPLETATO' }} }
                            @else if (m.status === 'in_progress') { {{ i18n.isEn() ? 'IN PROGRESS' : 'IN CORSO' }} }
                            @else { {{ i18n.isEn() ? 'UPCOMING' : 'IN ARRIVO' }} }
                          </span>
                          <span class="step-date">{{ i18n.isEn() ? m.dateEn : m.dateIt }}</span>
                        </div>
                        <h3 class="step-title">Phase {{ m.number }}: {{ i18n.isEn() ? m.titleEn : m.titleIt }}</h3>
                      </div>

                      <p class="step-desc">{{ i18n.isEn() ? m.descEn : m.descIt }}</p>

                      <div class="step-deliverables">
                        <span class="deliverables-title">{{ i18n.isEn() ? 'Deliverables & Artifacts:' : 'Consegne & Risultati:' }}</span>
                        <ul>
                          @for (d of (i18n.isEn() ? m.deliverablesEn : m.deliverablesIt); track d) {
                            <li>
                              <span class="bullet-check">✓</span>
                              <span>{{ d }}</span>
                            </li>
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- ========================================== -->
          <!-- 3. VISTA DOCUMENTI (Contratto & File) -->
          <!-- ========================================== -->
          @if (activeTab() === 'documents') {
            <section class="tab-view animate-fade-in" aria-labelledby="documents-heading">
              <div class="section-header-row">
                <div>
                  <h2 id="documents-heading" class="section-title">{{ i18n.isEn() ? 'Contracts & Project Assets' : 'Contratti & Materiali di Progetto' }}</h2>
                  <p class="section-subtitle">{{ i18n.isEn() ? 'Official B2B agreement, digital signature audit, and shared project assets' : 'Contratto ufficiale B2B, audit firma digitale e file condivisi' }}</p>
                </div>
              </div>

              <!-- Upload Quick Banner -->
              <div class="assets-quick-panel">
                <div class="assets-panel-header">
                  <div class="row-center gap-sm">
                    <span class="panel-icon">📁</span>
                    <h3 class="panel-title">{{ i18n.isEn() ? 'Your Brand & Media Assets' : 'Materiali & Media del Tuo Brand' }}</h3>
                  </div>

                  @if (!p.archivedAt) {
                    <label class="btn-upload-solid">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {{ i18n.isEn() ? '+ Upload File' : '+ Carica file' }}
                      <input
                        type="file"
                        multiple
                        (change)="onPortalUploadPicked($event)"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.mp4,.mov,.mp3,.m4a" />
                    </label>
                  }
                </div>

                <div class="assets-body">
                  <cf-project-files
                    #filesComp
                    [projectId]="p.id"
                    [readonly]="!!p.archivedAt"
                    [showUploadButton]="false"
                    title=""
                    hint=""
                  />
                </div>
              </div>

              <!-- Contratto Digitale B2B di Sviluppo Software -->
              <div class="contract-container">
                <cf-project-contract [project]="p" />
              </div>
            </section>
          }

          <!-- ========================================== -->
          <!-- 4. VISTA PAGAMENTI (Scontrino & Tranche) -->
          <!-- ========================================== -->
          @if (activeTab() === 'payments') {
            <section class="tab-view animate-fade-in" aria-labelledby="payments-heading">
              <div class="section-header-row">
                <div>
                  <h2 id="payments-heading" class="section-title">{{ i18n.isEn() ? 'Payments, Tranches & Invoice' : 'Pagamenti, Tranche & Fatturazione' }}</h2>
                  <p class="section-subtitle">{{ i18n.isEn() ? 'Split payment schedule (50% Deposit / 50% Balance) and official commercial invoice' : 'Piano a 2 tranche (50% Acconto / 50% Saldo) e scontrino fiscale' }}</p>
                </div>
              </div>

              <!-- Box Pagamenti Tranche e Apple Pay -->
              <div class="payments-stage-wrapper">
                <cf-payment-boxes [project]="p" />
              </div>

              <!-- Scontrino Termico Dettagliato Fiscale -->
              <div class="receipt-full-wrapper">
                <cf-quote-receipt [project]="p" />
              </div>
            </section>
          }

        </main>

        <!-- ======================================================== -->
        <!-- FLOATING BOTTOM DOCK: STILE MOBILE APP — SOLO ICONE      -->
        <!-- ======================================================== -->
        <nav class="bottom-dock" aria-label="Navigazione sezioni portale">
          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'overview'"
            (click)="setTab('overview')"
            [attr.aria-label]="i18n.isEn() ? 'Overview & Deliverables' : 'Panoramica & Servizi'"
            [title]="i18n.isEn() ? 'Overview & Deliverables' : 'Panoramica & Servizi'">
            <!-- Icona 1: Overview / Grid -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span class="dock-indicator" aria-hidden="true"></span>
          </button>

          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'timeline'"
            (click)="setTab('timeline')"
            [attr.aria-label]="i18n.isEn() ? 'Milestones & Roadmap' : 'Roadmap & Milestone'"
            [title]="i18n.isEn() ? 'Milestones & Roadmap' : 'Roadmap & Milestone'">
            <!-- Icona 2: Timeline / Roadmap -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M6 9v3a3 3 0 0 0 3 3h6" />
            </svg>
            <span class="dock-indicator" aria-hidden="true"></span>
          </button>

          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'documents'"
            (click)="setTab('documents')"
            [attr.aria-label]="i18n.isEn() ? 'Contract & Files' : 'Contratto & File'"
            [title]="i18n.isEn() ? 'Contract & Files' : 'Contratto & File'">
            <!-- Icona 3: Documenti / Contratto -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
            <span class="dock-indicator" aria-hidden="true"></span>
          </button>

          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'payments'"
            (click)="setTab('payments')"
            [attr.aria-label]="i18n.isEn() ? 'Payments & Invoice' : 'Pagamenti & Ricevuta'"
            [title]="i18n.isEn() ? 'Payments & Invoice' : 'Pagamenti & Ricevuta'">
            <!-- Icona 4: Pagamenti / Scontrino -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <line x1="6" y1="15" x2="8" y2="15" />
              <line x1="11" y1="15" x2="15" y2="15" />
            </svg>
            <span class="dock-indicator" aria-hidden="true"></span>
          </button>
        </nav>

        <!-- FLOATING CHAT CON LO STUDIO -->
        <cf-messages-thread [projectId]="p.id" [floating]="true" />

      } @else if (error()) {
        <div class="alert alert-error">{{ error() }} · <a routerLink="/portale">Torna ai progetti</a></div>
      } @else {
        <div class="skeleton" style="height: 380px; border-radius: 20px;"></div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: radial-gradient(circle at 50% -10%, rgba(124, 58, 237, 0.12) 0%, transparent 60%),
                  radial-gradient(circle at 10% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                  #07050E;
      color: #F8FAFC;
    }

    .portal-container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 24px 20px 140px; /* Spazio sufficiente per non coprire il contenuto col dock in basso */
    }

    /* ----------------------------------------------------
       PROJECT HEADER
       ---------------------------------------------------- */
    .project-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 32px;
      gap: 14px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .project-title {
      font-size: clamp(2rem, 4.5vw, 2.9rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
      background: linear-gradient(180deg, #FFFFFF 20%, #DDD6FE 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .project-tagline {
      font-size: 1.05rem;
      color: rgba(226, 232, 240, 0.8);
      max-width: 680px;
      margin: 0;
      line-height: 1.5;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 999px;
      font-family: 'DM Mono', monospace;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.06em;
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

    .btn-preview-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(99, 102, 241, 0.35));
      border: 1px solid rgba(167, 139, 250, 0.6);
      color: #FFFFFF !important;
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none !important;
      transition: all 0.2s ease;
      box-shadow: 0 4px 18px rgba(124, 58, 237, 0.25);
    }

    .btn-preview-primary:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.6), rgba(99, 102, 241, 0.6));
      border-color: #C4B5FD;
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
    }

    .deadline-badge {
      font-family: 'DM Mono', monospace;
      font-size: 0.8rem;
      color: rgba(226, 232, 240, 0.85);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 4px 12px;
      border-radius: 999px;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .pulse-violet {
      background: #C4B5FD;
      box-shadow: 0 0 8px #8B5CF6;
    }
    .pulse-green {
      background: #34D399;
      box-shadow: 0 0 8px #10B981;
    }

    /* ----------------------------------------------------
       VISTE PRINCIPALI
       ---------------------------------------------------- */
    .portal-main-view {
      position: relative;
    }

    .animate-fade-in {
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Overview Hero Metrics */
    .overview-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
    }

    .metric-icon-wrap {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      font-size: 1.3rem;
      background: rgba(124, 58, 237, 0.14);
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 12px;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .metric-label {
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(203, 213, 225, 0.7);
      font-weight: 600;
    }

    .metric-val {
      font-size: 1.05rem;
      font-weight: 700;
      color: #FFFFFF;
    }

    /* Staging Hero Banner */
    .staging-hero-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 24px 28px;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(30, 24, 56, 0.8) 0%, rgba(18, 14, 34, 0.95) 100%);
      border: 1px solid rgba(167, 139, 250, 0.35);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .staging-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #A78BFA;
      display: block;
      margin-bottom: 4px;
    }

    .staging-banner-info h3 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #FFFFFF;
    }

    .btn-hero-launch {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      border-radius: 999px;
      background: linear-gradient(135deg, #7C3AED, #6366F1);
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 0.92rem;
      text-decoration: none !important;
      transition: all 0.25s ease;
      box-shadow: 0 6px 24px rgba(124, 58, 237, 0.45);
    }
    .btn-hero-launch:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 32px rgba(124, 58, 237, 0.65);
      background: linear-gradient(135deg, #8B5CF6, #4F46E5);
    }

    /* Section Block Styles */
    .section-block {
      margin-bottom: 40px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .section-icon {
      font-size: 1.6rem;
    }

    .section-title {
      font-size: 1.4rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      color: #F8FAFC;
    }

    .section-subtitle {
      font-size: 0.88rem;
      color: rgba(203, 213, 225, 0.75);
      margin: 2px 0 0 0;
    }

    /* Objectives Grid */
    .objectives-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
    }

    .objective-card {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .objective-card:hover {
      transform: translateY(-3px);
      border-color: rgba(167, 139, 250, 0.4);
    }

    .obj-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .obj-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8B5CF6;
      box-shadow: 0 0 8px #7C3AED;
      flex: none;
    }

    .obj-header h4 {
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
      color: #FFFFFF;
    }

    .objective-card p {
      font-size: 0.85rem;
      color: rgba(226, 232, 240, 0.75);
      line-height: 1.45;
      margin: 0;
      flex-grow: 1;
    }

    .obj-kpi {
      font-family: 'DM Mono', monospace;
      font-size: 0.74rem;
      font-weight: 700;
      color: #C4B5FD;
      background: rgba(124, 58, 237, 0.15);
      padding: 3px 8px;
      border-radius: 6px;
      align-self: flex-start;
    }

    /* Services Grid */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 20px;
    }

    .service-module-card {
      background: linear-gradient(180deg, rgba(22, 17, 38, 0.7) 0%, rgba(13, 10, 24, 0.8) 100%);
      border: 1px solid rgba(167, 139, 250, 0.22);
      border-radius: 18px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s ease;
    }
    .service-module-card:hover {
      border-color: rgba(167, 139, 250, 0.5);
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 58, 237, 0.15);
    }

    .module-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .module-icon {
      font-size: 1.8rem;
    }

    .module-badge {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.16);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .module-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.3;
    }

    .module-desc {
      font-size: 0.87rem;
      color: rgba(226, 232, 240, 0.75);
      line-height: 1.45;
      margin: 0;
    }

    .module-features {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .module-features li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #E2E8F0;
    }

    /* ----------------------------------------------------
       VISTA TIMELINE (Roadmap & Milestones)
       ---------------------------------------------------- */
    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .progress-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .progress-text {
      font-family: 'DM Mono', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #C4B5FD;
    }

    .progress-bar-mini {
      width: 80px;
      height: 8px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #7C3AED, #6EE7B7);
      border-radius: 999px;
    }

    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 840px;
      margin: 0 auto;
    }

    .timeline-step {
      display: flex;
      gap: 20px;
      position: relative;
    }

    .timeline-marker-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: none;
    }

    .timeline-marker {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(30, 24, 52, 0.9);
      border: 2px solid rgba(167, 139, 250, 0.3);
      display: grid;
      place-items: center;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.82rem;
      font-weight: 700;
      z-index: 2;
      position: relative;
    }

    .timeline-connector {
      width: 2px;
      flex-grow: 1;
      background: rgba(255, 255, 255, 0.1);
      margin: 6px 0;
    }
    .timeline-step:last-child .timeline-connector {
      display: none;
    }

    .step-completed .timeline-marker {
      background: #10B981;
      border-color: #10B981;
      color: #FFFFFF;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.5);
    }
    .step-completed .timeline-connector {
      background: #10B981;
    }

    .step-active .timeline-marker {
      background: #7C3AED;
      border-color: #C4B5FD;
      color: #FFFFFF;
      box-shadow: 0 0 16px rgba(124, 58, 237, 0.7);
    }
    .marker-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #FFFFFF;
      z-index: 2;
    }
    .pulse-ring {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid #8B5CF6;
      animation: pulsePing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes pulsePing {
      0% { transform: scale(0.95); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .timeline-card {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 22px 24px;
      margin-bottom: 24px;
      flex-grow: 1;
      backdrop-filter: blur(8px);
    }

    .step-active .timeline-card {
      background: linear-gradient(135deg, rgba(35, 26, 62, 0.7) 0%, rgba(20, 15, 36, 0.8) 100%);
      border-color: rgba(167, 139, 250, 0.45);
      box-shadow: 0 8px 30px rgba(124, 58, 237, 0.15);
    }

    .timeline-card-head {
      margin-bottom: 10px;
    }

    .step-badge-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }

    .status-pill {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-completed {
      background: rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
    }
    .status-in_progress {
      background: rgba(124, 58, 237, 0.3);
      color: #DDD6FE;
    }
    .status-upcoming {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.5);
    }

    .step-date {
      font-size: 0.78rem;
      color: rgba(226, 232, 240, 0.6);
      font-family: 'DM Mono', monospace;
    }

    .step-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }

    .step-desc {
      font-size: 0.88rem;
      color: rgba(226, 232, 240, 0.8);
      line-height: 1.45;
      margin: 0 0 14px 0;
    }

    .step-deliverables {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 12px 16px;
    }

    .deliverables-title {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #C4B5FD;
      display: block;
      margin-bottom: 6px;
    }

    .step-deliverables ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .step-deliverables li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: #CBD5E1;
    }

    .bullet-check {
      color: #10B981;
      font-weight: 800;
      font-size: 0.85rem;
    }

    /* ----------------------------------------------------
       VISTA DOCUMENTI (Contratto & File)
       ---------------------------------------------------- */
    .assets-quick-panel {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 32px;
    }

    .assets-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .row-center {
      display: flex;
      align-items: center;
    }
    .gap-sm { gap: 10px; }

    .panel-icon { font-size: 1.4rem; }
    .panel-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      color: #FFFFFF;
    }

    .btn-upload-solid {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border-radius: 999px;
      background: rgba(124, 58, 237, 0.25);
      border: 1px solid rgba(167, 139, 250, 0.5);
      color: #DDD6FE;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-upload-solid:hover {
      background: rgba(124, 58, 237, 0.45);
      border-color: #C4B5FD;
      color: #FFFFFF;
    }
    .btn-upload-solid input[type="file"] {
      display: none;
    }

    /* ----------------------------------------------------
       VISTA PAGAMENTI
       ---------------------------------------------------- */
    .payments-stage-wrapper {
      margin-bottom: 36px;
    }

    .receipt-full-wrapper {
      display: flex;
      justify-content: center;
      margin: 0 auto;
      max-width: 480px;
    }

    /* ----------------------------------------------------
       FLOATING BOTTOM DOCK: MOBILE APP STYLE (SOLO ICONE)
       ---------------------------------------------------- */
    .bottom-dock {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 90;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: rgba(13, 10, 22, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(167, 139, 250, 0.28);
      border-radius: 999px;
      box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.8),
                  0 0 25px rgba(124, 58, 237, 0.25);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .bottom-dock:hover {
      border-color: rgba(167, 139, 250, 0.45);
      box-shadow: 0 18px 46px -8px rgba(0, 0, 0, 0.85),
                  0 0 30px rgba(124, 58, 237, 0.35);
    }

    .dock-btn {
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: rgba(226, 232, 240, 0.65);
      background: transparent;
      border: none;
      cursor: pointer;
      position: relative;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
    }

    .dock-btn svg {
      width: 22px;
      height: 22px;
      transition: transform 0.2s ease, stroke 0.2s ease;
    }

    .dock-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .dock-btn:hover svg {
      transform: scale(1.1);
    }

    .dock-btn.active {
      color: #FFFFFF;
      background: linear-gradient(135deg, #7C3AED, #6366F1);
      box-shadow: 0 4px 18px rgba(124, 58, 237, 0.6);
      transform: translateY(-3px);
    }

    .dock-indicator {
      position: absolute;
      bottom: -4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #C4B5FD;
      box-shadow: 0 0 8px #8B5CF6;
      opacity: 0;
      transform: scale(0);
      transition: all 0.2s ease;
    }

    .dock-btn.active .dock-indicator {
      opacity: 1;
      transform: scale(1);
    }

    /* Screen Reader helper */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Evita sovrapposizione tra floating chat e bottom dock */
    :host ::ng-deep .floating-chat-fab {
      bottom: 88px !important;
      right: 20px !important;
    }
    :host ::ng-deep .floating-chat-window {
      bottom: 154px !important;
      right: 20px !important;
    }

    @media (max-width: 768px) {
      .portal-container {
        padding: 16px 14px 130px;
      }
      :host ::ng-deep .floating-chat-fab {
        bottom: 82px !important;
        right: 14px !important;
      }
      :host ::ng-deep .floating-chat-window {
        bottom: 144px !important;
        right: 12px !important;
        left: 12px !important;
      }
      .bottom-dock {
        bottom: 16px;
        padding: 6px 10px;
        gap: 6px;
      }
      .dock-btn {
        width: 46px;
        height: 46px;
      }
      .dock-btn svg {
        width: 20px;
        height: 20px;
      }
      .staging-hero-banner {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalProjectPage {
  readonly projectId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly project = signal<PortalProjectDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly activeTab = signal<PortalTab>('overview');
  protected readonly filesComponent = viewChild(ProjectFilesComponent);

  /** Servizi e moduli architetturali concordati */
  protected readonly serviceModules: SoldServiceModule[] = [
    {
      icon: '🚨',
      titleEn: 'Emergency 24/7 Dispatch Architecture & 1-Tap Calling',
      titleIt: 'Piattaforma Emergenza 24/7 & Chiamata 1-Tap Istantanea',
      badgeEn: 'CORE MODULE',
      badgeIt: 'MODULO CORE',
      descEn: 'Ultra-fast mobile landing interface engineered to convert emergency callers locked out of homes or vehicles.',
      descIt: 'Interfaccia mobile ad alta conversione per catturare istantaneamente clienti bloccati fuori casa o auto.',
      featuresEn: [
        '1-Tap Direct Call Router (No form friction)',
        'Emergency Night Mode high-contrast UX',
        'Automatic GPS location address sharing',
        'Direct connection to on-call dispatcher'
      ],
      featuresIt: [
        'Pulsante Chiamata 1-Tap istantaneo',
        'Interfaccia notturna ad altissimo contrasto',
        'Condivisione rapida posizione e indirizzo',
        'Inoltro diretto al tecnico reperibile'
      ]
    },
    {
      icon: '',
      titleEn: 'Apple Pay & Stripe Real-Time Retainer Checkout Gateway',
      titleIt: 'Gateway Checkout Acconto Apple Pay & Stripe in Tempo Reale',
      badgeEn: 'FINTECH GATEWAY',
      badgeIt: 'GATEWAY FINTECH',
      descEn: 'Instant deposit authorization via Apple Pay, Google Pay and Cards to secure emergency calls prior to technician roll-out.',
      descIt: 'Autorizzazione immediata acconto con Face ID o carta per garantire l’uscita del tecnico e azzerare i no-show.',
      featuresEn: [
        'Biometric 1-Click Face ID / Touch ID payment',
        'Automated digital invoice & receipt delivery',
        '50% Deposit & 50% Final balance split logic',
        'PCI-DSS Level 1 compliant tokenized flow'
      ],
      featuresIt: [
        'Pagamento biometrico Face ID / Touch ID a 1-click',
        'Ricevuta e fattura digitale inviate via email',
        'Gestione a 2 tranche: 50% Acconto e 50% Saldo',
        'Crittografia certificata PCI-DSS Level 1'
      ]
    },
    {
      icon: '⚡',
      titleEn: 'High-Speed Mobile PWA & Nevada Local SEO Engine',
      titleIt: 'PWA Mobile Ultra-Rapida & Motore SEO Locale Nevada',
      badgeEn: 'PERFORMANCE & SEO',
      badgeIt: 'PERFORMANCE & SEO',
      descEn: 'Progressive Web App deployable directly on smartphone home screens with localized schema markup for Nevada search dominancy.',
      descIt: 'Web App installabile su home screen con ottimizzazione schema.org per dominare le ricerche locali a Las Vegas e Henderson.',
      featuresEn: [
        'Sub-second first contentful paint (< 1.1s)',
        'LocalBusiness JSON-LD structured metadata',
        'Add to Home Screen offline-capable caching',
        'High-ranking suburb micro-landing pages'
      ],
      featuresIt: [
        'Caricamento sub-secondo (LCP < 1.1s)',
        'Metadati strutturati LocalBusiness JSON-LD',
        'Aggiunta a schermata Home come App nativa',
        'Presidio delle zone ad alto reddito (Henderson, Summerlin)'
      ]
    }
  ];

  /** Roadmap e Milestones di Progetto */
  protected readonly milestones: ProjectMilestone[] = [
    {
      number: 1,
      titleEn: 'Strategic Brief & Cloud Architecture Setup',
      titleIt: 'Brief Strategico & Setup Architettura Cloud',
      status: 'completed',
      dateEn: 'October 24, 2026',
      dateIt: '24 Ottobre 2026',
      descEn: 'Diagnostic analysis of the broken Wix 404 domain, target audience definition, and initial Vercel + Neon Postgres scaffolding.',
      descIt: 'Diagnosi tecnica dell’errore 404 Wix, definizione target NAICS e inizializzazione ambiente cloud Vercel + Neon Postgres.',
      deliverablesEn: ['Technical audit report', 'Database schema migration', 'Cloud deployment pipeline'],
      deliverablesIt: ['Report di audit tecnico', 'Schema database e migrazioni', 'Pipeline di deploy cloud']
    },
    {
      number: 2,
      titleEn: 'Mobile UX & 1-Tap Emergency Interface Design',
      titleIt: 'Design UX Mobile & Interfaccia di Emergenza 1-Tap',
      status: 'completed',
      dateEn: 'October 26, 2026',
      dateIt: '26 Ottobre 2026',
      descEn: 'Dark-luxury aesthetic wireframes, responsive click-to-call mechanics, and cross-border commercial terms drafting.',
      descIt: 'Wireframe responsive ad alto contrasto, logica di chiamata immediata e redazione condizioni commerciali.',
      deliverablesEn: ['High-contrast mobile layout', 'Component library', 'B2B software license agreement draft'],
      deliverablesIt: ['Layout mobile ad alto contrasto', 'Libreria componenti', 'Bozza contratto licenza B2B']
    },
    {
      number: 3,
      titleEn: 'Core PWA Development & Stripe Retainer Gateway',
      titleIt: 'Sviluppo Core PWA & Gateway Acconti Stripe',
      status: 'in_progress',
      dateEn: 'October 28, 2026 (Active)',
      dateIt: '28 Ottobre 2026 (In corso)',
      descEn: 'Active engineering of the mobile web app, 2-tranche payment logic (50% deposit / 50% balance), and client portal dashboard.',
      descIt: 'Implementazione frontend PWA, logica a due tranche (50% acconto / 50% saldo) e nuovo portale clienti mobile style.',
      deliverablesEn: ['2-Tranche Apple Pay modal', 'Dynamic thermal quote receipt', 'Mobile app bottom dock navigation'],
      deliverablesIt: ['Modal Apple Pay a 2 tranche', 'Scontrino termico dinamico', 'Navigazione bottom dock mobile app']
    },
    {
      number: 4,
      titleEn: 'Staging Environment Review & Client Sign-off',
      titleIt: 'Revisione Ambiente di Staging & Approvazione Cliente',
      status: 'upcoming',
      dateEn: 'November 10, 2026 (Estimated)',
      dateIt: '10 Novembre 2026 (Stimata)',
      descEn: 'Full 10-day review period for the client to test live staging build, verify emergency call routing, and trigger test transactions.',
      descIt: 'Finestra di 10 giorni per il cliente per collaudare lo staging, testare le chiamate e simulare i pagamenti.',
      deliverablesEn: ['Interactive staging preview', 'Client feedback checklist', 'Digital contract execution'],
      deliverablesIt: ['Anteprima interattiva staging', 'Checklist di collaudo cliente', 'Firma digitale del contratto']
    },
    {
      number: 5,
      titleEn: 'Official Domain Go-Live & Nevada Local SEO Indexing',
      titleIt: 'Rilascio Ufficiale su Dominio & Setup SEO Nevada',
      status: 'upcoming',
      dateEn: 'November 15, 2026 (Estimated)',
      dateIt: '15 Novembre 2026 (Stimata)',
      descEn: 'Production DNS pointing, SSL certificate provision, Google Maps business integration, and handover of final source code.',
      descIt: 'Puntamento DNS del dominio cliente, emissione certificati SSL, sincronizzazione Google Maps e consegna finale.',
      deliverablesEn: ['Official live launch', 'Google Search Console sitemap indexing', '30-day warranty coverage begins'],
      deliverablesIt: ['Lancio live ufficiale', 'Indicizzazione sitemap Search Console', 'Attivazione garanzia 30 giorni']
    }
  ];

  setTab(tab: PortalTab): void {
    this.activeTab.set(tab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  protected onPortalUploadPicked(e: Event): void {
    const el = e.target as HTMLInputElement;
    const files = Array.from(el.files ?? []);
    if (files.length > 0) {
      void this.filesComponent()?.uploadFiles(files);
    }
    el.value = '';
  }

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

      const isUsProject = /us|usa|america|miami|new york|california|las vegas|vegas|los angeles|austin|beverly hills|brickell|dollar|\$/i.test(
        (p.description || '') + ' ' + (p.name || '') + ' ' + (p.clientName || '')
      );
      if (isUsProject && typeof window !== 'undefined' && !localStorage.getItem('cf_portal_lang')) {
        this.i18n.setLang('en');
      }
    } catch (err) {
      this.error.set((err as Error).message);
      this.toast.error(err);
    }
  }
}
