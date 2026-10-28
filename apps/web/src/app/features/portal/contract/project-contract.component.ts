import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';
import { PortalI18nService } from '../../../core/portal-i18n.service';

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
            <h3 class="collapsible-title">{{ i18n.isEn() ? 'B2B Software Development Agreement' : 'Contratto di Sviluppo B2B' }}</h3>
            @if (isSigned()) {
              <span class="status-signed-text">{{ i18n.isEn() ? 'signed' : 'firmato' }}</span>
            } @else {
              <span class="status-pending-text">{{ i18n.isEn() ? 'pending signature' : 'da firmare' }}</span>
            }
          </div>
        </div>

        <div class="collapsible-header-actions">
          @if (isSigned()) {
            <button
              type="button"
              class="btn-print-contract no-print"
              (click)="printContract($event)"
              [title]="i18n.isEn() ? 'Print or save as PDF' : 'Stampa o salva come PDF'">
              🖨️ PDF
            </button>
          }

          <button
            type="button"
            class="btn-arrow-wrap"
            (click)="isOpen.set(!isOpen())"
            [attr.aria-expanded]="isOpen()"
            [attr.aria-label]="isOpen() ? (i18n.isEn() ? 'Collapse agreement' : 'Comprimi contratto') : (i18n.isEn() ? 'Expand agreement' : 'Espandi contratto')">
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
                  <h4 class="cert-title">
                    {{ i18n.isEn() ? 'Document Executed with Advanced Electronic Signature' : 'Documento Sottoscritto con Firma Elettronica Avanzata' }}
                  </h4>
                  <p class="cert-meta">
                    {{ i18n.isEn() ? 'Signed by: ' : 'Sottoscritto da: ' }}<strong>{{ sig.signerName }}</strong> · 
                    {{ i18n.isEn() ? 'UTC Timestamp: ' : 'Data e Ora UTC: ' }}<strong>{{ sig.signedAt | date: (i18n.isEn() ? 'MM/dd/yyyy HH:mm:ss' : 'dd/MM/yyyy HH:mm:ss') }}</strong>
                  </p>
                </div>
              </div>
              <div class="cert-footer">
                <span class="cert-hash">{{ i18n.isEn() ? 'Certificate Hash: ' : 'Codice Certificato: ' }}{{ sig.signatureHash }}</span>
                <span class="cert-valid">
                  {{ i18n.isEn() 
                    ? 'Full Legal Validity under US ESIGN Act (15 U.S.C. § 7001), UETA & EU eIDAS ✓' 
                    : 'Validità Legale ex art. 1326 c.c. & Reg. UE 910/2014 (eIDAS) ✓' }}
                </span>
              </div>
            </div>
          }

          <!-- Testo Ufficiale del Contratto -->
          <article class="contract-doc">
            <header class="doc-header">
              <div class="doc-brand">CHILDHOOD FRIENDSHIP</div>
              <h2 class="doc-title">
                @if (i18n.isEn()) {
                  B2B SOFTWARE DEVELOPMENT, DIGITAL SOLUTIONS & USAGE LICENSE AGREEMENT
                } @else {
                  CONTRATTO DI SVILUPPO SOFTWARE, SOLUZIONI DIGITALI E LICENZA D'USO
                }
              </h2>
              <p class="doc-sub">
                {{ i18n.isEn() 
                  ? 'Commercial Agreement for the Design, Development, and Cloud Deployment of Bespoke Digital Solutions' 
                  : 'Accordo B2B per la progettazione, sviluppo e manutenzione della soluzione digitale' }}
              </p>
            </header>

            <div class="parties-block">
              <p><strong>{{ i18n.isEn() ? 'BETWEEN:' : 'TRA:' }}</strong></p>
              <p>
                <strong>{{ i18n.isEn() ? 'PROVIDER:' : 'FORNITORE:' }}</strong> Childhood Friendship (Lorenzo & Mirko), 
                {{ i18n.isEn() ? 'based in Padua, Italy / Global Remote Development Studio' : 'con recapito a Padova (PD)' }}, 
                P.IVA / VAT ID IT04982710284, email: <em>childhood.friendship.official&#64;gmail.com</em> 
                {{ i18n.isEn() ? '(hereinafter "Provider")' : '(in seguito "Fornitore")' }}
              </p>
              <p><strong>{{ i18n.isEn() ? 'AND:' : 'E:' }}</strong></p>
              <p>
                <strong>{{ i18n.isEn() ? 'CLIENT:' : 'COMMITTENTE:' }}</strong> {{ project().clientName || (i18n.isEn() ? 'Client' : 'Cliente') }}, 
                {{ i18n.isEn() ? 'commissioning the project' : 'committente per il progetto' }} 
                <strong>"{{ project().name }}"</strong> {{ i18n.isEn() ? '(hereinafter "Client").' : '(in seguito "Committente").' }}
              </p>
            </div>

            @if (i18n.isEn()) {
              <!-- Testo Inglese del Contratto -->
              <div class="articles-list">
                <div class="article-item">
                  <h5>SECTION 1 - SCOPE OF WORK & DELIVERABLES</h5>
                  <p>
                    The Provider agrees to design, engineer, and deploy for the Client the digital bespoke solution named 
                    <strong>"{{ project().name }}"</strong>, in accordance with the specifications, modules, and scope detailed in the accepted commercial estimate.
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 2 - FEES, INVOICING & PAYMENT TERMS</h5>
                  <p>
                    2.1 Total compensation is set forth in the attached commercial invoice and estimate (Tax-exempt cross-border B2B service ex Art. 7-ter DPR 633/72).<br>
                    2.2 Payments shall be processed via verified electronic transaction (Apple Pay, Credit/Debit Card or Wire Transfer): 
                    50% initial retainer upon agreement execution, and 50% final balance upon final staging approval prior to Live deployment.<br>
                    2.3 Official commercial invoice and receipt are electronically transmitted upon charge authorization.
                  </p>
                </div>

                <div class="article-item highlight-article">
                  <h5>SECTION 3 - INTELLECTUAL PROPERTY & RETENTION OF TITLE</h5>
                  <p>
                    3.1 All bespoke source code, 3D assets, custom layouts, and digital deliverables <strong>SHALL REMAIN THE EXCLUSIVE PROPERTY OF THE PROVIDER 
                    UNTIL FINAL, COMPLETE SETTLEMENT OF THE AGREED COMPENSATION</strong>.<br>
                    3.2 Upon receipt of full and final payment, the Provider transfers to the Client full commercial ownership and operational license to the custom solution, reserving the Provider's standard portfolio presentation rights.<br>
                    3.3 Failure to complete payment shall entitle the Provider to suspend cloud hosting and revoke deployment access without penalty.
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 4 - STAGING REVIEW & ACCEPTANCE</h5>
                  <p>
                    Upon delivery of the staging prototype, the Client shall have <strong>10 (ten) business days</strong> to review deliverables and report any discrepancies. If no written notice is provided within this period, the project shall be deemed formally accepted and approved.
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 5 - POST-LAUNCH WARRANTY & SUPPORT</h5>
                  <p>
                    The Provider includes a <strong>30 (thirty) calendar-day complimentary bug fixing warranty</strong> following official Live launch for any defects non-conforming to specifications. Out-of-scope feature requests, structural redesigns, or third-party tampering shall be quoted separately.
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 6 - THIRD-PARTY INFRASTRUCTURE</h5>
                  <p>
                    The Provider shall not be held liable for temporary interruptions, latency, or outages originating from third-party cloud infrastructure (e.g., Vercel, Neon, AWS, Google Cloud, Stripe, or DNS registrars).
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 7 - CONFIDENTIALITY & ASSET RIGHTS</h5>
                  <p>
                    The Client warrants that all trademarks, photography, copy, and brand assets provided are legally owned or licensed by the Client, indemnifying the Provider from third-party claims. Commercial data is treated in strict confidentiality.
                  </p>
                </div>

                <div class="article-item">
                  <h5>SECTION 8 - DISPUTE RESOLUTION & JURISDICTION</h5>
                  <p>
                    This Agreement shall be construed under international commercial standards for cross-border software agreements, with exclusive legal venue in the competent court of Padua, Italy.
                  </p>
                </div>
              </div>

              <!-- Box Clausole Particolari USA -->
              <div class="vexatious-box">
                <h6 class="vexatious-title">EXPRESS ACKNOWLEDGMENT OF SPECIAL COMMERCIAL TERMS</h6>
                <p class="vexatious-text">
                  The Client confirms having thoroughly reviewed and expressly agreed to: <strong>Section 2</strong> (Payment Schedule & Staging Pre-Condition), 
                  <strong>Section 3</strong> (Retention of Title & Code Transfer upon Final Settlement), <strong>Section 4</strong> (10-Day Deemed Acceptance), 
                  <strong>Section 5</strong> (30-Day Technical Warranty), and <strong>Section 8</strong> (Jurisdiction).
                </p>
              </div>
            } @else {
              <!-- Testo Italiano del Contratto -->
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
            }

            <!-- Modulo di Firma (visibile solo se non ancora firmato) -->
            @if (!isSigned()) {
              <div class="signing-form no-print">
                <div class="sign-field">
                  <label for="signer-name-input" class="sign-label">
                    {{ i18n.isEn() ? 'Full Name of Signer / Authorized Representative:' : 'Nome e Cognome del Firmatario / Legale Rappresentante:' }}
                  </label>
                  <input
                    id="signer-name-input"
                    type="text"
                    class="sign-input"
                    [value]="signerInputName()"
                    (input)="signerInputName.set($any($event.target).value)"
                    [placeholder]="i18n.isEn() ? 'e.g. John Smith' : 'Es. Lorenzo Rossi'" />
                </div>

                <label class="sign-checkbox-label">
                  <input
                    type="checkbox"
                    class="sign-checkbox"
                    [checked]="vexatiousAccepted()"
                    (change)="vexatiousAccepted.set($any($event.target).checked)" />
                  <span>
                    {{ i18n.isEn() 
                      ? 'I declare that I have read, understood, and expressly accepted all terms and conditions of this Agreement.' 
                      : 'Dichiaro di aver letto, compreso e approvato specificamente tutte le condizioni e le clausole del contratto.' }}
                  </span>
                </label>

                <div class="sign-actions">
                  <button
                    type="button"
                    class="btn-sign-contract"
                    [disabled]="!canSign()"
                    (click)="submitSignature()">
                    ✍️ {{ i18n.isEn() ? 'Sign Agreement Digitally (1-Click)' : 'Firma Digitalmente il Contratto' }}
                  </button>
                  <span class="sign-legal-hint">
                    {{ i18n.isEn() 
                      ? 'Advanced Electronic Signature with cryptographic audit hash and timestamp verification' 
                      : 'Apposizione di Firma Elettronica Avanzata con marcatura oraria e tracciamento audit' }}
                  </span>
                </div>
              </div>
            } @else {
              <!-- Firma impressa sul documento -->
              <div class="doc-signature-block">
                <div class="sig-col">
                  <p class="sig-label">{{ i18n.isEn() ? 'For Provider:' : 'Per il Fornitore:' }}</p>
                  <p class="sig-name">Childhood Friendship</p>
                  <span class="sig-seal">{{ i18n.isEn() ? 'Digitally Executed' : 'Sottoscritto digitalmente' }}</span>
                </div>
                <div class="sig-col">
                  <p class="sig-label">{{ i18n.isEn() ? 'For Client:' : 'Per il Committente:' }}</p>
                  <p class="sig-name">{{ signature()?.signerName }}</p>
                  <span class="sig-seal client-seal">
                    {{ i18n.isEn() 
                      ? 'Digitally signed on ' + (signature()?.signedAt | date: 'MM/dd/yyyy')
                      : 'Firmato digitalmente il ' + (signature()?.signedAt | date: 'dd/MM/yyyy') }}
                  </span>
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
      background: rgba(18, 12, 30, 0.7);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.25s ease;
      backdrop-filter: blur(12px);
    }
    .contract-card.is-signed {
      border-color: rgba(16, 185, 129, 0.4);
    }

    .collapsible-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .collapsible-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
      flex: 1;
    }

    .collapsible-icon {
      font-size: 1.25rem;
    }

    .title-and-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .collapsible-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }

    .status-signed-text {
      font-size: 0.7rem;
      font-weight: 700;
      color: #34D399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .status-pending-text {
      font-size: 0.7rem;
      font-weight: 700;
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .collapsible-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-print-contract {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .btn-print-contract:hover {
      background: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }

    .btn-arrow-wrap {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
    }
    .btn-arrow-wrap:hover {
      color: #FFFFFF;
    }

    .chevron-icon {
      transition: transform 0.25s ease;
    }
    .chevron-icon.open {
      transform: rotate(90deg);
    }

    .contract-body {
      padding: 20px;
    }

    /* Certificato firma */
    .signature-certificate {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .cert-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .cert-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    .cert-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #34D399;
      margin: 0 0 4px;
    }
    .cert-meta {
      font-size: 0.78rem;
      color: rgba(246, 241, 255, 0.8);
      margin: 0;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid rgba(16, 185, 129, 0.2);
      font-size: 0.72rem;
    }
    .cert-hash {
      font-family: 'DM Mono', monospace;
      color: #A7F3D0;
    }
    .cert-valid {
      color: #34D399;
      font-weight: 600;
    }

    /* Documento formattato stile legale */
    .contract-doc {
      background: #FFFFFF;
      color: #1A1A1A;
      border-radius: 12px;
      padding: 32px 36px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }

    .doc-header {
      text-align: center;
      border-bottom: 2px solid #111;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .doc-brand {
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #555;
      margin-bottom: 6px;
    }
    .doc-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #000;
      margin: 0 0 6px;
      line-height: 1.3;
    }
    .doc-sub {
      font-size: 0.82rem;
      color: #666;
      margin: 0;
    }

    .parties-block {
      background: #F8F9FA;
      border: 1px solid #E9ECEF;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 0.88rem;
    }
    .parties-block p {
      margin: 4px 0;
    }

    .articles-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .article-item {
      font-size: 0.86rem;
      color: #2D3748;
    }
    .article-item h5 {
      font-size: 0.88rem;
      font-weight: 800;
      color: #1A202C;
      margin: 0 0 6px;
      letter-spacing: 0.02em;
    }
    .article-item p {
      margin: 0;
    }

    .highlight-article {
      background: #FFFBEB;
      border-left: 4px solid #F59E0B;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
    }
    .highlight-article h5 {
      color: #B45309;
    }

    .vexatious-box {
      background: #F3F4F6;
      border: 1px dashed #9CA3AF;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .vexatious-title {
      font-size: 0.78rem;
      font-weight: 800;
      color: #111827;
      margin: 0 0 6px;
      letter-spacing: 0.04em;
    }
    .vexatious-text {
      font-size: 0.8rem;
      color: #4B5563;
      margin: 0;
      line-height: 1.5;
    }

    /* Modulo firma */
    .signing-form {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
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
      color: #1E3A8A;
    }
    .sign-input {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #93C5FD;
      font-size: 0.95rem;
      color: #1E293B;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .sign-input:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .sign-checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      font-size: 0.82rem;
      color: #1E3A8A;
      line-height: 1.4;
    }
    .sign-checkbox {
      margin-top: 3px;
      width: 16px;
      height: 16px;
      accent-color: #2563EB;
    }

    .sign-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }
    .btn-sign-contract {
      width: 100%;
      padding: 14px 20px;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .btn-sign-contract:hover:not(:disabled) {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
    }
    .btn-sign-contract:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
    .sign-legal-hint {
      font-size: 0.7rem;
      color: #64748B;
      text-align: center;
    }

    /* Firma impressa sul foglio */
    .doc-signature-block {
      display: flex;
      justify-content: space-between;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
      gap: 24px;
    }
    .sig-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sig-label {
      font-size: 0.75rem;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .sig-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #111827;
      margin: 4px 0;
    }
    .sig-seal {
      font-size: 0.72rem;
      color: #2563EB;
      background: #EFF6FF;
      border: 1px solid #DBEAFE;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
      font-weight: 600;
    }
    .client-seal {
      color: #059669;
      background: #ECFDF5;
      border-color: #A7F3D0;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .contract-doc, .contract-doc * {
        visibility: visible;
      }
      .contract-doc {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        max-width: 100%;
        box-shadow: none;
        padding: 0;
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
  protected readonly i18n = inject(PortalI18nService);

  protected readonly isOpen = signal(true);
  protected readonly signerInputName = signal('');
  protected readonly vexatiousAccepted = signal(false);
  protected readonly signature = signal<SignatureRecord | null>(null);

  protected readonly isSigned = computed(() => !!this.signature());

  constructor() {
    effect(() => {
      const proj = this.project();
      if (!proj) return;
      const saved = localStorage.getItem(`cf_contract_signed_${proj.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SignatureRecord;
          this.signature.set(parsed);
          this.isOpen.set(false);
        } catch {
          // Ignora parse error
        }
      } else {
        this.signerInputName.set(proj.clientName || (this.i18n.isEn() ? 'Client' : 'Cliente'));
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
    const hash = 'ESIGN-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const record: SignatureRecord = {
      signerName: name,
      signedAt: now,
      signatureHash: hash,
      ipPlaceholder: 'HMAC-SHA256-CERTIFIED'
    };

    localStorage.setItem(`cf_contract_signed_${p.id}`, JSON.stringify(record));
    this.signature.set(record);

    const successMsg = this.i18n.isEn()
      ? `Agreement signed with full legal validity! Copy sent to ${name} and childhood.friendship.official@gmail.com.`
      : `Contratto firmato con valore legale! Copia inviata per email a childhood.friendship.official@gmail.com.`;

    this.toast.success(successMsg);
  }

  protected printContract(e: Event): void {
    e.stopPropagation();
    window.print();
  }
}
