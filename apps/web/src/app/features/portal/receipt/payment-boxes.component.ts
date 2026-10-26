import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';

@Component({
  selector: 'cf-payment-boxes',
  template: `
    <div class="payment-boxes-row no-print">
      <!-- Box Sinistra: DA PAGARE con DATA SCADENZA -->
      <div class="pay-box pay-box-due" [class.is-settled]="isFullyPaid()">
        <div class="pay-box-header">
          <span class="pay-dot" [class.dot-due]="!isFullyPaid()" [class.dot-paid]="isFullyPaid()"></span>
          <span class="pay-box-title">{{ isFullyPaid() ? 'SALDO COMPLETATO' : 'DA PAGARE' }}</span>
        </div>
        <div class="pay-box-amount font-mono">{{ formatMoney(remainingToPay()) }} €</div>
        <div class="pay-box-sub">
          @if (isFullyPaid()) {
            <span class="text-green-light font-semibold">Nessun importo residuo dovuto ✓</span>
          } @else {
            <span class="due-label">Scadenza:</span>
            <strong class="due-date">{{ deadlineFormatted() }}</strong>
          }
        </div>
      </div>

      <!-- Box Destra: PAGATO -->
      <div class="pay-box pay-box-paid">
        <div class="pay-box-header">
          <span class="pay-dot dot-paid"></span>
          <span class="pay-box-title">PAGATO</span>
        </div>
        <div class="pay-box-amount font-mono text-green">{{ formatMoney(alreadyPaid()) }} €</div>
        <div class="pay-box-sub text-green-light">
          <span>{{ isFullyPaid() ? 'Saldato interamente 100% ✓' : 'Importo versato ✓' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .payment-boxes-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      width: 100%;
      box-sizing: border-box;
    }

    .pay-box {
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
      backdrop-filter: blur(12px);
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .pay-box:hover {
      transform: translateY(-2px);
    }

    .pay-box-due {
      background: rgba(245, 158, 11, 0.09);
      border: 1px solid rgba(245, 158, 11, 0.45);
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.12);
    }
    .pay-box-due.is-settled {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.4);
    }

    .pay-box-paid {
      background: rgba(16, 185, 129, 0.09);
      border: 1px solid rgba(16, 185, 129, 0.45);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.12);
    }

    .pay-box-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pay-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }
    .dot-due {
      background: #F59E0B;
      box-shadow: 0 0 8px #F59E0B;
    }
    .dot-paid {
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    .pay-box-title {
      font-family: 'DM Mono', monospace;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(246, 241, 255, 0.9);
      white-space: nowrap;
    }

    .pay-box-amount {
      font-family: 'DM Mono', monospace;
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #FFFFFF;
    }

    .pay-box-sub {
      font-size: 0.8rem;
      color: rgba(246, 241, 255, 0.7);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .due-label {
      color: rgba(246, 241, 255, 0.6);
    }
    .due-date {
      color: #FBBF24;
      font-weight: 700;
    }

    .text-green {
      color: #34D399;
    }
    .text-green-light {
      color: #A7F3D0;
    }
    .font-semibold {
      font-weight: 600;
    }
    .font-mono {
      font-family: 'DM Mono', monospace;
    }

    @media print {
      .no-print {
        display: none !important;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentBoxesComponent {
  readonly project = input.required<PortalProjectDto>();

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

  protected readonly totalWithVat = computed(() => {
    const p = this.project();
    const items = p.quoteItems as QuoteItem[] | undefined;
    let subtotal = 0;
    if (items && items.length > 0) {
      subtotal = items.reduce((acc, it) => acc + (it.priceCents || 0) / 100, 0);
    } else {
      const pType = p.type as string;
      if (pType === 'mobile' || /app/i.test(p.name)) {
        subtotal = 2250.0;
      } else if (pType === 'ecommerce' || /shop|store/i.test(p.name)) {
        subtotal = 2000.0;
      } else {
        subtotal = 1400.0;
      }
    }
    return Number((subtotal * 1.22).toFixed(2));
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

  protected formatMoney(val: number): string {
    return val.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
