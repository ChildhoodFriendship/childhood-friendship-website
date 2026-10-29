import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { computeQuote, FLAT_RATE_NOTICE, formatMoney, type Currency } from '@cf/shared/billing';
import type { PortalProjectDto } from '@cf/shared/types';
import { PortalI18nService } from '../../../core/portal-i18n.service';
import { PortalBillingStore } from '../billing.store';

/**
 * Riepilogo del preventivo: NON è un documento fiscale. Le fatture vere (numero e PDF dal servizio
 * di fatturazione elettronica) compaiono sotto, quando registrate.
 */
@Component({
  selector: 'cf-quote-receipt',
  imports: [DatePipe],
  styleUrls: ['../doc-card.css'],
  template: `
    <section class="doc-card">
      <div class="doc-head clickable" (click)="isOpen.set(!isOpen())">
        <span class="doc-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        </span>
        <div class="doc-titles">
          <h3 class="doc-title">{{ en() ? 'Quote summary' : 'Riepilogo preventivo' }}</h3>
          <div class="doc-meta">
            @if (hasQuote()) {
              <span class="pill">{{ money(quote().oneOffCents + stampTotal()) }}</span>
            }
            <span class="muted">{{ en() ? 'Not a tax invoice' : 'Non è un documento fiscale' }}</span>
          </div>
        </div>
        <div class="doc-actions no-print">
          <button type="button" class="icon-btn" (click)="print($event)" [attr.aria-label]="en() ? 'Print or save as PDF' : 'Stampa o salva in PDF'" [title]="en() ? 'Print / PDF' : 'Stampa / PDF'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
          </button>
          <button type="button" class="icon-btn" (click)="toggle($event)" [attr.aria-expanded]="isOpen()" [attr.aria-label]="isOpen() ? (en() ? 'Collapse' : 'Comprimi') : (en() ? 'Expand' : 'Espandi')">
            <svg class="chev" [class.open]="isOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      @if (isOpen()) {
        <div class="doc-body">
          @if (!hasQuote()) {
            <p class="note">{{ en() ? 'The quote is being prepared: you will see it here as soon as it is ready.' : 'Il preventivo è in preparazione: lo vedrai qui appena pronto.' }}</p>
          } @else {
            <div class="rows">
              @for (item of oneOffItems(); track $index) {
                <div class="row"><span class="label">{{ item.name }}</span><span class="amount">{{ money(item.priceCents) }}</span></div>
              }
              <div class="row total"><span class="label">{{ en() ? 'One-off total' : 'Totale una tantum' }}</span><span class="amount">{{ money(quote().oneOffCents) }}</span></div>
            </div>

            <div class="rows">
              @for (t of quote().tranches; track t.tranche) {
                <div class="row">
                  <span class="label">
                    {{ t.tranche === 'acconto' ? (en() ? '50% deposit' : 'Acconto 50%') : (en() ? '50% balance on delivery' : 'Saldo 50% alla consegna') }}
                    @if (t.stampDutyCents) { <span class="muted"> · {{ en() ? 'incl. stamp duty' : 'incl. bollo' }} {{ money(t.stampDutyCents) }}</span> }
                    @if (t.paid) { <span class="pill ok">{{ en() ? 'Paid' : 'Pagato' }}</span> }
                  </span>
                  <span class="amount">{{ money(t.totalCents) }}</span>
                </div>
              }
              <div class="row total"><span class="label">{{ en() ? 'Total due' : 'Totale dovuto' }}</span><span class="amount">{{ money(quote().oneOffCents + stampTotal()) }}</span></div>
            </div>

            @if (monthlyItems().length) {
              <div class="rows">
                @for (item of monthlyItems(); track $index) {
                  <div class="row"><span class="label">{{ item.name }}</span><span class="amount">{{ money(item.priceCents) }} / {{ en() ? 'month' : 'mese' }}</span></div>
                }
              </div>
            }

            <p class="note">{{ en() ? flatRate.en : flatRate.it }}</p>
          }

          <div class="rows">
            <div class="row total"><span class="label">{{ en() ? 'Invoices' : 'Fatture' }}</span><span class="amount"></span></div>
            @for (inv of invoices(); track inv.id) {
              <div class="row">
                <span class="label">
                  {{ en() ? 'Invoice' : 'Fattura' }} {{ inv.number }} · {{ inv.issueDate | date: (en() ? 'MM/dd/yyyy' : 'dd/MM/yyyy') }}
                  @if (inv.pdfUrl) { · <a [href]="inv.pdfUrl" target="_blank" rel="noopener">PDF</a> }
                </span>
                <span class="amount">{{ money(inv.amountCents) }}</span>
              </div>
            } @empty {
              <p class="muted">{{ en() ? 'No invoices yet: each invoice is issued electronically and sent by email with the payment request.' : 'Nessuna fattura ancora: ogni fattura è elettronica e arriva via email con la richiesta di pagamento.' }}</p>
            }
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteReceiptComponent {
  readonly project = input.required<PortalProjectDto>();
  protected readonly i18n = inject(PortalI18nService);
  private readonly store = inject(PortalBillingStore);
  protected readonly isOpen = signal(false);
  protected readonly flatRate = FLAT_RATE_NOTICE;

  protected readonly en = this.i18n.isEn;
  protected readonly currency = computed<Currency>(() => this.store.summary()?.currency ?? (this.project().currency === 'USD' ? 'USD' : 'EUR'));
  protected readonly quote = computed(() => this.store.summary()?.quote ?? computeQuote(this.project().quoteItems ?? [], 0));
  protected readonly stampTotal = computed(() => this.quote().tranches.reduce((s, t) => s + t.stampDutyCents, 0));
  protected readonly hasQuote = computed(() => this.quote().oneOffCents + this.quote().monthlyCents > 0);
  protected readonly oneOffItems = computed(() => (this.project().quoteItems ?? []).filter((i) => !i.monthly && i.priceCents > 0));
  protected readonly monthlyItems = computed(() => (this.project().quoteItems ?? []).filter((i) => i.monthly && i.priceCents > 0));
  protected readonly invoices = computed(() => this.store.summary()?.invoices ?? []);

  constructor() {
    effect(() => { void this.store.load(this.project().id).catch(() => undefined); });
  }

  protected money(cents: number): string { return formatMoney(cents, this.currency()); }

  protected toggle(e: Event): void { e.stopPropagation(); this.isOpen.set(!this.isOpen()); }

  protected print(e: Event): void {
    e.stopPropagation();
    this.isOpen.set(true);
    setTimeout(() => window.print(), 50);
  }
}
