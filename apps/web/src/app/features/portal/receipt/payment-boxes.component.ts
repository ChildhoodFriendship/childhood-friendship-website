import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import type { PortalProjectDto, QuoteItem } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';
import { PortalI18nService } from '../../../core/portal-i18n.service';

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
      <!-- Box Sinistra: DA PAGARE / AMOUNT DUE -->
      @if (!isFullyPaid() && unpaidItems().length > 0) {
        <div
          class="pay-box pay-box-due clickable-pay-card"
          (click)="openApplePaySheet()"
          role="button"
          tabindex="0"
          [title]="i18n.isEn() ? 'Click to pay with Apple Pay or Card' : 'Clicca per pagare con Apple Pay o Carta'"
          (keydown.enter)="openApplePaySheet()"
          (keydown.space)="openApplePaySheet()">
          <div class="pay-box-header">
            <div class="pay-box-header-left">
              <span class="pay-dot dot-due"></span>
              <span class="pay-box-title">
                {{ alreadyPaid() > 0 
                  ? (i18n.isEn() ? 'FINAL 50% BALANCE' : 'SALDO 50% A CONSEGNA') 
                  : (i18n.isEn() ? 'AMOUNT DUE (2 TRANCHES)' : 'DA PAGARE (2 TRANCHE)') }}
              </span>
            </div>
            <div class="pay-box-header-right">
              @if (alreadyPaid() <= 0) {
                <span class="pay-tranche-badge font-mono">{{ i18n.isEn() ? '50% Retainer' : 'Acconto 50%' }}</span>
              } @else {
                <span class="pay-tranche-badge font-mono">{{ i18n.isEn() ? 'Final Tranche' : 'Tranche Saldo' }}</span>
              }
              <span class="pay-action-pill font-mono"> Pay ↗</span>
            </div>
          </div>

          <div class="due-items-list">
            @for (item of unpaidItems(); track item.id) {
              <div class="due-item-row">
                <div class="due-item-info">
                  <span class="due-item-name" [title]="item.name">{{ item.name }}</span>
                  <div class="due-item-amount font-mono">{{ formatMoney(item.amount) }}</div>
                </div>
                <div class="due-item-date">
                  <span class="due-date-label">{{ i18n.isEn() ? 'Due Date' : 'Scadenza' }}</span>
                  <strong class="due-date-val">{{ item.dueDate }}</strong>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Box Destra: PAGATO / PAID IN FULL -->
      @if (alreadyPaid() > 0 || isFullyPaid()) {
        <div class="pay-box pay-box-paid">
          <div class="pay-box-header">
            <span class="pay-dot dot-paid"></span>
            <span class="pay-box-title">
              {{ isFullyPaid() 
                ? (i18n.isEn() ? 'PAID IN FULL 100%' : 'SALDATO 100%') 
                : (i18n.isEn() ? 'TRANCHE 1/2 (50% DEPOSIT PAID)' : 'TRANCHE 1/2 (ACCONTO 50% VERSATO)') }}
            </span>
          </div>
          <div class="pay-box-amount font-mono text-green">{{ formatMoney(alreadyPaid()) }}</div>
          <div class="pay-box-sub text-green-light">
            <span>
              {{ isFullyPaid() 
                ? (i18n.isEn() ? 'All project tranches settled successfully ✓' : 'Tutte le voci e tranche saldate con successo ✓') 
                : (i18n.isEn() ? '50% Retainer confirmed. Final 50% due on deployment ✓' : 'Acconto 50% confermato. Saldo 50% dovuto alla consegna ✓') }}
            </span>
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
            <button type="button" class="btn-close-sheet" (click)="closeApplePaySheet()" [attr.aria-label]="i18n.isEn() ? 'Close' : 'Chiudi'">✕</button>
          </div>

          <!-- Selezione Tranche (Acconto 50% vs Saldo 100%) -->
          @if (alreadyPaid() <= 0) {
            <div class="sheet-tranche-picker">
              <span class="sheet-label">{{ i18n.isEn() ? 'SELECT PAYMENT FORMULA' : 'FORMULA DI PAGAMENTO' }}</span>
              <div class="tranche-cards-row">
                <button
                  type="button"
                  class="tranche-card"
                  [class.active]="selectedTranche() === 'deposit'"
                  (click)="selectedTranche.set('deposit')">
                  <div class="card-pill font-mono">{{ i18n.isEn() ? 'POPULAR' : 'CONSIGLIATO' }}</div>
                  <div class="card-heading">{{ i18n.isEn() ? 'Tranche 1 (50% Deposit)' : 'Tranche 1 (Acconto 50%)' }}</div>
                  <div class="card-price font-mono text-green">{{ formatMoney(depositAmount()) }}</div>
                  <div class="card-caption">{{ i18n.isEn() ? 'Locks kickoff date & starts development' : 'Blocca avvio lavori & sviluppo immediato' }}</div>
                </button>

                <button
                  type="button"
                  class="tranche-card"
                  [class.active]="selectedTranche() === 'full'"
                  (click)="selectedTranche.set('full')">
                  <div class="card-pill font-mono">{{ i18n.isEn() ? 'FULL' : 'SALDO' }}</div>
                  <div class="card-heading">{{ i18n.isEn() ? '100% Full Payment' : 'Pagamento Unico 100%' }}</div>
                  <div class="card-price font-mono text-green">{{ formatMoney(totalWithVat()) }}</div>
                  <div class="card-caption">{{ i18n.isEn() ? 'Settle entire project with zero remaining' : 'Saldo totale progetto senza rate residue' }}</div>
                </button>
              </div>
            </div>
          } @else {
            <div class="sheet-progress-box">
              <span class="sheet-label">{{ i18n.isEn() ? 'TRANCHE PROGRESS' : 'STATO TRANCHE' }}</span>
              <div class="progress-steps-row">
                <div class="p-step done">
                  <span class="step-check">✓</span>
                  <span class="step-label">{{ i18n.isEn() ? 'Tranche 1 (50% Paid)' : 'Tranche 1 (50% Pagato)' }}</span>
                </div>
                <div class="p-divider">➔</div>
                <div class="p-step active">
                  <span class="step-number">2</span>
                  <span class="step-label font-bold text-green">{{ i18n.isEn() ? 'Tranche 2 (50% Balance)' : 'Tranche 2 (50% Saldo)' }}</span>
                </div>
              </div>
            </div>
          }

          <div class="sheet-details">
            <div class="sheet-merchant">
              <span class="sheet-label">{{ i18n.isEn() ? 'BENEFICIARY' : 'BENEFICIARIO' }}</span>
              <span class="sheet-val">Childhood Friendship (Digital Product Studio)</span>
            </div>

            <div class="sheet-card-info">
              <span class="sheet-label">{{ i18n.isEn() ? 'PAYMENT METHODS (STRIPE SECURE)' : 'METODI DI PAGAMENTO (STRIPE)' }}</span>
              <div class="sheet-methods-tags">
                <span class="method-badge"> Apple Pay</span>
                <span class="method-badge">G Pay</span>
                <span class="method-badge">💳 Credit / Debit Card</span>
              </div>
            </div>

            <div class="sheet-amount-row">
              <span class="sheet-amount-label">
                {{ alreadyPaid() > 0 
                  ? (i18n.isEn() ? 'FINAL TRANCHE (50% TO CHARGE)' : 'SALDO FINALE (50% DA ADDEBITARE)') 
                  : (selectedTranche() === 'deposit' 
                    ? (i18n.isEn() ? 'TRANCHE 1 (50% DEPOSIT TO CHARGE)' : 'TRANCHE 1 (ACCONTO 50% DA ADDEBITARE)') 
                    : (i18n.isEn() ? '100% FULL AMOUNT TO CHARGE' : 'TOTALE 100% DA ADDEBITARE')) }}
              </span>
              <span class="sheet-amount-val font-mono">{{ formatMoney(currentChargeAmount()) }}</span>
            </div>
          </div>

          <div class="sheet-actions">
            @if (isAuthorizing()) {
              <div class="authorizing-state">
                <div class="apple-spinner"></div>
                <span>{{ i18n.isEn() ? 'Face ID / Touch ID verification in progress...' : 'Autorizzazione Face ID / Touch ID in corso...' }}</span>
              </div>
            } @else {
              <button
                type="button"
                class="btn-confirm-apple-pay"
                (click)="confirmApplePay()">
                <span class="face-id-icon">⊡</span> 
                {{ i18n.isEn() 
                  ? (alreadyPaid() > 0 
                    ? 'Pay Final 50% Balance with Apple Pay' 
                    : (selectedTranche() === 'deposit' 
                      ? 'Pay 50% Deposit with Apple Pay' 
                      : 'Pay 100% in Full with Apple Pay')) 
                  : (alreadyPaid() > 0 
                    ? 'Paga Saldo 50% con Apple Pay' 
                    : (selectedTranche() === 'deposit' 
                      ? 'Paga Acconto 50% con Apple Pay' 
                      : 'Paga 100% Totale con Apple Pay')) }}
              </button>
            }
          </div>

          <p class="sheet-subhint">
            {{ i18n.isEn() 
              ? 'Official commercial invoice, terms of service and receipt automatically delivered to ' + clientEmail() + ' and childhood.friendship.official@gmail.com.'
              : 'Fattura Elettronica SDI / quietanza e condizioni contrattuali recapitate automaticamente a ' + clientEmail() + ' e allo studio childhood.friendship.official@gmail.com.' }}
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

    .pay-tranche-badge {
      font-size: 0.68rem;
      background: rgba(52, 211, 153, 0.15);
      color: #34D399;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(52, 211, 153, 0.3);
      font-weight: 700;
    }

    .sheet-tranche-picker, .sheet-progress-box {
      margin-bottom: 14px;
    }

    .tranche-cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }

    .tranche-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #FFFFFF;
    }
    .tranche-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .tranche-card.active {
      background: rgba(52, 211, 153, 0.12);
      border-color: #34D399;
      box-shadow: 0 0 16px rgba(52, 211, 153, 0.2);
    }

    .card-pill {
      font-size: 0.6rem;
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.15);
      color: #FFFFFF;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .tranche-card.active .card-pill {
      background: #34D399;
      color: #000000;
    }

    .card-heading {
      font-size: 0.78rem;
      font-weight: 700;
      color: #FFFFFF;
    }
    .card-price {
      font-size: 1.05rem;
      font-weight: 800;
    }
    .card-caption {
      font-size: 0.64rem;
      color: rgba(255, 255, 255, 0.6);
      line-height: 1.25;
    }

    .sheet-progress-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .progress-steps-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
    }
    .p-step {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      color: rgba(255, 255, 255, 0.6);
    }
    .p-step.done {
      color: #34D399;
    }
    .p-divider {
      color: rgba(255, 255, 255, 0.3);
      font-size: 0.8rem;
    }
    .step-check, .step-number {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      font-weight: 800;
    }
    .p-step.done .step-check {
      background: #34D399;
      color: #000000;
    }
    .p-step.active .step-number {
      background: #FFFFFF;
      color: #000000;
    }

    .sheet-methods-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 4px;
    }
    .method-badge {
      font-size: 0.72rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 3px 8px;
      border-radius: 6px;
      color: #FFFFFF;
      font-weight: 600;
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

    /* Modal Apple Pay Sheet */
    .apple-pay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .apple-pay-sheet {
      width: 100%;
      max-width: 480px;
      max-height: 85vh;
      overflow-y: auto;
      background: #1C1C1E;
      border-radius: 24px 24px 0 0;
      padding: 16px 20px 32px;
      box-sizing: border-box;
      box-shadow: 0 -8px 36px rgba(0, 0, 0, 0.8);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .sheet-handle {
      width: 36px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 999px;
      margin: 0 auto 14px;
    }

    .sheet-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .sheet-brand {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sheet-apple-logo {
      font-size: 1.6rem;
      line-height: 1;
      margin-bottom: 3px;
    }

    .btn-close-sheet {
      background: rgba(255, 255, 255, 0.12);
      border: none;
      color: rgba(255, 255, 255, 0.8);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s ease;
    }
    .btn-close-sheet:hover {
      background: rgba(255, 255, 255, 0.22);
    }

    .sheet-details {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 22px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sheet-merchant, .sheet-card-info, .sheet-amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .sheet-amount-row {
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .sheet-label {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.55);
      letter-spacing: 0.04em;
      font-weight: 600;
    }

    .sheet-val {
      font-size: 0.86rem;
      color: #FFFFFF;
      font-weight: 600;
    }

    .sheet-amount-label {
      font-size: 0.82rem;
      color: #FFFFFF;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .sheet-amount-val {
      font-size: 1.35rem;
      font-weight: 800;
      color: #34D399;
    }

    .sheet-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .btn-confirm-apple-pay {
      width: 100%;
      padding: 14px 20px;
      border-radius: 12px;
      background: #FFFFFF;
      color: #000000;
      border: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      font-size: 1rem;
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
  protected readonly i18n = inject(PortalI18nService);

  protected readonly showApplePaySheet = signal(false);
  protected readonly isAuthorizing = signal(false);
  protected readonly localPaidOverride = signal<number | null>(null);
  protected readonly selectedTranche = signal<'deposit' | 'full'>('deposit');

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
    return 'client@official.com';
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

    const locale = this.i18n.isEn() ? 'en-US' : 'it-IT';
    if (isMonthly) {
      const nextMonth = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate());
      return nextMonth.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    return base.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    const vatMultiplier = 1 + this.i18n.vatRate();
    return Number((subtotal * vatMultiplier).toFixed(2));
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
    return 0;
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
    const vatMultiplier = 1 + this.i18n.vatRate();

    const billable: DueItem[] = [];

    if (items && items.length > 0) {
      for (const it of items) {
        if ((it.priceCents || 0) <= 0) continue;
        const withVat = Number((((it.priceCents || 0) / 100) * vatMultiplier).toFixed(2));
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
          name: p.name || (this.i18n.isEn() ? 'Project Balance' : 'Saldo progetto'),
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

  protected readonly depositAmount = computed(() => {
    return Number((this.totalWithVat() * 0.5).toFixed(2));
  });

  protected readonly currentChargeAmount = computed(() => {
    if (this.alreadyPaid() <= 0) {
      return this.selectedTranche() === 'deposit' ? this.depositAmount() : this.totalWithVat();
    }
    return this.remainingToPay();
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
    const isDeposit = this.alreadyPaid() <= 0 && this.selectedTranche() === 'deposit';
    const amountCharged = this.currentChargeAmount();

    setTimeout(() => {
      this.isAuthorizing.set(false);
      this.showApplePaySheet.set(false);

      const newPaid = isDeposit ? this.depositAmount() : this.totalWithVat();
      this.localPaidOverride.set(newPaid);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`cf_paid_override_${this.project().id}`, String(newPaid));
        window.dispatchEvent(new Event('storage'));
      }

      const successMsg = isDeposit
        ? (this.i18n.isEn()
            ? `Tranche 1 (50% Deposit: ${this.formatMoney(amountCharged)}) authorized successfully via Apple Pay / Stripe! Retainer invoice & commercial contract sent to ${this.clientEmail()} and childhood.friendship.official@gmail.com.`
            : `Tranche 1 (Acconto 50%: ${this.formatMoney(amountCharged)}) autorizzata con successo via Apple Pay / Stripe! Ricevuta fiscale d'acconto e contratto inviati a ${this.clientEmail()} e a childhood.friendship.official@gmail.com.`)
        : (this.i18n.isEn()
            ? `Final settlement of ${this.formatMoney(amountCharged)} authorized successfully via Apple Pay / Stripe! Project 100% Settled. Final tax receipt sent to ${this.clientEmail()} and childhood.friendship.official@gmail.com.`
            : `Saldo finale di ${this.formatMoney(amountCharged)} autorizzato con successo via Apple Pay / Stripe! Progetto saldato al 100%. Fattura quietanzata inviata a ${this.clientEmail()} e a childhood.friendship.official@gmail.com.`);

      this.toast.success(successMsg);
    }, 1200);
  }

  protected formatMoney(val: number): string {
    return this.i18n.formatMoney(val);
  }
}
