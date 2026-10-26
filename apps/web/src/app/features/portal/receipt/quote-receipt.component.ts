import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
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
      <div class="receipt-actions no-print">
        <span class="receipt-hint">📄 Copia Scontrino Preventivo</span>
        <button type="button" class="btn btn-sm btn-outline print-btn" (click)="printReceipt()">
          🖨️ Stampa / Salva PDF
        </button>
      </div>

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

        <!-- Tabella Voci Preventivo -->
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
            <span class="total-label">Importo pagato / Acconto 50%</span>
            <span class="total-val">{{ formatMoney(totalWithVat() / 2) }}</span>
          </div>
        </div>

        <!-- Dati Documento & Data -->
        <div class="doc-meta">
          <div class="meta-line">{{ receiptDate() | date: 'dd/MM/yyyy HH:mm' }}</div>
          <div class="meta-line">Documento n. {{ receiptDocNumber() }}</div>
        </div>

        <!-- Note e Info Aggiuntive -->
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
      gap: 16px;
      margin: 24px 0;
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
      background-size: 10px 10px;
    }
    .tear-top {
      top: -6px;
      transform: rotate(180deg);
    }
    .tear-bottom {
      bottom: -6px;
    }

    /* Intestazione negozio */
    .receipt-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .store-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      margin: 0 0 3px;
      color: #000000;
    }
    .store-sub {
      font-size: 0.72rem;
      font-weight: 700;
      margin: 0 0 4px;
      letter-spacing: 0.02em;
    }
    .store-info {
      font-size: 0.76rem;
      margin: 1px 0;
      color: #1A1A1A;
      font-weight: 500;
    }

    /* Linea tratteggiata */
    .dashed-line {
      border-bottom: 1.5px dashed #333333;
      margin: 14px 0;
      width: 100%;
    }

    /* Modalità Dimostrativa / Non fiscale */
    .receipt-type {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 14px;
    }
    .mode-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .mode-sub {
      font-size: 0.82rem;
      font-weight: 700;
    }
    .mode-desc {
      font-size: 0.75rem;
      font-style: italic;
    }

    /* Tabella articoli */
    .items-table {
      width: 100%;
      font-size: 0.82rem;
    }
    .table-header {
      display: grid;
      grid-template-columns: 1fr 48px 84px;
      font-weight: 800;
      border-bottom: 1px solid #111111;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .col-vat {
      text-align: center;
    }
    .col-price {
      text-align: right;
    }

    .item-block {
      margin-bottom: 10px;
    }
    .item-row {
      display: grid;
      grid-template-columns: 1fr 48px 84px;
      font-weight: 700;
      align-items: baseline;
    }
    .item-name {
      word-break: break-word;
      padding-right: 6px;
    }
    .item-vat {
      text-align: center;
    }
    .item-price {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .item-meta {
      font-size: 0.72rem;
      color: #333333;
      margin-top: 1px;
    }

    /* Totali */
    .totals-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.85rem;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .main-total {
      font-size: 0.98rem;
      font-weight: 800;
      margin-bottom: 2px;
    }
    .vat-row {
      font-weight: 700;
    }
    .total-val {
      font-variant-numeric: tabular-nums;
      font-weight: 800;
    }

    /* Dati Documento */
    .doc-meta {
      margin-top: 14px;
      font-size: 0.76rem;
      color: #222222;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* Note */
    .notes-section {
      margin-top: 14px;
      font-size: 0.76rem;
      line-height: 1.4;
    }
    .notes-title {
      display: block;
      font-style: italic;
      font-weight: 700;
    }
    .notes-subtitle {
      display: block;
      font-weight: 700;
    }
    .notes-text {
      margin: 2px 0 0;
      color: #222222;
    }

    /* Saluto */
    .thank-you {
      text-align: center;
      font-style: italic;
      font-size: 0.88rem;
      font-weight: 700;
      margin: 22px 0 16px;
      letter-spacing: 0.05em;
    }

    /* Codice a barre realistico */
    .barcode-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin-top: 10px;
    }
    .barcode-lines {
      display: flex;
      align-items: stretch;
      height: 48px;
    }
    .barcode-lines span {
      background: #000000;
      display: block;
    }
    .barcode-number {
      font-size: 0.72rem;
      letter-spacing: 0.15em;
      color: #333333;
    }

    /* Stampa termica */
    @media print {
      .no-print {
        display: none !important;
      }
      .receipt {
        box-shadow: none !important;
        max-width: 100% !important;
        padding: 0 !important;
      }
      .tear-edge {
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

  protected readonly displayItems = computed<DisplayReceiptItem[]>(() => {
    const p = this.project();
    const items = (p as any).quoteItems as QuoteItem[] | undefined;

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

    // Voci preventivo predefinite basate sul listino Childhood Friendship
    return [
      {
        name: 'Sviluppo Sito Web 3D & Responsive',
        quantity: 1,
        unitPrice: 400.0,
        totalPrice: 400.0,
        vatRate: 22
      },
      {
        name: 'Piattaforma Web App & Portale',
        quantity: 1,
        unitPrice: 800.0,
        totalPrice: 800.0,
        vatRate: 22
      },
      {
        name: 'Configurazione Cloud, SSL & SEO',
        quantity: 1,
        unitPrice: 150.0,
        totalPrice: 150.0,
        vatRate: 22
      }
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
