import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PROJECT_TYPES, PROJECT_TYPE_BASE_PRICE_CENTS, PROJECT_TYPE_LABELS, PROJECT_TYPE_SUGGESTED_PARTS, type ProjectType } from '@cf/shared/catalog';
import type { QuoteItem } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';
import { euro } from '../../../shared/labels';
import { ProjectStore } from './project.store';

interface Row { id: string; name: string; price: number | null; monthly: boolean; }

const newId = (): string => crypto.randomUUID().slice(0, 12);

/**
 * Editor Tipo di progetto, Preventivo dettagliato, Acconti/Importo Pagato e Scadenze di Pagamento.
 * Visibile solo al team/admin. Aggiorna in tempo reale lo scontrino nel portale cliente.
 */
@Component({
  selector: 'cf-quote-editor',
  imports: [FormsModule],
  template: `
    <section class="card stack quote-card">
      <div class="row-between head-bar">
        <div>
          <h2>Preventivo e Condizioni di Pagamento</h2>
          <p class="muted small">Imposta le voci del preventivo, l'importo già versato dal cliente e la scadenza del saldo.</p>
        </div>
        @if (dirty()) {
          <span class="badge-dirty">● Modifiche non salvate</span>
        } @else {
          <span class="badge-synced">✓ Sincronizzato con portale cliente</span>
        }
      </div>

      <!-- Scelta Tipologia Progetto -->
      <div class="section-group">
        <label class="section-label">TIPOLOGIA PROGETTO</label>
        <div class="types" role="radiogroup" aria-label="Tipo di progetto">
          @for (t of types; track t) {
            <button type="button" class="type" role="radio" [attr.aria-checked]="type() === t" [class.on]="type() === t"
                    [disabled]="archived()" (click)="setType(t)">
              <strong>{{ labels[t] }}</strong>
              <span class="muted small">{{ t === 'altro' ? 'su misura' : 'da ' + eur(base[t]) + (t === 'manutenzione' ? '/mese' : '') }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Voci del Preventivo -->
      <div class="section-group">
        <div class="row-between" style="margin-bottom: 8px;">
          <label class="section-label" style="margin-bottom: 0;">VOCI DEL PREVENTIVO</label>
          <span class="muted small">{{ rows().length }} voci inserite</span>
        </div>

        <div class="items">
          @if (rows().length) {
            <div class="item head muted small">
              <span>Descrizione Voce</span>
              <span>Prezzo (€)</span>
              <span class="text-center">Mensile</span>
              <span></span>
            </div>
          }
          @for (r of rows(); track r.id; let i = $index) {
            <div class="item">
              <input class="input" [ngModel]="r.name" (ngModelChange)="edit(i, { name: $event })" placeholder="Es. Sviluppo 3D, Catalogo, App..." maxlength="120"
                     [disabled]="archived()" [attr.aria-label]="'Voce ' + (i + 1)" />
              <input class="input mono" type="number" min="0" step="10" [ngModel]="r.price" (ngModelChange)="edit(i, { price: $event })"
                     [disabled]="archived()" [attr.aria-label]="'Prezzo voce ' + (i + 1)" placeholder="0.00" />
              <label class="check-cell">
                <input type="checkbox" [ngModel]="r.monthly" (ngModelChange)="edit(i, { monthly: $event })" [disabled]="archived()" aria-label="Canone mensile" />
              </label>
              <button type="button" class="btn btn-sm btn-ghost btn-del" (click)="remove(i)" [disabled]="archived()" aria-label="Rimuovi voce">✕</button>
            </div>
          } @empty {
            <div class="empty-items-box">
              <p class="muted small">Nessuna voce ancora inserita. Aggiungi il prezzo base del tipo di progetto o crea voci personalizzate.</p>
            </div>
          }
        </div>

        @if (!archived()) {
          <div class="suggest">
            <button type="button" class="btn btn-sm btn-add-row" (click)="add()">+ Aggiungi voce</button>
          </div>
        }
      </div>

      <!-- SEZIONE PAGAMENTI E SCADENZE (Richiesta utente) -->
      <div class="payment-control-box">
        <div class="box-title-row">
          <span class="box-icon">💳</span>
          <h3 class="box-title">Stato Pagamenti & Scadenza Saldatura</h3>
        </div>

        <div class="payment-grid">
          <!-- PARTE GIÀ PAGATA DALL'UTENTE -->
          <div class="pay-field-col">
            <label class="field-label" for="paid-input">
              <span>IMPORTO GIÀ PAGATO DALL'UTENTE (€)</span>
            </label>
            <div class="input-money-wrap">
              <span class="currency-symbol">€</span>
              <input
                id="paid-input"
                class="input input-money font-mono"
                type="number"
                min="0"
                step="50"
                [disabled]="archived()"
                [ngModel]="paidEuros()"
                (ngModelChange)="onPaidEurosChange($event)"
                placeholder="0.00" />
            </div>
          </div>

          <!-- SCADENZA PAGAMENTO -->
          <div class="pay-field-col">
            <label class="field-label" for="deadline-input">
              <span>SCADENZA PAGAMENTO</span>
            </label>
            <div class="input-date-wrap">
              <input
                id="deadline-input"
                class="input input-date font-mono"
                type="date"
                [disabled]="archived()"
                [ngModel]="paymentDeadline()"
                (ngModelChange)="onDeadlineChange($event)" />
            </div>
          </div>
        </div>

        <!-- Riepilogo Finanziario Live -->
        <div class="financial-summary-bar">
          <div class="sum-item">
            <span class="sum-label">Imponibile</span>
            <strong class="sum-val font-mono">{{ eur(oneOffCents()) }}</strong>
          </div>
          <div class="sum-item">
            <span class="sum-label">+ IVA (22%)</span>
            <span class="sum-val font-mono">{{ eur(vatCents()) }}</span>
          </div>
          <div class="sum-item sum-total">
            <span class="sum-label">Totale con IVA</span>
            <strong class="sum-val font-mono">{{ eur(totalWithVatCents()) }}</strong>
          </div>
          <div class="sum-item sum-paid">
            <span class="sum-label">Già Pagato</span>
            <strong class="sum-val font-mono text-green">{{ eur(currentPaidCents()) }}</strong>
          </div>
          <div class="sum-item sum-remaining">
            <span class="sum-label">Residuo Da Pagare</span>
            <strong class="sum-val font-mono text-amber">{{ eur(remainingCents()) }}</strong>
          </div>
        </div>
      </div>

      @if (monthlyCents() > 0) {
        <div class="monthly-callout">
          <span class="monthly-icon">🔄</span>
          <div>
            <strong>Canone Mensile Manutenzione / Assistenza: {{ eur(monthlyCents()) }}/mese</strong>
            <p class="muted small" style="margin: 2px 0 0;">Fatturato separatamente con cadenza mensile a partire dalla data di lancio del progetto.</p>
          </div>
        </div>
      }

      <!-- Pulsanti Azione -->
      <div class="form-actions-row">
        <button type="button" class="btn btn-ghost" [disabled]="!dirty()" (click)="reset()">Annulla modifiche</button>
        <button type="button" class="btn btn-primary btn-save" [disabled]="saving() || !dirty() || archived()" (click)="save()">
          {{ saving() ? 'Salvataggio in corso…' : 'Salva preventivo e scadenze' }}
        </button>
      </div>
    </section>
  `,
  styles: `
    .quote-card {
      background: rgba(18, 16, 28, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .head-bar {
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .head-bar h2 {
      margin: 0 0 4px;
      font-size: 1.35rem;
      color: #F8FAFC;
    }

    .badge-dirty {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.76rem;
      font-weight: 600;
      color: #FCD34D;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .badge-synced {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.76rem;
      font-weight: 600;
      color: #6EE7B7;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .section-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-family: 'DM Mono', monospace;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: rgba(248, 250, 252, 0.5);
    }

    .types {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }
    .type {
      display: grid;
      gap: 2px;
      text-align: left;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: inherit;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .type:hover:not(:disabled) {
      border-color: rgba(167, 139, 250, 0.5);
      background: rgba(255, 255, 255, 0.06);
    }
    .type.on {
      border-color: rgba(167, 139, 250, 0.8);
      background: rgba(124, 58, 237, 0.2);
      box-shadow: 0 0 16px rgba(124, 58, 237, 0.2);
    }
    .type strong {
      font-size: 0.88rem;
      color: #F8FAFC;
    }

    .items {
      display: grid;
      gap: 8px;
    }
    .item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 130px 64px 38px;
      gap: 8px;
      align-items: center;
    }
    .item.head {
      padding: 0 4px;
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
    }
    .check-cell {
      display: flex;
      justify-content: center;
    }
    .btn-del {
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .btn-del:hover {
      opacity: 1;
      color: #EF4444;
    }

    .empty-items-box {
      padding: 18px;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 8px;
    }

    .suggest {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      margin-top: 4px;
    }
    .btn-add-row {
      background: rgba(124, 58, 237, 0.15);
      border-color: rgba(167, 139, 250, 0.4);
      color: #DDD6FE;
    }
    .chip {
      border: 1px dashed rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(248, 250, 252, 0.6);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.76rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chip:hover {
      color: #FFFFFF;
      border-color: rgba(167, 139, 250, 0.5);
      background: rgba(124, 58, 237, 0.1);
    }
    .chip.strong {
      border-style: solid;
      border-color: rgba(167, 139, 250, 0.6);
      color: #DDD6FE;
    }

    /* SEZIONE PAGAMENTI E SCADENZE */
    .payment-control-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(167, 139, 250, 0.25);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .box-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .box-icon {
      font-size: 1.15rem;
    }
    .box-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #F8FAFC;
      margin: 0;
    }

    .payment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    @media (max-width: 720px) {
      .payment-grid {
        grid-template-columns: 1fr;
      }
    }

    .pay-field-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.76rem;
      font-weight: 700;
      color: rgba(248, 250, 252, 0.7);
      letter-spacing: 0.04em;
    }
    .hint-small {
      font-size: 0.7rem;
      font-weight: 400;
      color: rgba(248, 250, 252, 0.4);
    }

    .input-money-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .currency-symbol {
      position: absolute;
      left: 12px;
      font-weight: 700;
      color: rgba(248, 250, 252, 0.5);
      font-size: 0.95rem;
      pointer-events: none;
    }
    .input-money {
      padding-left: 30px;
      font-size: 1.05rem;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.4);
      border-color: rgba(255, 255, 255, 0.12);
      color: #4ADE80;
    }
    .input-date {
      font-size: 0.92rem;
      background: rgba(0, 0, 0, 0.4);
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .quick-chip {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(248, 250, 252, 0.75);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.12s;
    }
    .quick-chip:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: #FFF;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .quick-chip.chip-success {
      color: #4ADE80;
      border-color: rgba(74, 222, 128, 0.3);
      background: rgba(74, 222, 128, 0.08);
    }
    .quick-chip.chip-accent {
      color: #DDD6FE;
      border-color: rgba(167, 139, 250, 0.3);
      background: rgba(124, 58, 237, 0.1);
    }

    /* Riepilogo Finanziario */
    .financial-summary-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .sum-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sum-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(248, 250, 252, 0.5);
    }
    .sum-val {
      font-size: 1.05rem;
      color: #F8FAFC;
    }
    .sum-total .sum-val {
      font-size: 1.25rem;
      font-weight: 800;
      color: #FFF;
    }
    .text-green { color: #4ADE80 !important; }
    .text-amber { color: #FCD34D !important; }

    .monthly-callout {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(96, 165, 250, 0.25);
      border-radius: 10px;
      padding: 12px 16px;
      color: #93C5FD;
      font-size: 0.85rem;
    }
    .monthly-icon {
      font-size: 1.4rem;
    }

    /* Form actions */
    .form-actions-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .btn-save {
      padding: 8px 24px;
      font-size: 0.9rem;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteEditorComponent {
  protected readonly store = inject(ProjectStore);
  private readonly toast = inject(ToastService);
  protected readonly types = PROJECT_TYPES;
  protected readonly labels = PROJECT_TYPE_LABELS;
  protected readonly base = PROJECT_TYPE_BASE_PRICE_CENTS;
  protected readonly eur = euro;
  protected readonly archived = this.store.archived;

  protected readonly type = signal<ProjectType>('altro');
  protected readonly rows = signal<Row[]>([]);
  protected readonly dirty = signal(false);
  protected readonly saving = signal(false);

  // Campi pagamento e scadenze (richiesta utente)
  protected readonly paidCents = signal<number | null>(null);
  protected readonly paymentDeadline = signal<string>('');

  protected readonly suggestions = computed(() => {
    const used = new Set(this.rows().map((r) => r.name.trim().toLowerCase()));
    return PROJECT_TYPE_SUGGESTED_PARTS[this.type()].filter((s) => !used.has(s.toLowerCase()));
  });

  protected readonly hasBase = computed(() => this.rows().some((r) => r.name.startsWith('Prezzo base')));
  protected readonly oneOffCents = computed(() => this.rows().filter((r) => !r.monthly).reduce((a, r) => a + toCents(r.price), 0));
  protected readonly vatCents = computed(() => Math.round(this.oneOffCents() * 0.22));
  protected readonly totalWithVatCents = computed(() => this.oneOffCents() + this.vatCents());
  protected readonly monthlyCents = computed(() => this.rows().filter((r) => r.monthly).reduce((a, r) => a + toCents(r.price), 0));

  protected readonly paidEuros = computed(() => {
    const c = this.paidCents();
    return c !== null ? Number((c / 100).toFixed(2)) : null;
  });

  protected readonly currentPaidCents = computed(() => {
    const c = this.paidCents();
    if (c !== null) return c;
    // Default 50% di acconto sul totale se non esplicitato
    return Math.round(this.totalWithVatCents() * 0.5);
  });

  protected readonly remainingCents = computed(() => {
    return Math.max(0, this.totalWithVatCents() - this.currentPaidCents());
  });

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (p && !this.dirty()) {
        this.load(p.type, p.quoteItems, p.paidAmountCents ?? null, p.paymentDeadline ?? p.deadline ?? '');
      }
    });
  }

  private load(type: ProjectType, items: QuoteItem[], paidCents: number | null, paymentDeadline: string): void {
    this.type.set(type);
    this.rows.set(items.map((i) => ({ id: i.id, name: i.name, price: i.priceCents / 100, monthly: i.monthly })));
    this.paidCents.set(paidCents);
    this.paymentDeadline.set(paymentDeadline);
  }

  protected setType(t: ProjectType): void {
    this.type.set(t);
    this.dirty.set(true);
  }

  protected add(name = ''): void {
    this.rows.update((l) => [...l, { id: newId(), name, price: null, monthly: this.type() === 'manutenzione' }]);
    this.dirty.set(true);
  }

  protected addBase(): void {
    const t = this.type();
    this.rows.update((l) => [{ id: newId(), name: `Prezzo base ${this.labels[t]}`, price: this.base[t] / 100, monthly: t === 'manutenzione' }, ...l]);
    this.dirty.set(true);
  }

  protected edit(i: number, patch: Partial<Row>): void {
    this.rows.update((l) => l.map((r, k) => (k === i ? { ...r, ...patch } : r)));
    this.dirty.set(true);
  }

  protected remove(i: number): void {
    this.rows.update((l) => l.filter((_, k) => k !== i));
    this.dirty.set(true);
  }

  protected onPaidEurosChange(euros: number | null): void {
    if (euros === null || euros === undefined || isNaN(Number(euros)) || Number(euros) < 0) {
      this.paidCents.set(null);
    } else {
      this.paidCents.set(Math.round(Number(euros) * 100));
    }
    this.dirty.set(true);
  }

  protected setPaidPercent(pct: number): void {
    const total = this.totalWithVatCents();
    if (pct <= 0) {
      this.paidCents.set(0);
    } else if (pct >= 100) {
      this.paidCents.set(total);
    } else {
      this.paidCents.set(Math.round(total * (pct / 100)));
    }
    this.dirty.set(true);
  }

  protected onDeadlineChange(dateStr: string): void {
    this.paymentDeadline.set(dateStr || '');
    this.dirty.set(true);
  }

  protected setQuickDeadlineDays(days: number): void {
    const d = new Date();
    d.setDate(d.getDate() + days);
    this.paymentDeadline.set(d.toISOString().slice(0, 10));
    this.dirty.set(true);
  }

  protected setQuickDeadlineMonthEnd(): void {
    const d = new Date();
    // Ultimo giorno del mese corrente
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    this.paymentDeadline.set(end.toISOString().slice(0, 10));
    this.dirty.set(true);
  }

  protected useProjectDeliveryDeadline(): void {
    const d = this.store.project()?.deadline;
    if (d) {
      this.paymentDeadline.set(d);
      this.dirty.set(true);
    }
  }

  protected reset(): void {
    const p = this.store.project();
    this.dirty.set(false);
    if (p) this.load(p.type, p.quoteItems, p.paidAmountCents ?? null, p.paymentDeadline ?? p.deadline ?? '');
  }

  protected async save(): Promise<void> {
    const items = this.rows().filter((r) => r.name.trim() || r.price);
    if (items.some((r) => !r.name.trim())) {
      this.toast.error('Ogni voce con un prezzo deve avere un nome');
      return;
    }
    if (items.some((r) => r.price !== null && (Number(r.price) < 0 || !Number.isFinite(Number(r.price))))) {
      this.toast.error('Prezzi non validi');
      return;
    }

    this.saving.set(true);
    try {
      await this.store.update({
        type: this.type(),
        quoteItems: items.map((r) => ({ id: r.id, name: r.name.trim(), priceCents: toCents(r.price), monthly: r.monthly })),
        paidAmountCents: this.paidCents(),
        paymentDeadline: this.paymentDeadline() || null
      });
      this.dirty.set(false);
      this.reset();
      this.toast.success('Preventivo e scadenze di pagamento salvati con successo');
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.saving.set(false);
    }
  }
}

function toCents(v: number | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
