import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';
import { PortalI18nService } from '../../../core/portal-i18n.service';

interface DisplayReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
}

@Component({
  selector: 'cf-quote-receipt',
  imports: [DatePipe],
  template: `
    <section class="collapsible-card receipt-card">
      <!-- Header della Card Scontrino / Ricevuta Fiscale -->
      <div class="collapsible-header">
        <div
          class="collapsible-title-wrap"
          (click)="isOpen.set(!isOpen())"
          role="button"
          tabindex="0"
          [attr.aria-expanded]="isOpen()">
          <span class="collapsible-icon">🧾</span>
          <div class="title-and-badge">
            <h3 class="collapsible-title">
              {{ i18n.isEn() ? 'Commercial Invoice & Tax Receipt' : 'Documento Fiscale B2B / Ricevuta SDI' }}
            </h3>
            <span class="status-fiscal-text">
              {{ i18n.isEn() ? 'Invoice n. ' + receiptDocNumber() : 'Doc. SDI ' + receiptDocNumber() }}
            </span>
          </div>
        </div>

        <div class="collapsible-header-actions">
          @if (i18n.isEn()) {
            <button
              type="button"
              class="btn-w8ben-trigger no-print"
              (click)="showW8BenModal.set(true); $event.stopPropagation()"
              title="View US Tax Exemption Certificate (IRS Form W-8BEN-E)">
              🏛️ Form W-8BEN-E
            </button>
          }
          <button
            type="button"
            class="btn-print-receipt no-print"
            (click)="printReceipt($event)"
            [title]="i18n.isEn() ? 'Print or save invoice as PDF' : 'Stampa o salva come PDF'">
            🖨️ PDF
          </button>
          <button
            type="button"
            class="btn-arrow-wrap"
            (click)="isOpen.set(!isOpen())"
            [attr.aria-expanded]="isOpen()"
            [attr.aria-label]="isOpen() ? (i18n.isEn() ? 'Collapse receipt' : 'Comprimi scontrino') : (i18n.isEn() ? 'Expand receipt' : 'Espandi scontrino')">
            <svg class="chevron-icon" [class.open]="isOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- Scontrino Fisico (espandibile) -->
      @if (isOpen()) {
        <div class="collapsible-body receipt-body">
          <div class="receipt-container">
            <!-- Scontrino termico fedele alla copia fisica -->
            <article class="receipt">
              <!-- Taglio carta dentellato superiore -->
              <div class="tear-edge tear-top" aria-hidden="true"></div>

        <!-- Header Azienda -->
        <header class="receipt-header">
          <h2 class="store-name">CHILDHOOD FRIENDSHIP</h2>
          <p class="store-sub">{{ i18n.isEn() ? 'DIGITAL PRODUCT STUDIO & CREATIVE ENGINEERING' : 'STUDIO SVILUPPO SOFTWARE & SOLUZIONI DIGITALI' }}</p>
          <p class="store-info">VIA ROMA 99</p>
          <p class="store-info">{{ i18n.isEn() ? '35122 PADOVA (PD) - ITALY / GLOBAL REMOTE' : '35122 PADOVA (PD) - VENETO' }}</p>
          <p class="store-info">P.IVA / VAT ID IT04982710284</p>
          <p class="store-info">Tel. +39 380 8970829</p>
          <p class="store-info">childhood.friendship.official&#64;gmail.com</p>
        </header>

        <div class="dashed-line" aria-hidden="true"></div>

        <!-- Intestazione Commerciale / Fiscale B2B -->
        <div class="receipt-type">
          <strong class="mode-title">{{ i18n.isEn() ? 'COMMERCIAL INVOICE & TAX RECEIPT' : 'DOCUMENTO COMMERCIALE B2B' }}</strong>
          <span class="mode-sub">{{ i18n.isEn() ? 'B2B BESPOKE SOFTWARE ENGINEERING & DIGITAL SOLUTIONS' : 'RICEVUTA DI PRESTAZIONE E SVILUPPO SOFTWARE' }}</span>
          <span class="mode-desc">
            {{ i18n.isEn() 
              ? 'Tax-exempt cross-border B2B service (EU-US) ex Art. 7-ter DPR 633/72 (0% VAT - Reverse Charge)' 
              : 'Operazione soggetta a Fattura Elettronica SDI' }}
          </span>
        </div>

        <!-- Tabella Voci Preventivo Reali del Progetto -->
        <div class="items-table">
          <div class="table-header">
            <span class="col-desc">{{ i18n.isEn() ? 'DESCRIPTION' : 'DESCRIZIONE' }}</span>
            <span class="col-vat">{{ i18n.isEn() ? 'TAX' : 'IVA' }}</span>
            <span class="col-price">{{ i18n.isEn() ? 'PRICE ($)' : 'PREZZO (€)' }}</span>
          </div>

          <div class="table-body">
            @for (item of displayItems(); track $index) {
              <div class="item-block">
                <div class="item-row">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-vat">{{ item.vatRate }}%</span>
                  <span class="item-price">{{ formatMoney(item.totalPrice) }}</span>
                </div>
                <div class="item-meta">
                  {{ i18n.isEn() ? 'QTY' : 'PZ' }} {{ item.quantity }} - {{ formatMoney(item.unitPrice) }}
                </div>
              </div>
            }
          </div>
        </div>

        <div class="dashed-line" aria-hidden="true"></div>

        <!-- Riepilogo Totali -->
        <div class="totals-section">
          <div class="total-row main-total">
            <span class="total-label">{{ i18n.isEn() ? 'TOTAL AMOUNT' : 'TOTALE COMPLESSIVO' }}</span>
            <span class="total-val">{{ formatMoney(totalWithVat()) }}</span>
          </div>
          <div class="total-row vat-row">
            <span class="total-label">{{ i18n.isEn() ? 'Tax (0% US B2B)' : 'di cui IVA (22%)' }}</span>
            <span class="total-val">{{ formatMoney(vatAmount()) }}</span>
          </div>
          <div class="total-row">
            <span class="total-label">{{ i18n.isEn() ? 'Electronic (Apple Pay / Card)' : 'Elettronico' }}</span>
            <span class="total-val">{{ formatMoney(totalWithVat()) }}</span>
          </div>
          <div class="total-row">
            <span class="total-label">
              {{ isFullyPaid() 
                ? (i18n.isEn() ? 'Amount Paid (100% Settled ✓)' : 'Importo pagato (Saldato 100% ✓)') 
                : (alreadyPaid() > 0 
                  ? (i18n.isEn() ? 'Amount Paid (Tranche 1/2: 50% Retainer ✓)' : 'Importo pagato (Tranche 1/2: Acconto 50% ✓)')
                  : (i18n.isEn() ? 'Amount Paid (Pending)' : 'Importo pagato (In attesa)')) }}
            </span>
            <span class="total-val">{{ formatMoney(alreadyPaid()) }}</span>
          </div>
          @if (!isFullyPaid()) {
            <div class="total-row">
              <span class="total-label">
                {{ i18n.isEn() 
                  ? (alreadyPaid() > 0 ? 'Balance Due (Tranche 2/2 Due on Delivery)' : 'Balance Due (Due: ' + deadlineFormatted() + ')') 
                  : (alreadyPaid() > 0 ? 'Residuo a Consegna (Tranche 2/2)' : 'Residuo da versare (Scad. ' + deadlineFormatted() + ')') }}
              </span>
              <span class="total-val">{{ formatMoney(remainingToPay()) }}</span>
            </div>
          }
        </div>

        <!-- Dati Documento & Data -->
        <div class="doc-meta">
          <div class="meta-line">{{ receiptDate() | date: (i18n.isEn() ? 'MM/dd/yyyy HH:mm' : 'dd/MM/yyyy HH:mm') }}</div>
          <div class="meta-line">{{ i18n.isEn() ? 'Invoice n. ' : 'Documento n. ' }}{{ receiptDocNumber() }}</div>
        </div>

        <!-- Note e Info Fiscali SDI -->
        <div class="notes-section">
          <strong class="notes-title">{{ i18n.isEn() ? 'Commercial & Tax Details:' : 'Dati Fiscali & SDI:' }}</strong>
          <span class="notes-subtitle">{{ i18n.isEn() ? 'Notes:' : 'Note:' }}</span>
          <p class="notes-text">
            {{ i18n.isEn() ? 'Project: ' : 'Progetto: ' }}{{ project().name }}<br>
            {{ i18n.isEn() 
              ? 'Bespoke 3D web application, software license & SSL cloud deployment.' 
              : 'Sviluppo software su misura, licenza e architettura cloud SSL.' }}<br>
            {{ i18n.isEn() 
              ? 'Electronic invoice and receipt delivered to client email.' 
              : 'Fattura elettronica SDI trasmessa all\'Agenzia delle Entrate.' }}<br>
            {{ i18n.isEn() 
              ? 'Tracked payment: Electronic Transaction (Apple Pay / Credit Card via Stripe)' 
              : 'Pagamento tracciato: Transazione Elettronica (Apple Pay / Carta)' }}
          </p>
        </div>

        <!-- Ringraziamento -->
        <div class="thank-you">
          {{ i18n.isEn() ? 'THANK YOU FOR YOUR BUSINESS' : 'GRAZIE PER LA COLLABORAZIONE' }}
        </div>

        <!-- Codice a Barre Realistico -->
        <div class="barcode-wrap" aria-hidden="true">
          <div class="barcode-lines">
            @for (bar of barcodeBars; track $index) {
              <span [style.width.px]="bar.w" [style.margin-right.px]="bar.g"></span>
            }
          </div>
          <div class="barcode-number">*{{ barcodeCode() }}*</div>
        </div>

        <!-- Taglio carta dentellato inferiore -->
        <div class="tear-edge tear-bottom" aria-hidden="true"></div>
      </article>
    </div>
  </div>
}

      <!-- MODALE UFFICIALE IRS FORM W-8BEN-E (Certificate of Foreign Status) -->
      @if (showW8BenModal()) {
        <div class="w8ben-backdrop animate-fade-in" (click)="showW8BenModal.set(false)">
          <div class="w8ben-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="w8ben-title">
            <header class="w8ben-header">
              <div class="w8ben-title-badge">
                <span class="irs-seal">🏛️</span>
                <div>
                  <h3 id="w8ben-title" class="w8ben-h3">IRS Form W-8BEN-E</h3>
                  <p class="w8ben-subtitle">Certificate of Status of Beneficial Owner for United States Tax Withholding and Reporting</p>
                </div>
              </div>
              <button type="button" class="btn-close-w8ben" (click)="showW8BenModal.set(false)" aria-label="Close modal">✕</button>
            </header>

            <div class="w8ben-body">
              <div class="w8ben-alert">
                <strong>US Tax Exemption Verified:</strong> Childhood Friendship is an Italian independent product studio with zero permanent establishment in the United States. Under Article 7 (Business Profits) of the US-Italy Tax Convention, payments for software engineering and digital services are subject to <strong>0% US federal tax withholding</strong>.
              </div>

              <div class="w8ben-grid">
                <div class="w8ben-field">
                  <span class="w8ben-label">1. Name of Organization</span>
                  <span class="w8ben-val font-mono">Childhood Friendship (Studio Sviluppo Software)</span>
                </div>
                <div class="w8ben-field">
                  <span class="w8ben-label">2. Country of Incorporation</span>
                  <span class="w8ben-val">Italy (European Union)</span>
                </div>
                <div class="w8ben-field">
                  <span class="w8ben-label">4. Chapter 3 Status</span>
                  <span class="w8ben-val">Active NFFE / Foreign Service Provider</span>
                </div>
                <div class="w8ben-field">
                  <span class="w8ben-label">5. Chapter 4 Status (FATCA)</span>
                  <span class="w8ben-val">Active NFFE (Section 1472)</span>
                </div>
                <div class="w8ben-field full-width">
                  <span class="w8ben-label">6. Permanent Residence Address</span>
                  <span class="w8ben-val">Via Roma 99, 35122 Padova (PD), Italy</span>
                </div>
                <div class="w8ben-field">
                  <span class="w8ben-label">9b. Foreign Tax Identifying Number (TIN)</span>
                  <span class="w8ben-val font-mono">IT04982710284</span>
                </div>
                <div class="w8ben-field">
                  <span class="w8ben-label">Reference Number (Project Scope)</span>
                  <span class="w8ben-val font-mono">{{ project().id.slice(0, 13).toUpperCase() }}</span>
                </div>
              </div>

              <div class="w8ben-section-box">
                <h5 class="w8ben-box-title">Part III - Claim of Tax Treaty Benefits</h5>
                <p class="w8ben-box-text">
                  The beneficial owner certifies that it is a resident of <strong>Italy</strong> within the meaning of the income tax treaty between the United States and Italy. The beneficial owner meets the conditions of <strong>Article 7 (Business Profits)</strong> to claim a <strong>0% rate of withholding</strong> on payments received for cross-border software architecture and bespoke platform design.
                </p>
              </div>

              <div class="w8ben-cert-signature">
                <div class="sig-seal-box">
                  <span class="seal-icon">✓</span>
                  <div>
                    <strong class="seal-title">Under Penalties of Perjury Certified</strong>
                    <span class="seal-desc">Electronically certified and filed for cross-border client compliance.</span>
                  </div>
                </div>
                <div class="sig-date-box">
                  <span class="sig-date-label">Certified Date:</span>
                  <span class="sig-date-val font-mono">{{ receiptDate() | date: 'MM/dd/yyyy' }}</span>
                </div>
              </div>
            </div>

            <footer class="w8ben-footer no-print">
              <button type="button" class="btn-print-w8ben" (click)="printReceipt()">
                🖨️ Print / Save as PDF
              </button>
              <button type="button" class="btn-done-w8ben" (click)="showW8BenModal.set(false)">
                Done
              </button>
            </footer>
          </div>
        </div>
      }
</section>
`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .receipt-card {
      background: rgba(18, 12, 30, 0.7);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.25s ease;
      backdrop-filter: blur(12px);
      width: 100%;
    }

    .collapsible-header {
      padding: 14px 18px;
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
      min-width: 0;
    }

    .collapsible-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .title-and-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .collapsible-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
    }

    .status-fiscal-text {
      font-size: 0.68rem;
      font-weight: 700;
      color: #A78BFA;
      background: rgba(167, 139, 250, 0.14);
      border: 1px solid rgba(167, 139, 250, 0.35);
      padding: 2px 7px;
      border-radius: 999px;
      letter-spacing: 0.03em;
    }

    .collapsible-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .total-quick-pill {
      font-size: 0.82rem;
      font-weight: 800;
      color: #34D399;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 8px;
      border-radius: 8px;
    }

    .btn-print-receipt {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #FFFFFF;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-print-receipt:hover {
      background: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }

    .btn-w8ben-trigger {
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.38);
      color: #34D399;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.74rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .btn-w8ben-trigger:hover {
      background: rgba(16, 185, 129, 0.25);
      border-color: #10B981;
      color: #FFFFFF;
      transform: translateY(-1px);
    }

    /* Modale W-8BEN-E */
    .w8ben-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .w8ben-modal {
      background: #0E091B;
      border: 1px solid rgba(124, 58, 237, 0.35);
      border-radius: 20px;
      max-width: 640px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(16, 185, 129, 0.15);
      overflow: hidden;
      animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .w8ben-header {
      padding: 18px 22px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .w8ben-title-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .irs-seal {
      font-size: 1.8rem;
    }
    .w8ben-h3 {
      font-size: 1.1rem;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .w8ben-subtitle {
      font-size: 0.72rem;
      color: rgba(226, 232, 240, 0.65);
      margin: 2px 0 0;
    }
    .btn-close-w8ben {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #E2E8F0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-close-w8ben:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: #EF4444;
      color: #FFFFFF;
    }
    .w8ben-body {
      padding: 22px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .w8ben-alert {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #D1FAE5;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.8rem;
      line-height: 1.5;
    }
    .w8ben-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .w8ben-field {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 10px 12px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .w8ben-field.full-width {
      grid-column: 1 / -1;
    }
    .w8ben-label {
      font-size: 0.66rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(226, 232, 240, 0.5);
    }
    .w8ben-val {
      font-size: 0.85rem;
      font-weight: 600;
      color: #FFFFFF;
    }
    .w8ben-section-box {
      background: rgba(124, 58, 237, 0.08);
      border: 1px solid rgba(124, 58, 237, 0.25);
      padding: 14px 16px;
      border-radius: 12px;
    }
    .w8ben-box-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #DDD6FE;
      margin: 0 0 6px;
    }
    .w8ben-box-text {
      font-size: 0.78rem;
      color: rgba(226, 232, 240, 0.8);
      line-height: 1.5;
      margin: 0;
    }
    .w8ben-cert-signature {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 16px;
      border-radius: 12px;
    }
    .sig-seal-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .seal-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #10B981;
      color: #042F1A;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
    }
    .seal-title {
      display: block;
      font-size: 0.82rem;
      color: #FFFFFF;
    }
    .seal-desc {
      display: block;
      font-size: 0.7rem;
      color: rgba(226, 232, 240, 0.6);
    }
    .sig-date-box {
      text-align: right;
    }
    .sig-date-label {
      display: block;
      font-size: 0.66rem;
      color: rgba(226, 232, 240, 0.5);
    }
    .sig-date-val {
      font-size: 0.84rem;
      color: #34D399;
      font-weight: 700;
    }
    .w8ben-footer {
      padding: 14px 22px;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-print-w8ben {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #FFFFFF;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-done-w8ben {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border: none;
      color: #FFFFFF;
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-arrow-wrap {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #DDD6FE;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-arrow-wrap:hover {
      background: rgba(167, 139, 250, 0.2);
      color: #FFFFFF;
    }

    .chevron-icon {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transform: rotate(90deg);
    }
    .chevron-icon.open {
      transform: rotate(-90deg);
    }

    .receipt-body {
      display: flex;
      justify-content: center;
      padding: 24px 16px;
    }

    /* Anteprima ridotta */
    .collapsed-summary-card {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .collapsed-summary-card:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .summary-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .summary-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
      flex-shrink: 0;
    }
    .summary-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .summary-meta strong {
      font-size: 0.88rem;
      color: #FFFFFF;
    }
    .summary-meta span {
      font-size: 0.74rem;
      color: rgba(255, 255, 255, 0.55);
    }
    .summary-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }
    .summary-total {
      font-size: 1rem;
      font-weight: 800;
      color: #34D399;
    }
    .summary-hint {
      font-size: 0.72rem;
      color: #A78BFA;
      font-weight: 600;
    }

    .receipt-container {
      display: flex;
      justify-content: center;
      padding: 10px 0;
      width: 100%;
    }

    .receipt {
      background: #FFFFFF;
      color: #121212;
      width: 100%;
      max-width: 400px;
      padding: 24px 22px 28px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
      position: relative;
      font-family: 'DM Mono', monospace, 'Courier New', Courier;
      font-size: 0.82rem;
      line-height: 1.35;
      letter-spacing: -0.01em;
      filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.3));
    }

    .tear-edge {
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      background-size: 12px 6px;
      background-repeat: repeat-x;
    }
    .tear-top {
      top: -6px;
      background-image: radial-gradient(circle at 6px 6px, transparent 6px, #FFFFFF 6px);
    }
    .tear-bottom {
      bottom: -6px;
      background-image: radial-gradient(circle at 6px 0, transparent 6px, #FFFFFF 6px);
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .store-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0 0 4px;
      color: #000;
    }
    .store-sub {
      font-size: 0.68rem;
      font-weight: 700;
      color: #444;
      margin: 0 0 6px;
      letter-spacing: 0.04em;
    }
    .store-info {
      font-size: 0.72rem;
      color: #333;
      margin: 1px 0;
    }

    .dashed-line {
      border-top: 1px dashed #777;
      margin: 14px 0;
    }

    .receipt-type {
      text-align: center;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mode-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: #000;
    }
    .mode-sub {
      font-size: 0.7rem;
      font-weight: 700;
      color: #333;
    }
    .mode-desc {
      font-size: 0.64rem;
      color: #666;
      font-style: italic;
    }

    .items-table {
      margin-bottom: 14px;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      font-size: 0.72rem;
      border-bottom: 1px solid #222;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .col-desc { flex: 1; text-align: left; }
    .col-vat { width: 44px; text-align: center; }
    .col-price { width: 70px; text-align: right; }

    .item-block {
      margin-bottom: 6px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .item-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-right: 6px;
    }
    .item-vat {
      width: 44px;
      text-align: center;
      font-size: 0.75rem;
      color: #555;
    }
    .item-price {
      width: 70px;
      text-align: right;
      font-weight: 700;
    }
    .item-meta {
      font-size: 0.68rem;
      color: #666;
    }

    .totals-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .main-total {
      font-size: 1.05rem;
      font-weight: 800;
      border-top: 1px solid #111;
      border-bottom: 1px solid #111;
      padding: 6px 0;
      margin: 4px 0 6px;
    }
    .vat-row {
      font-size: 0.75rem;
      color: #555;
    }

    .doc-meta {
      font-size: 0.7rem;
      color: #555;
      text-align: center;
      margin-bottom: 14px;
      border-top: 1px dashed #999;
      padding-top: 8px;
    }

    .notes-section {
      background: #F7F7F7;
      border: 1px solid #E0E0E0;
      padding: 8px 10px;
      margin-bottom: 14px;
      font-size: 0.68rem;
    }
    .notes-title {
      display: block;
      color: #000;
      font-weight: 800;
      margin-bottom: 2px;
    }
    .notes-subtitle {
      color: #555;
      font-weight: 700;
    }
    .notes-text {
      margin: 4px 0 0;
      color: #444;
      line-height: 1.35;
    }

    .thank-you {
      text-align: center;
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }

    .barcode-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .barcode-lines {
      display: flex;
      align-items: stretch;
      height: 48px;
      background: #000;
      padding: 0;
    }
    .barcode-lines span {
      background: #FFF;
      display: block;
      height: 100%;
    }
    .barcode-number {
      font-size: 0.78rem;
      letter-spacing: 0.15em;
      font-weight: 600;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .receipt, .receipt * {
        visibility: visible;
      }
      .receipt {
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
export class QuoteReceiptComponent {
  readonly project = input.required<PortalProjectDto>();
  readonly isOpen = signal(false);
  protected readonly showW8BenModal = signal(false);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly localPaidOverride = signal<number | null>(null);

  constructor() {
    effect(() => {
      const proj = this.project();
      if (!proj || typeof window === 'undefined') return;
      const check = () => {
        const saved = localStorage.getItem(`cf_paid_override_${proj.id}`);
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val)) this.localPaidOverride.set(val);
        }
      };
      check();
      window.addEventListener('storage', check);
    });
  }

  protected readonly barcodeBars = [
    { w: 3, g: 2 }, { w: 1, g: 3 }, { w: 2, g: 1 }, { w: 4, g: 2 },
    { w: 1, g: 2 }, { w: 3, g: 1 }, { w: 2, g: 3 }, { w: 1, g: 1 },
    { w: 4, g: 2 }, { w: 2, g: 2 }, { w: 1, g: 3 }, { w: 3, g: 1 },
    { w: 2, g: 2 }, { w: 4, g: 1 }, { w: 1, g: 2 }, { w: 3, g: 3 },
    { w: 2, g: 1 }, { w: 1, g: 2 }, { w: 4, g: 2 }, { w: 2, g: 1 },
    { w: 3, g: 2 }, { w: 1, g: 1 }, { w: 2, g: 3 }, { w: 3, g: 2 }
  ];

  protected readonly deadlineFormatted = computed(() => {
    const p = this.project();
    const deadlineToUse = p.paymentDeadline || p.deadline;
    const locale = this.i18n.isEn() ? 'en-US' : 'it-IT';
    if (deadlineToUse) {
      try {
        const d = new Date(deadlineToUse);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {
        return deadlineToUse;
      }
    }
    return this.i18n.isEn() ? '11/30/2026' : '30/11/2026';
  });

  protected readonly displayItems = computed<DisplayReceiptItem[]>(() => {
    const p = this.project();
    const items = p.quoteItems as QuoteItem[] | undefined;
    const isEn = this.i18n.isEn();
    const currentVatRate = isEn ? 0 : 22;

    if (items && items.length > 0) {
      return items.map((it) => {
        const amount = (it.priceCents || 0) / 100;
        return {
          name: it.name,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          vatRate: currentVatRate
        };
      });
    }

    const pType = p.type as string;
    if (pType === 'mobile' || /app/i.test(p.name)) {
      return isEn
        ? [
            { name: 'iOS & Android Mobile App Architecture', quantity: 1, unitPrice: 1500.0, totalPrice: 1500.0, vatRate: 0 },
            { name: 'Cloud Booking & Client Dashboard System', quantity: 1, unitPrice: 1000.0, totalPrice: 1000.0, vatRate: 0 },
            { name: 'Push Notifications & Real-Time Sync', quantity: 1, unitPrice: 350.0, totalPrice: 350.0, vatRate: 0 }
          ]
        : [
            { name: 'Sviluppo App Mobile iOS e Android', quantity: 1, unitPrice: 1200.0, totalPrice: 1200.0, vatRate: 22 },
            { name: 'Pannello Gestionale Appuntamenti & Salone', quantity: 1, unitPrice: 800.0, totalPrice: 800.0, vatRate: 22 },
            { name: 'Integrazione Notifiche Push & Cloud Sync', quantity: 1, unitPrice: 250.0, totalPrice: 250.0, vatRate: 22 }
          ];
    }
    if (pType === 'ecommerce' || /shop|store/i.test(p.name)) {
      return isEn
        ? [
            { name: 'Custom E-Commerce Catalog & Checkout', quantity: 1, unitPrice: 1800.0, totalPrice: 1800.0, vatRate: 0 },
            { name: 'Stripe & Apple Pay Integration', quantity: 1, unitPrice: 500.0, totalPrice: 500.0, vatRate: 0 },
            { name: 'Cloud Infrastructure & Real-Time Inventory', quantity: 1, unitPrice: 300.0, totalPrice: 300.0, vatRate: 0 }
          ]
        : [
            { name: 'Sviluppo E-Commerce Catalog & Checkout', quantity: 1, unitPrice: 1400.0, totalPrice: 1400.0, vatRate: 22 },
            { name: 'Gateway Pagamenti Stripe & PayPal', quantity: 1, unitPrice: 400.0, totalPrice: 400.0, vatRate: 22 },
            { name: 'Configurazione Cloud SSL & Inventario', quantity: 1, unitPrice: 200.0, totalPrice: 200.0, vatRate: 22 }
          ];
    }
    return isEn
      ? [
          { name: 'Custom 3D Interactive Web Experience', quantity: 1, unitPrice: 1600.0, totalPrice: 1600.0, vatRate: 0 },
          { name: 'Mobile Optimization & Fast SSL Cloud Architecture', quantity: 1, unitPrice: 600.0, totalPrice: 600.0, vatRate: 0 },
          { name: 'Local SEO Engine & Google Indexing', quantity: 1, unitPrice: 300.0, totalPrice: 300.0, vatRate: 0 }
        ]
      : [
          { name: 'Sviluppo Sito Web 3D & Responsive', quantity: 1, unitPrice: 850.0, totalPrice: 850.0, vatRate: 22 },
          { name: 'Piattaforma Web & Configurazione Cloud', quantity: 1, unitPrice: 400.0, totalPrice: 400.0, vatRate: 22 },
          { name: 'Ottimizzazione SEO & Indicizzazione Google', quantity: 1, unitPrice: 150.0, totalPrice: 150.0, vatRate: 22 }
        ];
  });

  protected readonly subtotal = computed(() => {
    return this.displayItems().reduce((acc, it) => acc + it.totalPrice, 0);
  });

  protected readonly vatAmount = computed(() => {
    const vatRate = this.i18n.vatRate();
    return Number((this.subtotal() * vatRate).toFixed(2));
  });

  protected readonly totalWithVat = computed(() => {
    const vatRate = this.i18n.vatRate();
    return Number((this.subtotal() * (1 + vatRate)).toFixed(2));
  });

  protected readonly alreadyPaid = computed(() => {
    const override = this.localPaidOverride();
    if (override !== null) return override;
    const p = this.project();
    if (p.paidAmountCents !== undefined && p.paidAmountCents !== null) {
      return Number((p.paidAmountCents / 100).toFixed(2));
    }
    return 0;
  });

  protected readonly remainingToPay = computed(() => {
    return Math.max(0, Number((this.totalWithVat() - this.alreadyPaid()).toFixed(2)));
  });

  protected readonly isFullyPaid = computed(() => {
    return this.totalWithVat() > 0 && this.remainingToPay() <= 0;
  });

  protected readonly receiptDate = computed(() => {
    const p = this.project();
    return p.createdAt ? new Date(p.createdAt) : new Date();
  });

  protected readonly receiptDocNumber = computed(() => {
    const p = this.project();
    const cleanId = p.id.replace(/-/g, '').slice(0, 10).toUpperCase();
    return this.i18n.isEn() ? `US-${cleanId}` : `INV2026${cleanId}`;
  });

  protected readonly barcodeCode = computed(() => {
    const p = this.project();
    return `CF-${p.id.slice(0, 8).toUpperCase()}`;
  });

  protected formatMoney(val: number): string {
    return this.i18n.formatMoney(val);
  }

  protected printReceipt(event?: MouseEvent): void {
    event?.stopPropagation();
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
