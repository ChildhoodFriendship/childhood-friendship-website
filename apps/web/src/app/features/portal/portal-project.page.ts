import { ChangeDetectionStrategy, Component, effect, inject, input, signal, viewChild } from '@angular/core';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { PortalI18nService } from '../../core/portal-i18n.service';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';
import { PaymentBoxesComponent } from './receipt/payment-boxes.component';
import { QuoteReceiptComponent } from './receipt/quote-receipt.component';
import { ProjectContractComponent } from './contract/project-contract.component';

export type PortalTab = 'overview' | 'timeline' | 'documents' | 'payments' | 'chat';

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
 * Portale Cliente Childhood Friendship — Redesign Minimal & Mobile App Style
 * - Floating Bottom Dock con 5 ICONE ESSENZIALI (Overview, Timeline, Documenti, Pagamenti, Chat)
 * - Nessuna bolla fluttuante separata: la chat si apre direttamente dalla navbar
 * - Rimosse scritte e sezioni ridondanti per la massima pulizia visiva
 * - Viste minimali e spaziatura rifinita
 */
@Component({
  selector: 'cf-portal-project-page',
  imports: [
    MessagesThreadComponent,
    ProjectFilesComponent,
    PaymentBoxesComponent,
    QuoteReceiptComponent,
    ProjectContractComponent
  ],
  template: `
    <div class="page portal-container">
      @if (project(); as p) {

        <!-- HEADER MINIMALE DEL PROGETTO -->
        <header class="project-header">
          <div class="header-badge-row">
            @if (isLive(p)) {
              <span class="tag-badge tag-live">
                <span class="dot pulse-green" aria-hidden="true"></span>
                LIVE
              </span>
              @if (p.targetUrl) {
                <a class="btn-preview-primary" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  {{ i18n.isEn() ? 'Live Staging Preview ↗' : 'Anteprima Staging ↗' }}
                </a>
              }
            }
          </div>

          <h1 class="project-title">{{ p.name }}</h1>
        </header>

        <!-- CONTENUTO DELLE 4 VISTE SELEZIONABILI -->
        <main class="portal-main-view">

          <!-- ========================================== -->
          <!-- 1. VISTA OVERVIEW (Panoramica & Servizi) -->
          <!-- ========================================== -->
          @if (activeTab() === 'overview') {
            <section class="tab-view animate-fade-in" aria-labelledby="overview-heading">
              <h2 id="overview-heading" class="sr-only">{{ i18n.isEn() ? 'Project Overview' : 'Panoramica Progetto' }}</h2>

              <!-- SEZIONE OBIETTIVI (MINIMAL) -->
              <div class="section-block">
                <div class="section-title-wrap">
                  <span class="section-icon">🎯</span>
                  <h3 class="section-title">{{ i18n.isEn() ? 'Objectives' : 'Obiettivi' }}</h3>
                </div>

                <div class="objectives-grid">
                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Zero Bounce 1-Tap Emergency Calling' : 'Chiamata Immediata 1-Tap Senza Rimbalzo' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Instant mobile dispatch trigger capturing high-intent lockouts without navigation hurdles.' : 'Inoltro telefonico immediato per convertire istantaneamente gli utenti in emergenza da smartphone.' }}</p>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Instant Apple Pay Retainer Lock-in' : 'Incasso Acconto Istantaneo Apple Pay' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Secures customer booking deposit with biometric Face ID before technician dispatch.' : 'Blocca l’acconto con Face ID / Carta prima della partenza del tecnico, azzerando le uscite a vuoto.' }}</p>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Sub-Second Edge Latency PWA' : 'Latenza Sub-Secondo & PWA Mobile' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Global edge caching ensuring near-instant load even under unstable 4G/5G mobile networks.' : 'Caching CDN edge globale per caricamento immediato anche su reti cellulari deboli.' }}</p>
                  </div>

                  <div class="objective-card">
                    <div class="obj-header">
                      <span class="obj-dot"></span>
                      <h4>{{ i18n.isEn() ? 'Local Authority & High Ticket Reach' : 'Dominio Locale Nevada & Alto Spreading' }}</h4>
                    </div>
                    <p>{{ i18n.isEn() ? 'Geotargeted schema markup positioning your service in high-ticket suburbs and commercial zones.' : 'Markup schema.org strutturato per presidiare i quartieri a maggior capacità di spesa.' }}</p>
                  </div>
                </div>
              </div>

              <!-- SEZIONE PRODOTTI E SERVIZI VENDUTI -->
              <div class="section-block">
                <div class="section-title-wrap">
                  <span class="section-icon">📦</span>
                  <h3 class="section-title">{{ i18n.isEn() ? 'Commissioned Services & Modules' : 'Prodotti & Servizi Commissionati' }}</h3>
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
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
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
              <h2 id="timeline-heading" class="sr-only">{{ i18n.isEn() ? 'Milestones' : 'Milestone' }}</h2>

              <div class="timeline-top-bar">
                <span class="progress-text">{{ i18n.isEn() ? 'Progress: 60%' : 'Avanzamento: 60%' }}</span>
                <div class="progress-bar-mini">
                  <div class="progress-fill" style="width: 60%"></div>
                </div>
              </div>

              <!-- TIMELINE VERTICALE MOBILE APP STYLE -->
              <div class="timeline-container">
                @for (m of milestones; track m.number) {
                  <div class="timeline-step" [class.step-completed]="m.status === 'completed'" [class.step-active]="m.status === 'in_progress'" [class.step-upcoming]="m.status === 'upcoming'">
                    <div class="timeline-marker-col">
                      <div class="timeline-marker">
                        @if (m.status === 'completed') {
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else if (m.status === 'in_progress') {
                          <span class="pulse-ring"></span>
                          <span class="marker-dot"></span>
                        } @else {
                          <span class="marker-number">{{ m.number }}</span>
                        }
                      </div>
                      <div class="timeline-connector"></div>
                    </div>

                    <div class="timeline-card" [class.is-collapsed]="m.status === 'completed' && !isExpanded(m)">
                      <div
                        class="timeline-card-head"
                        [class.clickable]="m.status === 'completed'"
                        (click)="m.status === 'completed' ? toggleMilestone(m) : null"
                        [attr.role]="m.status === 'completed' ? 'button' : null"
                        [attr.tabindex]="m.status === 'completed' ? 0 : null"
                        [attr.aria-expanded]="m.status === 'completed' ? isExpanded(m) : null"
                        (keydown.enter)="m.status === 'completed' && toggleMilestone(m)"
                        (keydown.space)="m.status === 'completed' && toggleMilestone(m); $event.preventDefault()">
                        <div class="step-head-main">
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

                        @if (m.status === 'completed') {
                          <span class="step-expand-icon" [class.rotated]="isExpanded(m)" aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </span>
                        }
                      </div>

                      @if (isExpanded(m)) {
                        <div class="step-collapsible-body animate-fade-in">
                          <p class="step-desc">{{ i18n.isEn() ? m.descEn : m.descIt }}</p>

                          <div class="step-deliverables">
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
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- ========================================== -->
          <!-- 3. VISTA DOCUMENTI (Fiscale, Contratto & File) -->
          <!-- ========================================== -->
          @if (activeTab() === 'documents') {
            <section class="tab-view animate-fade-in" aria-labelledby="documents-heading">
              <h2 id="documents-heading" class="sr-only">{{ i18n.isEn() ? 'Documents' : 'Documenti' }}</h2>

              <!-- Documento Commerciale Fiscale B2B / Fattura Elettronica SDI -->
              <div class="receipt-full-wrapper">
                <cf-quote-receipt [project]="p" />
              </div>

              <!-- Contratto Digitale B2B di Sviluppo Software -->
              <div class="contract-container">
                <cf-project-contract [project]="p" />
              </div>

              <!-- Materiali -->
              <div class="assets-quick-panel">
                <div class="assets-panel-header">
                  <div class="row-center gap-sm">
                    <span class="panel-icon">📁</span>
                    <h3 class="panel-title">{{ i18n.isEn() ? 'Assets' : 'Materiali' }}</h3>
                  </div>

                  @if (!p.archivedAt) {
                    <label class="btn-upload-solid">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
            </section>
          }

          <!-- ========================================== -->
          <!-- 4. VISTA PAGAMENTI (Tranche, Apple Pay & Stripe) -->
          <!-- ========================================== -->
          @if (activeTab() === 'payments') {
            <section class="tab-view animate-fade-in" aria-labelledby="payments-heading">
              <h2 id="payments-heading" class="sr-only">{{ i18n.isEn() ? 'Payments' : 'Pagamenti' }}</h2>

              <!-- Box Pagamenti Tranche e Apple Pay -->
              <div class="payments-stage-wrapper">
                <cf-payment-boxes [project]="p" />
              </div>
            </section>
          }

          <!-- ========================================== -->
          <!-- 5. VISTA CHAT DEDICATA (Thread a Schermo)  -->
          <!-- ========================================== -->
          @if (activeTab() === 'chat') {
            <section class="tab-view animate-fade-in chat-view-section" aria-labelledby="chat-heading">
              <h2 id="chat-heading" class="sr-only">{{ i18n.isEn() ? 'Direct Studio Chat' : 'Chat con lo Studio' }}</h2>

              <div class="chat-dedicated-card">
                <cf-messages-thread
                  [projectId]="p.id"
                  [floating]="false"
                />
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
            [attr.aria-label]="i18n.isEn() ? 'Overview' : 'Panoramica'"
            [title]="i18n.isEn() ? 'Overview' : 'Panoramica'">
            <!-- Icona 1: Overview / Grid -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
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
          </button>

          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'documents'"
            (click)="setTab('documents')"
            [attr.aria-label]="i18n.isEn() ? 'Documents & Files' : 'Documenti & File'"
            [title]="i18n.isEn() ? 'Documents & Files' : 'Documenti & File'">
            <!-- Icona 3: Documenti / Contratto -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
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
          </button>

          <!-- Icona 5: Chat con lo Studio integrata direttamente nella dock (Vista Dedicata) -->
          <button
            type="button"
            class="dock-btn"
            [class.active]="activeTab() === 'chat'"
            (click)="setTab('chat')"
            [attr.aria-label]="i18n.isEn() ? 'Studio Chat' : 'Chat con lo studio'"
            [title]="i18n.isEn() ? 'Studio Chat' : 'Chat con lo studio'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </button>
        </nav>

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
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 16px 130px;
      width: 100%;
      box-sizing: border-box;
    }

    /* ----------------------------------------------------
       PROJECT HEADER (MINIMAL)
       ---------------------------------------------------- */
    .project-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 20px;
      gap: 10px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .project-title {
      font-size: clamp(1.85rem, 4vw, 2.6rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
      background: linear-gradient(180deg, #FFFFFF 20%, #DDD6FE 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .project-tagline {
      font-size: 0.96rem;
      color: rgba(226, 232, 240, 0.72);
      max-width: 620px;
      margin: 0;
      line-height: 1.45;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-family: 'DM Mono', monospace;
      font-size: 0.74rem;
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
      gap: 6px;
      padding: 5px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(99, 102, 241, 0.35));
      border: 1px solid rgba(167, 139, 250, 0.55);
      color: #FFFFFF !important;
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none !important;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.22);
    }

    .btn-preview-primary:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.6), rgba(99, 102, 241, 0.6));
      border-color: #C4B5FD;
      transform: translateY(-2px);
      box-shadow: 0 6px 22px rgba(124, 58, 237, 0.4);
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
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Section Block Styles */
    .section-block {
      margin-bottom: 34px;
    }

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .section-icon {
      font-size: 1.4rem;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      color: #F8FAFC;
    }

    /* Objectives Grid (Minimal) */
    .objectives-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }

    .objective-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .objective-card:hover {
      transform: translateY(-2px);
      border-color: rgba(167, 139, 250, 0.35);
    }

    .obj-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .obj-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #8B5CF6;
      box-shadow: 0 0 6px #7C3AED;
      flex: none;
    }

    .obj-header h4 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
      color: #FFFFFF;
    }

    .objective-card p {
      font-size: 0.82rem;
      color: rgba(226, 232, 240, 0.72);
      line-height: 1.4;
      margin: 0;
    }

    /* Services Grid */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .service-module-card {
      background: linear-gradient(180deg, rgba(22, 17, 38, 0.6) 0%, rgba(13, 10, 24, 0.75) 100%);
      border: 1px solid rgba(167, 139, 250, 0.18);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s ease;
    }
    .service-module-card:hover {
      border-color: rgba(167, 139, 250, 0.45);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    }

    .module-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .module-icon {
      font-size: 1.5rem;
    }

    .module-badge {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 5px;
      background: rgba(16, 185, 129, 0.16);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .module-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.3;
    }

    .module-desc {
      font-size: 0.83rem;
      color: rgba(226, 232, 240, 0.72);
      line-height: 1.4;
      margin: 0;
    }

    .module-features {
      list-style: none;
      padding: 0;
      margin: 6px 0 0 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .module-features li {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.78rem;
      color: #E2E8F0;
    }

    /* ----------------------------------------------------
       VISTA TIMELINE (Roadmap & Milestones)
       ---------------------------------------------------- */
    .timeline-top-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 0;
      background: transparent;
      border: none;
      width: fit-content;
      margin: 0 auto 24px;
    }

    .progress-text {
      font-family: 'DM Mono', monospace;
      font-size: 0.78rem;
      font-weight: 700;
      color: #C4B5FD;
    }

    .progress-bar-mini {
      width: 70px;
      height: 6px;
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
      max-width: 780px;
      width: 100%;
      margin: 0 auto;
    }

    .timeline-step {
      display: flex;
      gap: 16px;
      position: relative;
    }

    .timeline-marker-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: none;
    }

    .timeline-marker {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(30, 24, 52, 0.9);
      border: 2px solid rgba(167, 139, 250, 0.3);
      display: grid;
      place-items: center;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.76rem;
      font-weight: 700;
      z-index: 2;
      position: relative;
    }

    .timeline-connector {
      width: 2px;
      flex-grow: 1;
      background: rgba(255, 255, 255, 0.08);
      margin: 4px 0;
    }
    .timeline-step:last-child .timeline-connector {
      display: none;
    }

    .step-completed .timeline-marker {
      background: #10B981;
      border-color: #10B981;
      color: #FFFFFF;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.45);
    }
    .step-completed .timeline-connector {
      background: #10B981;
    }

    .step-active .timeline-marker {
      background: #7C3AED;
      border-color: #C4B5FD;
      color: #FFFFFF;
      box-shadow: 0 0 14px rgba(124, 58, 237, 0.65);
    }
    .marker-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #FFFFFF;
      z-index: 2;
    }
    .pulse-ring {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 2px solid #8B5CF6;
      animation: pulsePing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
    @keyframes pulsePing {
      0% { transform: scale(0.95); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .timeline-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 16px;
      padding: 18px 20px;
      margin-bottom: 18px;
      flex-grow: 1;
      min-width: 0;
      backdrop-filter: blur(8px);
      transition: background 0.2s ease, border-color 0.2s ease, padding 0.2s ease;
    }

    .timeline-card.is-collapsed {
      padding: 12px 18px;
      margin-bottom: 12px;
    }

    .step-active .timeline-card {
      background: linear-gradient(135deg, rgba(35, 26, 62, 0.6) 0%, rgba(20, 15, 36, 0.75) 100%);
      border-color: rgba(167, 139, 250, 0.4);
      box-shadow: 0 6px 24px rgba(124, 58, 237, 0.12);
    }

    .timeline-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .timeline-card-head.clickable {
      cursor: pointer;
      user-select: none;
    }

    .timeline-card-head.clickable:hover .step-title {
      color: #DDD6FE;
    }

    .step-head-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-grow: 1;
      min-width: 0;
    }

    .step-expand-icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      color: rgba(226, 232, 240, 0.65);
      flex: none;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, color 0.2s ease;
    }

    .timeline-card-head:hover .step-expand-icon {
      background: rgba(124, 58, 237, 0.25);
      color: #DDD6FE;
    }

    .step-expand-icon.rotated {
      transform: rotate(180deg);
    }

    .step-collapsible-body {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .step-badge-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 2px;
    }

    .status-pill {
      font-family: 'DM Mono', monospace;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 2px 7px;
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
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.5);
    }

    .step-date {
      font-size: 0.74rem;
      color: rgba(226, 232, 240, 0.55);
      font-family: 'DM Mono', monospace;
    }

    .step-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }

    .step-desc {
      font-size: 0.84rem;
      color: rgba(226, 232, 240, 0.75);
      line-height: 1.4;
      margin: 0 0 10px 0;
    }

    .step-deliverables {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 10px;
      padding: 10px 14px;
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
      gap: 7px;
      font-size: 0.78rem;
      color: #CBD5E1;
    }

    .bullet-check {
      color: #10B981;
      font-weight: 800;
      font-size: 0.8rem;
    }

    /* ----------------------------------------------------
       VISTA DOCUMENTI (Contratto & File)
       ---------------------------------------------------- */
    .assets-quick-panel {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .assets-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .row-center {
      display: flex;
      align-items: center;
    }
    .gap-sm { gap: 8px; }

    .panel-icon { font-size: 1.25rem; }
    .panel-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
      color: #FFFFFF;
    }

    .btn-upload-solid {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(124, 58, 237, 0.22);
      border: 1px solid rgba(167, 139, 250, 0.45);
      color: #DDD6FE;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-upload-solid:hover {
      background: rgba(124, 58, 237, 0.4);
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
      margin-bottom: 28px;
    }

    .receipt-full-wrapper {
      display: flex;
      justify-content: center;
      margin: 0 auto 28px auto;
      max-width: 760px;
      width: 100%;
    }

    /* ----------------------------------------------------
       VISTA CHAT DEDICATA
       ---------------------------------------------------- */
    .chat-view-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }

    .chat-dedicated-card {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      background: rgba(18, 14, 28, 0.88);
      border: none;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }

    /* ----------------------------------------------------
       FLOATING BOTTOM DOCK: 5 ICONE ESSENZIALI
       ---------------------------------------------------- */
    .bottom-dock {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(13, 10, 22, 0.92);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 999px;
      box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.8),
                  0 0 22px rgba(124, 58, 237, 0.22);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .bottom-dock:hover {
      border-color: rgba(167, 139, 250, 0.4);
      box-shadow: 0 18px 42px -6px rgba(0, 0, 0, 0.85),
                  0 0 28px rgba(124, 58, 237, 0.3);
    }

    .dock-btn {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: rgba(226, 232, 240, 0.65);
      background: transparent;
      border: none;
      cursor: pointer;
      position: relative;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
    }

    .dock-btn svg {
      width: 20px;
      height: 20px;
      transition: transform 0.2s ease;
    }

    .dock-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .dock-btn:hover svg {
      transform: scale(1.08);
    }

    .dock-btn.active {
      color: #FFFFFF;
      background: linear-gradient(135deg, #7C3AED, #6366F1);
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.55);
      transform: translateY(-2px);
    }

    /* Posizionamento chat window sopra la navbar senza sovrapposizioni */
    :host ::ng-deep .floating-chat-window {
      bottom: 84px !important;
      right: 24px !important;
      z-index: 1000 !important;
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

    @media (max-width: 768px) {
      .portal-container {
        padding: 14px 10px 115px;
      }
      .project-title {
        font-size: 1.75rem;
      }
      .timeline-step {
        gap: 10px;
      }
      .timeline-marker {
        width: 28px;
        height: 28px;
        font-size: 0.72rem;
      }
      .timeline-card {
        padding: 14px 14px;
        border-radius: 13px;
      }
      .timeline-card.is-collapsed {
        padding: 10px 12px;
      }
      .step-title {
        font-size: 0.98rem;
      }
      .objectives-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .objective-card {
        padding: 14px 14px;
      }
      .services-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .service-module-card {
        padding: 16px 14px;
      }
      .assets-quick-panel {
        padding: 16px 14px;
      }
      .bottom-dock {
        bottom: 12px;
        padding: 5px 8px;
        gap: 5px;
      }
      .dock-btn {
        width: 44px;
        height: 44px;
      }
      .dock-btn svg {
        width: 20px;
        height: 20px;
      }
      :host ::ng-deep .floating-chat-window {
        bottom: 74px !important;
        right: 10px !important;
        left: 10px !important;
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
  protected readonly expandedMilestones = signal<Set<number>>(new Set());

  protected isExpanded(m: ProjectMilestone): boolean {
    if (m.status === 'completed') {
      return this.expandedMilestones().has(m.number);
    }
    return true;
  }

  protected toggleMilestone(m: ProjectMilestone): void {
    if (m.status !== 'completed') return;
    this.expandedMilestones.update(prev => {
      const next = new Set(prev);
      if (next.has(m.number)) {
        next.delete(m.number);
      } else {
        next.add(m.number);
      }
      return next;
    });
  }

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
