import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { documentLanguage, type Currency } from '@cf/shared/billing';
import { buildContract } from '@cf/shared/contract';
import type { PortalProjectDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { PortalI18nService } from '../../../core/portal-i18n.service';
import { ToastService } from '../../../core/toast.service';
import { PortalBillingStore, type ContractState } from '../billing.store';

/**
 * Contratto del progetto. Il testo viene da `@cf/shared/contract`, lo stesso con cui il server
 * calcola l'impronta al momento della firma: ciò che il cliente legge è ciò che firma.
 * La lingua del contratto segue la valuta del progetto (USD = inglese), non il selettore del portale.
 */
@Component({
  selector: 'cf-project-contract',
  imports: [DatePipe],
  styleUrls: ['../doc-card.css'],
  template: `
    <section class="doc-card" [class.ok]="signed()">
      <div class="doc-head clickable" (click)="isOpen.set(!isOpen())">
        <span class="doc-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
        </span>
        <div class="doc-titles">
          <h3 class="doc-title">{{ en() ? 'Development agreement' : 'Contratto di sviluppo' }}</h3>
          <div class="doc-meta">
            @if (signed()) {
              <span class="pill ok">{{ en() ? 'Signed' : 'Firmato' }}</span>
              <span class="muted">{{ signature()?.signedAt | date: (en() ? 'MM/dd/yyyy' : 'dd/MM/yyyy') }}</span>
            } @else {
              <span class="pill warn">{{ en() ? 'To sign' : 'Da firmare' }}</span>
            }
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
          @if (signature(); as sig) {
            <p class="note">
              {{ doc().lang === 'en' ? 'Signed electronically by' : 'Firmato elettronicamente da' }} <strong>{{ sig.signerName }}</strong> &lt;{{ sig.signerEmail }}&gt;
              · {{ sig.signedAt | date: 'dd/MM/yyyy HH:mm' }} · IP {{ sig.signerIp }}<br>
              <span class="mono">SHA-256 {{ sig.signatureHash }}</span>
            </p>
          }

          <article class="contract">
            <h4 class="c-title">{{ doc().title }}</h4>
            <p class="muted">{{ doc().subtitle }} · {{ doc().lang === 'en' ? 'version' : 'versione' }} {{ doc().version }}</p>
            @for (p of doc().parties; track $index) { <p>{{ p }}</p> }
            @for (a of doc().articles; track a.title) {
              <h5>{{ a.title }}</h5>
              @for (para of a.paragraphs; track $index) { <p>{{ para }}</p> }
            }
            <h5>{{ doc().annexTitle }}</h5>
            <ul class="annex">
              @for (l of doc().annexLines; track $index) { <li>{{ l }}</li> }
            </ul>
            <h5>{{ doc().specialClausesTitle }}</h5>
            <p>{{ doc().specialClauses }}</p>
          </article>

          @if (!signed()) {
            @if (!hasQuote()) {
              <p class="note">{{ en() ? 'The quote is not ready yet: you can sign once it is.' : 'Il preventivo non è ancora pronto: potrai firmare appena lo sarà.' }}</p>
            } @else {
              <div class="sign no-print">
                <label class="field">
                  <span>{{ doc().lang === 'en' ? 'Full name of the signer (legal representative)' : 'Nome e cognome del firmatario (legale rappresentante)' }}</span>
                  <input type="text" autocomplete="name" [value]="signerName()" (input)="signerName.set($any($event.target).value)" />
                </label>
                <label class="check">
                  <input type="checkbox" [checked]="accepted()" (change)="accepted.set($any($event.target).checked)" />
                  <span>{{ doc().lang === 'en'
                    ? 'I have read the agreement and Annex A and I specifically approve the clauses listed above.'
                    : 'Ho letto il contratto e l\\'Allegato A e approvo specificamente le clausole sopra indicate.' }}</span>
                </label>
                <button type="button" class="btn-primary-cf" [disabled]="!canSign() || submitting()" (click)="sign()">
                  {{ submitting() ? (en() ? 'Signing…' : 'Firma in corso…') : (doc().lang === 'en' ? 'Sign the agreement' : 'Firma il contratto') }}
                </button>
                <p class="muted">{{ doc().lang === 'en'
                  ? 'Electronic signature: we record name, email, date, IP address and a SHA-256 fingerprint of this exact text. A copy is sent to your email.'
                  : 'Firma elettronica: registriamo nome, email, data, indirizzo IP e l\\'impronta SHA-256 di questo testo. Una copia arriva alla tua email.' }}</p>
              </div>
            }
          }
        </div>
      }
    </section>
  `,
  styles: `
    .contract { display: flex; flex-direction: column; gap: 8px; font-size: 13.5px; }
    .contract p { margin: 0; }
    .c-title { margin: 0; font-size: 15px; letter-spacing: 0.02em; color: #fff; }
    .contract h5 { margin: 8px 0 0; font-size: 13px; color: #c4b5fd; }
    .annex { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; overflow-wrap: anywhere; }
    .sign { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #a79bc2; }
    .field input { min-height: 44px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(0, 0, 0, 0.25); color: #fff; font-size: 15px; }
    .check { display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: start; font-size: 13px; }
    .check input { width: 18px; height: 18px; margin-top: 2px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectContractComponent {
  readonly project = input.required<PortalProjectDto>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly store = inject(PortalBillingStore);
  protected readonly i18n = inject(PortalI18nService);
  protected readonly en = this.i18n.isEn;

  protected readonly isOpen = signal(false);
  protected readonly signerName = signal('');
  protected readonly accepted = signal(false);
  protected readonly submitting = signal(false);

  protected readonly signature = computed(() => this.store.contract()?.signature ?? null);
  protected readonly signed = computed(() => this.store.contract()?.signed ?? false);
  private readonly currency = computed<Currency>(() => (this.project().currency === 'USD' ? 'USD' : 'EUR'));
  protected readonly hasQuote = computed(() => (this.project().quoteItems ?? []).some((i) => i.priceCents > 0));
  protected readonly doc = computed(() => buildContract({
    lang: documentLanguage(this.currency()),
    projectName: this.project().name,
    clientName: this.project().clientName ?? (this.currency() === 'USD' ? 'Client' : 'Committente'),
    currency: this.currency(),
    items: this.project().quoteItems ?? []
  }));
  protected readonly canSign = computed(() => this.signerName().trim().length >= 3 && this.accepted());

  constructor() {
    effect(() => { void this.store.load(this.project().id).catch(() => undefined); });
    effect(() => { if (this.store.contract() && !this.signed() && this.hasQuote()) this.isOpen.set(true); });
  }

  protected toggle(e: Event): void { e.stopPropagation(); this.isOpen.set(!this.isOpen()); }

  protected print(e: Event): void {
    e.stopPropagation();
    this.isOpen.set(true);
    setTimeout(() => window.print(), 50);
  }

  protected async sign(): Promise<void> {
    if (!this.canSign() || this.submitting()) return;
    this.submitting.set(true);
    try {
      const res = await this.api.post<ContractState>(`/projects/${this.project().id}/contract/sign`, {
        signerName: this.signerName().trim(), vexatiousAccepted: true, locale: this.doc().lang
      });
      this.store.contract.set(res);
      this.toast.success(this.en() ? 'Agreement signed. A copy has been sent to your email.' : 'Contratto firmato. Una copia è stata inviata alla tua email.');
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.submitting.set(false);
    }
  }
}
