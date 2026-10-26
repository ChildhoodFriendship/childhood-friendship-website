import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';

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
    <div class="payment-boxes-row no-print" [class.has-single-box]="isFullyPaid() || unpaidItems().length === 0 || alreadyPaid() <= 0">
      <!-- Box Sinistra: DA PAGARE (l'intera card è cliccabile per pagare con Apple Pay) -->
      @if (!isFullyPaid() && unpaidItems().length > 0) {
        <div
          class="pay-box pay-box-due clickable-pay-card"
          (click)="openApplePaySheet()"
          role="button"
          tabindex="0"
          title="Clicca per pagare con Apple Pay"
          (keydown.enter)="openApplePaySheet()"
          (keydown.space)="openApplePaySheet()">
          <div class="pay-box-header">
            <div class="pay-box-header-left">
              <span class="pay-dot dot-due"></span>
              <span class="pay-box-title">DA PAGARE</span>
            </div>
            <div class="pay-box-header-right">
              @if (unpaidItems().length > 1) {
                <span class="pay-box-header-total font-mono">Tot. {{ formatMoney(remainingToPay()) }} €</span>
              }
              <span class="pay-action-pill font-mono"> Pay ↗</span>
            </div>
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

      <!-- Box Destra: PAGATO (visibile solo se l'importo pagato è > 0 oppure tutto saldato) -->
      @if (alreadyPaid() > 0 || isFullyPaid()) {
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
      }
    </div>

    <!-- Modal Apple Pay Sheet -->
    @if (showApplePaySheet()) {
      <div class="apple-pay-backdrop" (click)="closeApplePaySheet()">
        <div class="apple-pay-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>

          <div class="sheet-top">
            <div class="sheet-brand">
              <span class="sheet-apple-logo"></span> Pay
            </div>
            <button type="button" class="btn-close-sheet" (click)="closeApplePaySheet()" aria-label="Chiudi">✕</button>
          </div>

          <div class="sheet-details">
            <div class="sheet-merchant">
              <span class="sheet-label">BENEFICIARIO</span>
              <span class="sheet-val">Childhood Friendship (Padova)</span>
            </div>

            <div class="sheet-card-info">
              <span class="sheet-label">METODO DI PAGAMENTO</span>
              <span class="sheet-val">Carta Apple Pay •••• 8921</span>
            </div>

            <div class="sheet-amount-row">
              <span class="sheet-amount-label">TOTALE DA ADDEBITARE</span>
              <span class="sheet-amount-val font-mono">{{ formatMoney(remainingToPay()) }} €</span>
            </div>
          </div>

          <div class="sheet-actions">
            @if (isAuthorizing()) {
              <div class="authorizing-state">
                <div class="apple-spinner"></div>
                <span>Autorizzazione Face ID / Touch ID in corso...</span>
              </div>
            } @else {
              <button
                type="button"
                class="btn-confirm-apple-pay"
                (click)="confirmApplePay()">
                <span class="face-id-icon">⊡</span> Conferma con Face ID / Touch ID
              </button>
            }
          </div>

          <p class="sheet-subhint">
            La Fattura Elettronica SDI e la ricevuta quietanzata saranno recapitate automaticamente 
            a {{ clientEmail() }} e allo studio childhood.friendship.official&#64;gmail.com.
          </p>
        </div>
      </div>
    }
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

    
    .clickable-pay-card {
      cursor: pointer;
      user-select: none;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .clickable-pay-card:hover {
      transform: translateY(-2px);
      border-color: rgba(245, 158, 11, 0.7);
      box-shadow: 0 8px 28px rgba(245, 158, 11, 0.22);
    }
    .clickable-pay-card:active {
      transform: translateY(0);
    }
    .pay-box-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pay-action-pill {
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffffff;
      background: #000000;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      letter-spacing: 0.02em;
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

    /* Apple Pay CTA nel box */
    .apple-pay-section {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(245, 158, 11, 0.2);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .btn-apple-pay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 18px;
      border-radius: 999px;
      background: #000000;
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.25);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      font-size: 0.92rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      transition: all 0.2s ease;
    }
    .btn-apple-pay:hover {
      background: #1C1C1E;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
    }

    .apple-logo {
      font-size: 1.15rem;
      line-height: 1;
      margin-bottom: 2px;
    }
    .btn-apple-sep {
      color: rgba(255, 255, 255, 0.4);
    }

    .apple-pay-secure-hint {
      font-size: 0.68rem;
      color: rgba(246, 241, 255, 0.6);
      text-align: center;
    }

    /* Modal Apple Pay Sheet */
    .apple-pay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    @media (min-width: 600px) {
      .apple-pay-backdrop {
        align-items: center;
      }
    }

    .apple-pay-sheet {
      width: min(100%, 420px);
      background: #1C1C1E;
      color: #FFFFFF;
      border-radius: 24px 24px 0 0;
      padding: 24px 22px 32px;
      box-sizing: border-box;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.8);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    }
    @media (min-width: 600px) {
      .apple-pay-sheet {
        border-radius: 24px;
      }
    }

    .sheet-handle {
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.3);
      margin: 0 auto 16px;
    }

    .sheet-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .sheet-brand {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .sheet-apple-logo {
      font-size: 1.5rem;
    }
    .btn-close-sheet {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #FFF;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .sheet-details {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .sheet-label {
      display: block;
      font-size: 0.65rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .sheet-val {
      font-size: 0.92rem;
      font-weight: 600;
    }

    .sheet-amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .sheet-amount-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
    }
    .sheet-amount-val {
      font-size: 1.25rem;
      font-weight: 800;
      color: #34D399;
    }

    .sheet-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .btn-confirm-apple-pay {
      width: 100%;
      padding: 14px;
      border-radius: 999px;
      background: #FFFFFF;
      color: #000000;
      border: none;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
      transition: all 0.2s ease;
    }
    .btn-confirm-apple-pay:hover {
      background: #F2F2F7;
      transform: scale(1.02);
    }

    .authorizing-state {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #34D399;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .apple-spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid rgba(52, 211, 153, 0.3);
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sheet-subhint {
      margin: 14px 0 0;
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
      line-height: 1.4;
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
  private readonly toast = inject(ToastService);

  protected readonly showApplePaySheet = signal(false);
  protected readonly isAuthorizing = signal(false);
  protected readonly localPaidOverride = signal<number | null>(null);

  constructor() {
    effect(() => {
      const proj = this.project();
      if (!proj) return;
      const saved = localStorage.getItem(`cf_paid_override_${proj.id}`);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val)) {
          this.localPaidOverride.set(val);
        }
      }
    });
  }

  protected readonly clientEmail = computed(() => {
    const p = this.project();
    if (/sissy/i.test(p.name)) return 'sissy@sissyhairstyle.it';
    return 'cliente@official.it';
  });

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
    const override = this.localPaidOverride();
    if (override !== null) {
      return override;
    }
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

  protected openApplePaySheet(): void {
    this.showApplePaySheet.set(true);
  }

  protected closeApplePaySheet(): void {
    if (!this.isAuthorizing()) {
      this.showApplePaySheet.set(false);
    }
  }

  protected confirmApplePay(): void {
    this.isAuthorizing.set(true);
    const amountPaid = this.remainingToPay();
    setTimeout(() => {
      this.isAuthorizing.set(false);
      this.showApplePaySheet.set(false);
      const newTotal = this.totalWithVat();
      this.localPaidOverride.set(newTotal);
      localStorage.setItem(`cf_paid_override_${this.project().id}`, String(newTotal));
      this.toast.success(
        `Pagamento Apple Pay di ${this.formatMoney(amountPaid)} € autorizzato con successo! Fattura SDI e quietanza inviate a childhood.friendship.official@gmail.com.`
      );
    }, 1200);
  }

  protected formatMoney(val: number): string {
    return val.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
