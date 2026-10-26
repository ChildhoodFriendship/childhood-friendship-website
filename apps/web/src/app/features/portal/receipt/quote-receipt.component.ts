import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';

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
    <div class="receipt-container">
      <!-- Scontrino termico fedele alla copia fisica -->
      <article class="receipt">
        <!-- Taglio carta dentellato superiore -->
        <div class="tear-edge tear-top" aria-hidden="true"></div>

        <!-- Header Azienda -->
        <header class="receipt-header">
          <h2 class="store-name">CHILDHOOD FRIENDSHIP</h2>
          <p class="store-sub">STUDIO SVILUPPO SOFTWARE & WEB</p>
          <p class="store-info">VIA ROMA 99</p>
          <p class="store-info">35122 PADOVA (PD) - VENETO</p>
          <p class="store-info">P.IVA IT04982710284</p>
          <p class="store-info">Tel. +39 380 8970829</p>
          <p class="store-info">lorenzo&#64;childhoodfriendship.it</p>
        </header>

        <div class="dashed-line" aria-hidden="true"></div>

        <!-- Intestazione Fiscale Dimostrativa -->
        <div class="receipt-type">
          <strong class="mode-title">MODALITA' DIMOSTRATIVA</strong>
          <span class="mode-sub">NON FISCALE</span>
          <span class="mode-desc">di vendita o prestazione</span>
        </div>

        <!-- Tabella Voci Preventivo Reali del Progetto -->
        <div class="items-table">
          <div class="table-header">
            <span class="col-desc">DESCRIZIONE</span>
            <span class="col-vat">IVA</span>
            <span class="col-price">PREZZO (€)</span>
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
                  PZ {{ item.quantity }} - prz. {{ formatMoney(item.unitPrice) }}
                </div>
              </div>
            }
          </div>
        </div>

        <div class="dashed-line" aria-hidden="true"></div>

        <!-- Riepilogo Totali -->
        <div class="totals-section">
          <div class="total-row main-total">
            <span class="total-label">TOTALE COMPLESSIVO</span>
            <span class="total-val">{{ formatMoney(totalWithVat()) }}</span>
          </div>
          <div class="total-row vat-row">
            <span class="total-label">di cui IVA (22%)</span>
            <span class="total-val">{{ formatMoney(vatAmount()) }}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Elettronico</span>
            <span class="total-val">{{ formatMoney(totalWithVat()) }}</span>
          </div>
          <div class="total-row">
            <span class="total-label">{{ isFullyPaid() ? 'Importo pagato (Saldato 100%)' : 'Importo pagato (Acconto)' }}</span>
            <span class="total-val">{{ formatMoney(alreadyPaid()) }}</span>
          </div>
          @if (!isFullyPaid()) {
            <div class="total-row">
              <span class="total-label">Residuo da versare (Scad. {{ deadlineFormatted() }})</span>
              <span class="total-val">{{ formatMoney(remainingToPay()) }}</span>
            </div>
          }
        </div>

        <!-- Dati Documento & Data -->
        <div class="doc-meta">
          <div class="meta-line">{{ receiptDate() | date: 'dd/MM/yyyy HH:mm' }}</div>
          <div class="meta-line">Documento n. {{ receiptDocNumber() }}</div>
        </div>

        <!-- Note e Info Aggiuntive Reali -->
        <div class="notes-section">
          <strong class="notes-title">Altre Info:</strong>
          <span class="notes-subtitle">Note:</span>
          <p class="notes-text">
            Progetto: {{ project().name }}<br>
            Codice sorgente artigianale, server cloud SSL e collaudo inclusi.
          </p>
        </div>

        <!-- Ringraziamento -->
        <div class="thank-you">
          GRAZIE E ARRIVEDERCI
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
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .receipt-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      margin: 8px 0;
    }

    .receipt-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: 440px;
      padding: 0 4px;
    }

    .receipt-hint {
      font-family: var(--cf-display, sans-serif);
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--cf-color-violet-light, #A78BFA);
      letter-spacing: -0.01em;
    }

    .print-btn {
      cursor: pointer;
      font-size: 0.8rem;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid rgba(167, 139, 250, 0.4);
      background: rgba(124, 58, 237, 0.1);
      color: #F6F1FF;
      transition: all 0.2s ease;
    }
    .print-btn:hover {
      background: rgba(124, 58, 237, 0.25);
      border-color: #A78BFA;
    }

    /* Struttura autentica scontrino termico */
    .receipt {
      background: #FFFFFF;
      color: #0F0F11;
      font-family: 'DM Mono', 'Courier New', Courier, monospace;
      width: 100%;
      max-width: 440px;
      padding: 38px 26px 42px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.3);
      position: relative;
      border-radius: 2px;
      box-sizing: border-box;
      line-height: 1.35;
    }

    /* Bordo a zig-zag (strappo scontrino) */
    .tear-edge {
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(135deg, transparent 75%, #FFFFFF 75%),
                  linear-gradient(225deg, transparent 75%, #FFFFFF 75%);
      background-size: 10px 6px;
      background-repeat: repeat-x;
    }
    .tear-top {
      top: -6px;
      transform: rotate(180deg);
    }
    .tear-bottom {
      bottom: -6px;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .store-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0 0 2px;
      color: #000;
    }
    .store-sub {
      font-size: 0.76rem;
      font-weight: 700;
      margin: 0 0 6px;
      letter-spacing: 0.02em;
    }
    .store-info {
      font-size: 0.75rem;
      margin: 1px 0;
      color: #222;
    }

    .dashed-line {
      border-top: 1px dashed #444;
      margin: 12px 0;
      width: 100%;
    }

    .receipt-type {
      text-align: center;
      margin: 10px 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .mode-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.06em;
    }
    .mode-sub {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .mode-desc {
      font-size: 0.72rem;
      color: #333;
    }

    /* Tabella Voci */
    .items-table {
      margin: 14px 0;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      font-weight: 800;
      border-bottom: 1px solid #111;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .col-desc { flex: 1; text-align: left; }
    .col-vat { width: 44px; text-align: center; }
    .col-price { width: 90px; text-align: right; }

    .item-block {
      margin-bottom: 8px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 0.85rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .item-name {
      flex: 1;
      padding-right: 8px;
    }
    .item-vat {
      width: 44px;
      text-align: center;
      font-size: 0.8rem;
    }
    .item-price {
      width: 90px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .item-meta {
      font-size: 0.72rem;
      color: #444;
      margin-top: 2px;
    }

    /* Totali */
    .totals-section {
      margin: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .main-total {
      font-size: 1.05rem;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .vat-row {
      font-size: 0.85rem;
      color: #222;
    }
    .total-val {
      font-variant-numeric: tabular-nums;
    }

    /* Metadati Documento */
    .doc-meta {
      margin: 14px 0 10px;
      font-size: 0.76rem;
      color: #222;
      line-height: 1.35;
    }

    /* Note */
    .notes-section {
      margin: 12px 0;
      font-size: 0.75rem;
      line-height: 1.35;
    }
    .notes-title {
      font-weight: 800;
      display: block;
    }
    .notes-subtitle {
      font-weight: 700;
      display: block;
      margin-top: 2px;
    }
    .notes-text {
      margin: 2px 0 0;
      color: #222;
    }

    .thank-you {
      text-align: center;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      margin: 18px 0 12px;
    }

    /* Codice a barre */
    .barcode-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 8px 0 4px;
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

  // Generatore di barre verticali per codice a barre realistico
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
    if (deadlineToUse) {
      try {
        const d = new Date(deadlineToUse);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch {
        return deadlineToUse;
      }
    }
    return '30/11/2026';
  });

  protected readonly displayItems = computed<DisplayReceiptItem[]>(() => {
    const p = this.project();
    const items = p.quoteItems as QuoteItem[] | undefined;

    // Se l'admin ha inserito voci quoteItems per questo progetto, usiamo quelle reali!
    if (items && items.length > 0) {
      return items.map((it) => {
        const euros = (it.priceCents || 0) / 100;
        return {
          name: it.name,
          quantity: 1,
          unitPrice: euros,
          totalPrice: euros,
          vatRate: 22
        };
      });
    }

    // Se l'admin non ha ancora valorizzato quoteItems specifiche, usiamo le voci coerenti col tipo impostato dall'admin nel progetto
    const pType = p.type as string;
    if (pType === 'mobile' || /app/i.test(p.name)) {
      return [
        { name: 'Sviluppo App Mobile iOS e Android', quantity: 1, unitPrice: 1200.0, totalPrice: 1200.0, vatRate: 22 },
        { name: 'Pannello Gestionale Appuntamenti & Salone', quantity: 1, unitPrice: 800.0, totalPrice: 800.0, vatRate: 22 },
        { name: 'Integrazione Notifiche Push & Cloud Sync', quantity: 1, unitPrice: 250.0, totalPrice: 250.0, vatRate: 22 }
      ];
    }
    if (pType === 'ecommerce' || /shop|store/i.test(p.name)) {
      return [
        { name: 'Sviluppo E-Commerce Catalog & Checkout', quantity: 1, unitPrice: 1400.0, totalPrice: 1400.0, vatRate: 22 },
        { name: 'Gateway Pagamenti Stripe & PayPal', quantity: 1, unitPrice: 400.0, totalPrice: 400.0, vatRate: 22 },
        { name: 'Configurazione Cloud SSL & Inventario', quantity: 1, unitPrice: 200.0, totalPrice: 200.0, vatRate: 22 }
      ];
    }
    return [
      { name: 'Sviluppo Sito Web 3D & Responsive', quantity: 1, unitPrice: 850.0, totalPrice: 850.0, vatRate: 22 },
      { name: 'Piattaforma Web & Configurazione Cloud', quantity: 1, unitPrice: 400.0, totalPrice: 400.0, vatRate: 22 },
      { name: 'Ottimizzazione SEO & Indicizzazione Google', quantity: 1, unitPrice: 150.0, totalPrice: 150.0, vatRate: 22 }
    ];
  });

  protected readonly subtotal = computed(() => {
    return this.displayItems().reduce((acc, it) => acc + it.totalPrice, 0);
  });

  protected readonly vatAmount = computed(() => {
    return Number((this.subtotal() * 0.22).toFixed(2));
  });

  protected readonly totalWithVat = computed(() => {
    return Number((this.subtotal() * 1.22).toFixed(2));
  });

  protected readonly alreadyPaid = computed(() => {
    const p = this.project();
    if (p.paidAmountCents !== undefined && p.paidAmountCents !== null) {
      return Number((p.paidAmountCents / 100).toFixed(2));
    }
    return Number((this.totalWithVat() * 0.5).toFixed(2));
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
    return `DEMO2026${cleanId}`;
  });

  protected readonly barcodeCode = computed(() => {
    const p = this.project();
    return `CF-${p.id.slice(0, 8).toUpperCase()}`;
  });

  protected formatMoney(val: number): string {
    return val.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  protected printReceipt(): void {
    window.print();
  }
}
