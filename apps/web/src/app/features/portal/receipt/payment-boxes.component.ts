import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { computeQuote, formatMoney, INVOICE_WITHIN_DAYS, type Currency, type TrancheCalc } from '@cf/shared/billing';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { PortalI18nService } from '../../../core/portal-i18n.service';
import { ToastService } from '../../../core/toast.service';
import { PortalBillingStore } from '../billing.store';

/**
 * Pagamenti del progetto. Lo stato "pagato" arriva solo dal server (webhook del gateway o bonifico
 * registrato dal team). Finché il pagamento online non è attivo il cliente vede quando riceverà
 * fattura e link: nessuna simulazione.
 */
@Component({
  selector: 'cf-payment-boxes',
  imports: [DatePipe],
  styleUrls: ['../doc-card.css'],
  template: `
    <div class="stack">
      @for (t of tranches(); track t.tranche) {
        <section class="doc-card" [class.ok]="t.paid">
          <div class="doc-head">
            <span class="doc-icon" aria-hidden="true">
              @if (t.paid) {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              } @else {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              }
            </span>
            <div class="doc-titles">
              <h3 class="doc-title">{{ label(t) }}</h3>
              <div class="doc-meta">
                <span class="pill" [class.ok]="t.paid" [class.warn]="!t.paid && isNext(t)">{{ status(t) }}</span>
                @if (t.stampDutyCents) { <span class="muted">{{ en() ? 'incl. stamp duty' : 'incl. bollo' }} {{ money(t.stampDutyCents) }}</span> }
              </div>
            </div>
            <strong class="big">{{ money(t.totalCents) }}</strong>
          </div>

          @if (!t.paid && isNext(t)) {
            <div class="doc-body">
              @if (!contractSigned()) {
                <p class="note">{{ en() ? 'Sign the agreement in the Documents tab first.' : 'Prima firma il contratto nella sezione Documenti.' }}</p>
              } @else if (paymentsEnabled()) {
                <button type="button" class="btn-primary-cf" [disabled]="busy()" (click)="pay(t)">
                  {{ busy() ? (en() ? 'Opening secure page…' : 'Apertura pagina sicura…') : (en() ? 'Pay by card or Apple Pay' : 'Paga con carta o Apple Pay') }}
                </button>
                <p class="muted">{{ en() ? 'You will be redirected to Stripe\\'s secure page. The electronic invoice follows by email.' : 'Verrai portato sulla pagina sicura di Stripe. La fattura elettronica arriva via email.' }}</p>
              } @else {
                <p class="note">
                  {{ en()
                    ? 'Nothing to pay yet. You will receive the invoice and the payment link by email within ' + days + ' days of signing the agreement.'
                    : 'Per ora non devi pagare nulla. Riceverai fattura e link di pagamento via email entro ' + days + ' giorni dalla firma del contratto.' }}
                </p>
              }
            </div>
          }
        </section>
      } @empty {
        <section class="doc-card"><div class="doc-body"><p class="note">{{ en() ? 'The quote is being prepared.' : 'Il preventivo è in preparazione.' }}</p></div></section>
      }

      @if (monthlyCents()) {
        <p class="muted">{{ en() ? 'Recurring fees' : 'Canoni ricorrenti' }}: {{ money(monthlyCents()) }} / {{ en() ? 'month' : 'mese' }}</p>
      }

      @if (paymentsDone().length) {
        <section class="doc-card">
          <div class="doc-body">
            <div class="rows">
              @for (p of paymentsDone(); track p.id) {
                <div class="row">
                  <span class="label">{{ p.tranche === 'acconto' ? (en() ? 'Deposit' : 'Acconto') : p.tranche === 'saldo' ? (en() ? 'Balance' : 'Saldo') : p.tranche }} · {{ p.paidAt | date: (en() ? 'MM/dd/yyyy' : 'dd/MM/yyyy') }}</span>
                  <span class="amount">{{ money(p.amountCents) }}</span>
                </div>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .stack { display: flex; flex-direction: column; gap: 12px; }
    .big { font-size: 17px; font-weight: 800; color: #fff; white-space: nowrap; font-variant-numeric: tabular-nums; }
    @media (max-width: 420px) { .big { font-size: 15px; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentBoxesComponent {
  readonly project = input.required<PortalProjectDto>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(PortalBillingStore);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly en = this.i18n.isEn;
  protected readonly busy = signal(false);
  protected readonly days = INVOICE_WITHIN_DAYS;

  protected readonly currency = computed<Currency>(() => this.store.summary()?.currency ?? (this.project().currency === 'USD' ? 'USD' : 'EUR'));
  protected readonly quote = computed(() => this.store.summary()?.quote ?? computeQuote(this.project().quoteItems ?? [], this.project().paidAmountCents ?? 0));
  protected readonly tranches = computed(() => this.quote().tranches);
  protected readonly monthlyCents = computed(() => this.quote().monthlyCents);
  protected readonly paymentsEnabled = computed(() => this.store.summary()?.paymentsEnabled ?? false);
  protected readonly contractSigned = computed(() => this.store.contract()?.signed ?? false);
  protected readonly paymentsDone = computed(() => (this.store.summary()?.payments ?? []).filter((p) => p.status === 'riuscito'));

  constructor() {
    effect(() => {
      const id = this.project().id;
      const esito = this.route.snapshot.queryParamMap.get('pagamento');
      void this.store.load(id, esito === 'ok').catch(() => undefined);
      if (esito === 'ok') this.toast.info(this.en() ? 'Payment received: the status updates within a few seconds.' : 'Pagamento ricevuto: lo stato si aggiorna entro pochi secondi.');
    });
  }

  protected isNext(t: TrancheCalc): boolean { return this.quote().next?.tranche === t.tranche; }

  protected label(t: TrancheCalc): string {
    if (t.tranche === 'acconto') return this.en() ? '50% deposit' : 'Acconto 50%';
    return this.en() ? '50% balance on delivery' : 'Saldo 50% alla consegna';
  }

  protected status(t: TrancheCalc): string {
    if (t.paid) return this.en() ? 'Paid' : 'Pagato';
    if (!this.isNext(t)) return this.en() ? 'Later' : 'Più avanti';
    return this.paymentsEnabled() ? (this.en() ? 'To pay' : 'Da pagare') : (this.en() ? 'Invoice coming' : 'Fattura in arrivo');
  }

  protected money(cents: number): string { return formatMoney(cents, this.currency()); }

  protected async pay(t: TrancheCalc): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { url } = await this.api.post<{ url: string }>(`/projects/${this.project().id}/billing/checkout`, { tranche: t.tranche });
      if (!/^https:\/\/checkout\.stripe\.com\//.test(url)) throw new Error('Indirizzo di pagamento non valido');
      window.location.assign(url);
    } catch (err) {
      this.toast.error(err);
      this.busy.set(false);
    }
  }
}
