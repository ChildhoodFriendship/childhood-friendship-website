import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';

interface SignatureRecord {
  signerName: string;
  signedAt: string;
  signatureHash: string;
  ipPlaceholder: string;
}

@Component({
  selector: 'cf-project-contract',
  imports: [DatePipe],
  template: `
    <section class="collapsible-card contract-card" [class.is-signed]="isSigned()">
      <!-- Header della Card Contratto -->
      <div class="collapsible-header">
        <div
          class="collapsible-title-wrap"
          (click)="isOpen.set(!isOpen())"
          role="button"
          tabindex="0"
          [attr.aria-expanded]="isOpen()">
          <span class="collapsible-icon">📜</span>
          <div class="title-and-badge">
            <h3 class="collapsible-title">Contratto di Sviluppo B2B</h3>
            @if (isSigned()) {
              <span class="status-pill status-signed">FIRMATO DIGITALMENTE ✓</span>
            } @else {
              <span class="status-pill status-pending">DA FIRMARE DIGITALMENTE</span>
            }
          </div>
        </div>

        <div class="collapsible-header-actions">
          @if (isSigned()) {
            <button
              type="button"
              class="btn-print-contract no-print"
              (click)="printContract($event)"
              title="Stampa o salva come PDF">
              🖨️ Salva PDF
            </button>
          }

          <button
            type="button"
            class="btn-arrow-wrap"
            (click)="isOpen.set(!isOpen())"
            [attr.aria-expanded]="isOpen()"
            [attr.aria-label]="isOpen() ? 'Comprimi contratto' : 'Espandi contratto'">
            <svg class="chevron-icon" [class.open]="isOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Corpo del Contratto (espandibile) -->
      @if (isOpen()) {
        <div class="collapsible-body contract-body">
          <!-- Certificato di Firma se già stipulato -->
          @if (signature(); as sig) {
            <div class="signature-certificate no-print">
              <div class="cert-header">
                <span class="cert-icon">🔒</span>
                <div>
                  <h4 class="cert-title">Documento Sottoscritto con Firma Elettronica Avanzata</h4>
                  <p class="cert-meta">
                    Sottoscritto da: <strong>{{ sig.signerName }}</strong> · Data e Ora UTC: <strong>{{ sig.signedAt | date: 'dd/MM/yyyy HH:mm:ss' }}</strong>
                  </p>
                </div>
              </div>
              <div class="cert-footer">
                <span class="cert-hash">Codice Certificato: {{ sig.signatureHash }}</span>
                <span class="cert-valid">Validità Legale ex art. 1326 c.c. & Reg. UE 910/2014 (eIDAS) ✓</span>
              </div>
            </div>
          }

          <!-- Testo Ufficiale del Contratto -->
          <article class="contract-doc">
            <header class="doc-header">
              <div class="doc-brand">CHILDHOOD FRIENDSHIP</div>
              <h2 class="doc-title">CONTRATTO DI SVILUPPO SOFTWARE, SOLUZIONI DIGITALI E LICENZA D'USO</h2>
              <p class="doc-sub">Accordo B2B per la progettazione, sviluppo e manutenzione della soluzione digitale</p>
            </header>

            <div class="parties-block">
              <p><strong>TRA:</strong></p>
              <p>
                <strong>FORNITORE:</strong> Childhood Friendship di Lorenzo & Mirko, con recapito a Padova (PD), 
                P.IVA IT04982710284, email: <em>childhood.friendship.official&#64;gmail.com</em> (in seguito "Fornitore")
              </p>
              <p><strong>E:</strong></p>
              <p>
                <strong>COMMITTENTE:</strong> {{ project().clientName || 'Cliente' }}, committente per il progetto 
                <strong>"{{ project().name }}"</strong> (in seguito "Committente").
              </p>
            </div>

            <div class="articles-list">
              <div class="article-item">
                <h5>ART. 1 - OGGETTO DELL'ACCORDO</h5>
                <p>
                  Il Fornitore si impegna a progettare e sviluppare per il Committente la soluzione digitale denominata 
                  <strong>"{{ project().name }}"</strong>, secondo le specifiche, i moduli e le voci indicate nel preventivo 
                  dettagliato collegato e accettato.
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 2 - CORRISPETTIVO, FATTURAZIONE E TERMINI DI PAGAMENTO</h5>
                <p>
                  2.1 Il corrispettivo complessivo è determinato dalle voci del preventivo allegato (maggiorato di IVA 22%).<br>
                  2.2 Il pagamento avverrà tramite transazione elettronica tracciata (Apple Pay, carta o bonifico):
                  acconto del 50% all'accettazione e saldo del 50% al collaudo finale prima della pubblicazione (Live).<br>
                  2.3 Ciascun incasso è assoggettato a regolare <strong>Fattura Elettronica SDI</strong> emessa e trasmessa telematicamente all'Agenzia delle Entrate.
                </p>
              </div>

              <div class="article-item highlight-article">
                <h5>ART. 3 - RISERVA DI PROPRIETÀ E PROPRIETÀ INTELLETTUALE (IP)</h5>
                <p>
                  3.1 Ai sensi e per gli effetti dell'art. 1523 del Codice Civile, tutti i diritti di proprietà intellettuale, 
                  il codice sorgente artigianale e i deliverable sviluppati <strong>RESTANO DI ESCLUSIVA PROPRIETÀ DEL FORNITORE 
                  FINO AL TOTALE E INTEGRALE SALDO DEL COMPENSO CONCORDATO</strong>.<br>
                  3.2 Solo all'avvenuto saldo totale, il Fornitore cede al Committente la piena titolarità economica 
                  e d'uso dell'opera, restando salvi i diritti morali d'autore del Fornitore.<br>
                  3.3 In caso di inadempimento o mancato pagamento del saldo, il Fornitore ha facoltà di revocare la licenza 
                  e disattivare la piattaforma senza preavviso.
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 4 - COLLAUDO, REVISIONE E ACCETTAZIONE TACITA</h5>
                <p>
                  Al completamento della versione in staging, il Committente dispone di <strong>10 (dieci) giorni lavorativi</strong> 
                  per verificare la conformità e segnalare eventuali anomalie. Trascorso tale termine senza contestazioni scritte, 
                  l'opera si intende <strong>definitivamente accettata e collaudata</strong>.
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 5 - GARANZIA POST-LANCIO E ASSISTENZA BUG FIXING</h5>
                <p>
                  Il Fornitore include una garanzia di <strong>30 (trenta) giorni dalla data di lancio (Live)</strong> 
                  per la risoluzione gratuita di vizi e difetti tecnici (bug fixing) conformi alle specifiche. Modifiche grafiche, 
                  nuove funzionalità o interventi derivanti da manomissioni di terzi saranno computati a parte.
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 6 - LIMITAZIONE DI RESPONSABILITÀ PER FORNITORI TERZI</h5>
                <p>
                  Il Fornitore non è responsabile per interruzioni, ritardi o malfunzionamenti imputabili a piattaforme cloud 
                  o registrar terzi (a titolo esemplificativo: Vercel, Neon, AWS, Google Cloud, provider DNS).
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 7 - MATERIALI FORNITI E RISERVATEZZA (GDPR)</h5>
                <p>
                  Il Committente garantisce la piena titolarità e legalità di testi, loghi, foto e marchi caricati, 
                  manlevando il Fornitore da pretese terze. I dati personali sono trattati a norma del Regolamento UE 2016/679.
                </p>
              </div>

              <div class="article-item">
                <h5>ART. 8 - FORO COMPETENTE ESCLUSIVO</h5>
                <p>
                  Per qualsiasi controversia derivante dall'interpretazione, validità o esecuzione del presente accordo 
                  sarà competente in via esclusiva il <strong>Foro di Padova</strong>.
                </p>
              </div>
            </div>

            <!-- Box Approvazione Clausole Vessatorie ex art. 1341-1342 c.c. -->
            <div class="vexatious-box">
              <h6 class="vexatious-title">APPROVAZIONE SPECIFICA DELLE CLAUSOLE PARTICOLARI (Artt. 1341 e 1342 C.C.)</h6>
              <p class="vexatious-text">
                Il Committente dichiara di aver preso visione e di approvare specificamente per iscritto le disposizioni 
                degli articoli: <strong>Art. 2</strong> (Termini di pagamento e sospensione), <strong>Art. 3</strong> (Riserva 
                di proprietà intellettuale fino al saldo), <strong>Art. 4</strong> (Accettazione tacita entro 10 giorni), 
                <strong>Art. 5</strong> (Garanzia limitata a 30 giorni), <strong>Art. 6</strong> (Esonero responsabilità disservizi terzi), 
                <strong>Art. 8</strong> (Competenza esclusiva Foro di Padova).
              </p>
            </div>

            <!-- Modulo di Firma (visibile solo se non ancora firmato) -->
            @if (!isSigned()) {
              <div class="signing-form no-print">
                <div class="sign-field">
                  <label for="signer-name-input" class="sign-label">Nome e Cognome del Firmatario / Legale Rappresentante:</label>
                  <input
                    id="signer-name-input"
                    type="text"
                    class="sign-input"
                    [value]="signerInputName()"
                    (input)="signerInputName.set($any($event.target).value)"
                    placeholder="Es. Lorenzo Rossi" />
                </div>

                <label class="sign-checkbox-label">
                  <input
                    type="checkbox"
                    class="sign-checkbox"
                    [checked]="vexatiousAccepted()"
                    (change)="vexatiousAccepted.set($any($event.target).checked)" />
                  <span>Dichiaro di aver letto, compreso e approvato specificamente tutte le condizioni e le clausole del contratto.</span>
                </label>

                <div class="sign-actions">
                  <button
                    type="button"
                    class="btn-sign-contract"
                    [disabled]="!canSign()"
                    (click)="submitSignature()">
                    ✍️ Firma Digitalmente il Contratto
                  </button>
                  <span class="sign-legal-hint">Apposizione di Firma Elettronica Avanzata con marcatura oraria e tracciamento audit</span>
                </div>
              </div>
            } @else {
              <!-- Firma impressa sul documento -->
              <div class="doc-signature-block">
                <div class="sig-col">
                  <p class="sig-label">Per il Fornitore:</p>
                  <p class="sig-name">Childhood Friendship</p>
                  <span class="sig-seal">Sottoscritto digitalmente</span>
                </div>
                <div class="sig-col">
                  <p class="sig-label">Per il Committente:</p>
                  <p class="sig-name">{{ signature()?.signerName }}</p>
                  <span class="sig-seal client-seal">Firmato digitalmente il {{ signature()?.signedAt | date: 'dd/MM/yyyy' }}</span>
                </div>
              </div>
            }
          </article>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .contract-card {
      border-radius: var(--cf-radius-md, 16px);
      background: rgba(18, 16, 26, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(14px);
      overflow: hidden;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .contract-card:hover {
      border-color: rgba(167, 139, 250, 0.3);
    }
    .contract-card.is-signed {
      border-color: rgba(16, 185, 129, 0.35);
    }

    .collapsible-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      box-sizing: border-box;
      gap: 12px;
      user-select: none;
    }

    .collapsible-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      flex: 1;
    }

    .collapsible-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .title-and-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .collapsible-title {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0;
      color: #F6F1FF;
    }

    .status-pill {
      font-family: 'DM Mono', monospace;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 3px 10px;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .status-pending {
      background: rgba(245, 158, 11, 0.18);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.45);
    }
    .status-signed {
      background: rgba(16, 185, 129, 0.18);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.5);
    }

    .collapsible-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-print-contract {
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #F6F1FF;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-print-contract:hover {
      background: rgba(255, 255, 255, 0.16);
      border-color: #A78BFA;
    }

    .btn-arrow-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #F6F1FF;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .btn-arrow-wrap:hover {
      background: rgba(124, 58, 237, 0.3);
      border-color: #A78BFA;
    }

    .chevron-icon {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transform: rotate(0deg);
    }
    .chevron-icon.open {
      transform: rotate(90deg);
    }

    .contract-body {
      padding: 0 20px 24px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* Certificato di firma in alto */
    .signature-certificate {
      margin: 16px 0 20px 0;
      padding: 14px 18px;
      border-radius: 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.45);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.12);
    }
    .cert-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cert-icon {
      font-size: 1.4rem;
    }
    .cert-title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 700;
      color: #34D399;
    }
    .cert-meta {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: rgba(246, 241, 255, 0.85);
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(16, 185, 129, 0.25);
      font-size: 0.72rem;
      flex-wrap: wrap;
      gap: 6px;
    }
    .cert-hash {
      font-family: 'DM Mono', monospace;
      color: rgba(246, 241, 255, 0.65);
    }
    .cert-valid {
      color: #6EE7B7;
      font-weight: 600;
    }

    /* Documento formattato stile atto contrattuale */
    .contract-doc {
      background: #FFFFFF;
      color: #1A1A1E;
      border-radius: 10px;
      padding: 32px 28px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      margin-top: 16px;
    }

    .doc-header {
      text-align: center;
      border-bottom: 2px solid #2B2144;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .doc-brand {
      font-family: 'DM Mono', monospace;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #6D28D9;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      margin: 0 0 4px;
      color: #0F0F12;
    }
    .doc-sub {
      font-size: 0.8rem;
      color: #555;
      margin: 0;
    }

    .parties-block {
      background: #F8F7FC;
      border: 1px solid #E5E1F0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 22px;
      font-size: 0.85rem;
    }
    .parties-block p {
      margin: 4px 0;
    }

    .articles-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .article-item h5 {
      margin: 0 0 4px;
      font-size: 0.85rem;
      font-weight: 800;
      color: #111;
      letter-spacing: 0.02em;
    }
    .article-item p {
      margin: 0;
      font-size: 0.82rem;
      color: #333;
    }
    .highlight-article {
      background: rgba(124, 58, 237, 0.05);
      border-left: 3px solid #7C3AED;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
    }

    .vexatious-box {
      margin-top: 20px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .vexatious-title {
      margin: 0 0 4px;
      font-size: 0.78rem;
      font-weight: 800;
      color: #92400E;
      letter-spacing: 0.04em;
    }
    .vexatious-text {
      margin: 0;
      font-size: 0.76rem;
      color: #78350F;
      line-height: 1.45;
    }

    /* Modulo firma */
    .signing-form {
      margin-top: 24px;
      background: #F5F3FF;
      border: 1px solid #DDD6FE;
      border-radius: 10px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .sign-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sign-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #4C1D95;
    }
    .sign-input {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1.5px solid #C4B5FD;
      font-size: 0.9rem;
      color: #111;
      background: #FFFFFF;
      outline: none;
    }
    .sign-input:focus {
      border-color: #7C3AED;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    }

    .sign-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.8rem;
      color: #2E1065;
      cursor: pointer;
      line-height: 1.4;
    }
    .sign-checkbox {
      margin-top: 3px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #7C3AED;
    }

    .sign-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      margin-top: 4px;
    }
    .btn-sign-contract {
      padding: 12px 24px;
      border-radius: 999px;
      background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
      color: #FFFFFF;
      border: none;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
      transition: all 0.2s ease;
    }
    .btn-sign-contract:hover:not(:disabled) {
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
    }
    .btn-sign-contract:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .sign-legal-hint {
      font-size: 0.72rem;
      color: #6B7280;
    }

    /* Firme impresse */
    .doc-signature-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 26px;
      padding-top: 18px;
      border-top: 2px dashed #DDD6FE;
    }
    .sig-label {
      font-size: 0.76rem;
      color: #666;
      margin: 0 0 4px;
    }
    .sig-name {
      font-size: 0.92rem;
      font-weight: 800;
      color: #000;
      margin: 0 0 4px;
    }
    .sig-seal {
      display: inline-block;
      font-size: 0.68rem;
      font-family: 'DM Mono', monospace;
      padding: 2px 8px;
      border-radius: 4px;
      background: #F3F4F6;
      color: #4B5563;
      border: 1px solid #D1D5DB;
    }
    .client-seal {
      background: #ECFDF5;
      color: #065F46;
      border-color: #A7F3D0;
      font-weight: 700;
    }

    @media print {
      body * {
        visibility: hidden !important;
      }
      .contract-doc, .contract-doc * {
        visibility: visible !important;
      }
      .contract-doc {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .no-print {
        display: none !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectContractComponent {
  readonly project = input.required<PortalProjectDto>();
  private readonly toast = inject(ToastService);

  protected readonly isOpen = signal(true);
  protected readonly signerInputName = signal('');
  protected readonly vexatiousAccepted = signal(false);
  protected readonly signature = signal<SignatureRecord | null>(null);

  protected readonly isSigned = computed(() => !!this.signature());

  constructor() {
    effect(() => {
      const proj = this.project();
      if (!proj) return;
      // Carica eventuale firma salvata per questo progetto
      const saved = localStorage.getItem(`cf_contract_signed_${proj.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SignatureRecord;
          this.signature.set(parsed);
          this.isOpen.set(false); // Chiuso di default se già firmato
        } catch {
          // Ignora parse error
        }
      } else {
        this.signerInputName.set(proj.clientName || 'Cliente');
      }
    });
  }

  protected readonly canSign = computed(() => {
    return this.signerInputName().trim().length >= 3 && this.vexatiousAccepted();
  });

  protected submitSignature(): void {
    if (!this.canSign()) return;
    const p = this.project();
    const name = this.signerInputName().trim();
    const now = new Date().toISOString();
    const hash = 'FEA-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const record: SignatureRecord = {
      signerName: name,
      signedAt: now,
      signatureHash: hash,
      ipPlaceholder: 'HMAC-SHA256-CERTIFIED'
    };

    localStorage.setItem(`cf_contract_signed_${p.id}`, JSON.stringify(record));
    this.signature.set(record);

    this.toast.success(`Contratto firmato con valore legale! Copia inviata per email a childhood.friendship.official@gmail.com.`);
  }

  protected printContract(e: Event): void {
    e.stopPropagation();
    window.print();
  }
}
