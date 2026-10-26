import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';

interface DueItem {
  id: string;
  name: string;
  amount: number;
  monthly: boolean;
  dueDate: string;
}

@Component({
  selector: 'cf-payment-boxes',
  template: `
    <div class="payment-boxes-row no-print" [class.has-single-box]="isFullyPaid() || unpaidItems().length === 0">
      <!-- Box Sinistra: DA PAGARE con elenco voci per data e scadenza a destra (sparisce se tutte completate) -->
      @if (!isFullyPaid() && unpaidItems().length > 0) {
        <div class="pay-box pay-box-due">
          <div class="pay-box-header">
            <div class="pay-box-header-left">
              <span class="pay-dot dot-due"></span>
              <span class="pay-box-title">DA PAGARE</span>
            </div>
            @if (unpaidItems().length > 1) {
              <span class="pay-box-header-total font-mono">Tot. {{ formatMoney(remainingToPay()) }} €</span>
            }
          </div>

          <div class="due-items-list">
            @for (item of unpaidItems(); track item.id) {
              <div class="due-item-row">
                <div class="due-item-info">
                  <span class="due-item-name" [title]="item.name">{{ item.name }}</span>
                  <div class="due-item-amount font-mono">{{ formatMoney(item.amount) }} €</div>
                </div>
                <div class="due-item-date">
                  <span class="due-date-label">Scadenza</span>
                  <strong class="due-date-val">{{ item.dueDate }}</strong>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Box Destra: PAGATO (totale versato; se tutte le voci sono completate riempie lo spazio) -->
      <div class="pay-box pay-box-paid">
        <div class="pay-box-header">
          <span class="pay-dot dot-paid"></span>
          <span class="pay-box-title">{{ isFullyPaid() ? 'SALDATO 100%' : 'PAGATO' }}</span>
        </div>
        <div class="pay-box-amount font-mono text-green">{{ formatMoney(alreadyPaid()) }} €</div>
        <div class="pay-box-sub text-green-light">
          <span>{{ isFullyPaid() ? 'Tutte le voci saldate con successo ✓' : 'Importo versato ✓' }}</span>
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

    .payment-boxes-row.has-single-box {
      grid-template-columns: 1fr;
    }

    .pay-box {
      border-radius: 14px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
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

    .pay-box-paid {
      background: rgba(16, 185, 129, 0.09);
      border: 1px solid rgba(16, 185, 129, 0.45);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.12);
    }

    .pay-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .pay-box-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pay-box-header-total {
      font-size: 0.78rem;
      font-weight: 700;
      color: #FBBF24;
      background: rgba(245, 158, 11, 0.18);
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(245, 158, 11, 0.35);
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

    .due-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .due-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(245, 158, 11, 0.15);
    }
    .due-item-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .due-item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .due-item-name {
      font-size: 0.78rem;
      color: rgba(246, 241, 255, 0.85);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .due-item-amount {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #FFFFFF;
      line-height: 1.2;
    }

    .due-item-date {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
      flex-shrink: 0;
    }

    .due-date-label {
      font-size: 0.65rem;
      color: rgba(246, 241, 255, 0.55);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .due-date-val {
      font-family: 'DM Mono', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #FBBF24;
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

    .text-green {
      color: #34D399;
    }
    .text-green-light {
      color: #A7F3D0;
    }
    .font-mono {
      font-family: 'DM Mono', monospace;
    }

    @media (max-width: 640px) {
      .payment-boxes-row {
        grid-template-columns: 1fr;
      }
      .due-item-name {
        max-width: 160px;
      }
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

  private calcDueDate(isMonthly: boolean, baseDateStr: string | null | undefined): string {
    let base = new Date();
    if (baseDateStr) {
      const parsed = new Date(baseDateStr);
      if (!isNaN(parsed.getTime())) {
        base = parsed;
      }
    } else {
      base = new Date(2026, 10, 30);
    }

    if (isMonthly) {
      const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
      return nextMonth.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return base.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

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

  protected readonly unpaidItems = computed<DueItem[]>(() => {
    const p = this.project();
    const items = p.quoteItems as QuoteItem[] | undefined;
    const baseDeadline = p.paymentDeadline || p.deadline;
    let remainingPaid = this.alreadyPaid();

    const billable: DueItem[] = [];

    if (items && items.length > 0) {
      for (const it of items) {
        if ((it.priceCents || 0) <= 0) continue;
        const withVat = Number((((it.priceCents || 0) / 100) * 1.22).toFixed(2));
        billable.push({
          id: it.id,
          name: it.name,
          amount: withVat,
          monthly: !!it.monthly,
          dueDate: this.calcDueDate(!!it.monthly, baseDeadline)
        });
      }
    }

    if (billable.length === 0) {
      const rem = this.remainingToPay();
      if (rem > 0) {
        billable.push({
          id: 'default-due',
          name: p.name || 'Saldo progetto',
          amount: rem,
          monthly: false,
          dueDate: this.calcDueDate(false, baseDeadline)
        });
      }
      return billable;
    }

    const result: DueItem[] = [];
    for (const it of billable) {
      if (remainingPaid >= it.amount) {
        remainingPaid = Number((remainingPaid - it.amount).toFixed(2));
        // Voce completata: non compare in DA PAGARE
        continue;
      } else if (remainingPaid > 0) {
        const remAmount = Number((it.amount - remainingPaid).toFixed(2));
        remainingPaid = 0;
        result.push({
          ...it,
          amount: remAmount
        });
      } else {
        result.push(it);
      }
    }

    return result;
  });

  protected formatMoney(val: number): string {
    return val.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
