import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PROJECT_TYPES, PROJECT_TYPE_BASE_PRICE_CENTS, PROJECT_TYPE_LABELS, PROJECT_TYPE_SUGGESTED_PARTS, type ProjectType } from '@cf/shared/catalog';
import type { QuoteItem } from '@cf/shared/types';
import { ToastService } from '../../../core/toast.service';
import { euro } from '../../../shared/labels';
import { ProjectStore } from './project.store';

interface Row { id: string; name: string; price: number | null; monthly: boolean; }

const newId = (): string => crypto.randomUUID().slice(0, 12);

/** Tipo di progetto e preventivo (voci con prezzo). Visibile solo al team. */
@Component({
  selector: 'cf-quote-editor',
  imports: [FormsModule],
  template: `
    <section class="card stack">
      <div class="row-between">
        <h2>Tipo e preventivo</h2>
        @if (dirty()) { <span class="small muted">Modifiche non salvate</span> } @else { <span class="small muted">Visibile solo al team</span> }
      </div>

      <div class="types" role="radiogroup" aria-label="Tipo di progetto">
        @for (t of types; track t) {
          <button type="button" class="type" role="radio" [attr.aria-checked]="type() === t" [class.on]="type() === t"
                  [disabled]="archived()" (click)="setType(t)">
            <strong>{{ labels[t] }}</strong>
            <span class="muted small">{{ t === 'altro' ? 'su misura' : 'da ' + eur(base[t]) + (t === 'manutenzione' ? '/mese' : '') }}</span>
          </button>
        }
      </div>

      <div class="items">
        @if (rows().length) {
          <div class="item head muted small"><span>Voce</span><span>Prezzo (€)</span><span>Mensile</span><span></span></div>
        }
        @for (r of rows(); track r.id; let i = $index) {
          <div class="item">
            <input class="input" [ngModel]="r.name" (ngModelChange)="edit(i, { name: $event })" placeholder="Es. Pagina servizi" maxlength="120"
                   [disabled]="archived()" [attr.aria-label]="'Voce ' + (i + 1)" />
            <input class="input mono" type="number" min="0" step="10" [ngModel]="r.price" (ngModelChange)="edit(i, { price: $event })"
                   [disabled]="archived()" [attr.aria-label]="'Prezzo voce ' + (i + 1)" />
            <label class="check-cell"><input type="checkbox" [ngModel]="r.monthly" (ngModelChange)="edit(i, { monthly: $event })" [disabled]="archived()" aria-label="Canone mensile" /></label>
            <button type="button" class="btn btn-sm btn-ghost" (click)="remove(i)" [disabled]="archived()" aria-label="Rimuovi voce">✕</button>
          </div>
        } @empty {
          <p class="muted small">Nessuna voce. Parti dal prezzo base del tipo scelto o aggiungi le parti del progetto.</p>
        }
      </div>

      @if (!archived()) {
        <div class="suggest">
          <button type="button" class="btn btn-sm" (click)="add()">+ Aggiungi voce</button>
          @if (base[type()] > 0 && !hasBase()) {
            <button type="button" class="chip strong" (click)="addBase()">+ Prezzo base {{ labels[type()] }}</button>
          }
          @for (s of suggestions(); track s) { <button type="button" class="chip" (click)="add(s)">+ {{ s }}</button> }
        </div>
      }

      <div class="totals">
        <div><span class="muted small">Totale una tantum</span><strong>{{ eur(oneOffCents()) }}</strong></div>
        @if (monthlyCents() > 0) { <div><span class="muted small">Canone mensile</span><strong>{{ eur(monthlyCents()) }}/mese</strong></div> }
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-ghost" [disabled]="!dirty()" (click)="reset()">Annulla</button>
        <button type="button" class="btn btn-primary" [disabled]="saving() || !dirty() || archived()" (click)="save()">Salva preventivo</button>
      </div>
    </section>
  `,
  styles: `
    .types { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
    .type { display: grid; gap: 2px; text-align: left; padding: 10px 12px; border-radius: var(--cf-radius-sm); border: 1px solid var(--cf-color-border);
      background: var(--cf-color-surface); color: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
    .type:hover:not(:disabled) { border-color: var(--cf-color-violet-light); }
    .type.on { border-color: var(--cf-color-violet); background: rgba(124, 58, 237, .12); }
    .type strong { font-size: .9rem; }
    .items { display: grid; gap: 8px; }
    .item { display: grid; grid-template-columns: minmax(0, 1fr) 130px 64px 40px; gap: 8px; align-items: center; }
    .item.head { padding: 0 2px; }
    .check-cell { display: flex; justify-content: center; }
    @media (max-width: 640px) { .item { grid-template-columns: minmax(0, 1fr) 96px 44px 36px; } }
    .suggest { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .chip { border: 1px dashed var(--cf-color-border); background: transparent; color: var(--cf-color-text-muted); border-radius: 999px;
      padding: 4px 10px; font-size: .78rem; cursor: pointer; }
    .chip:hover { color: var(--cf-color-text); border-color: var(--cf-color-violet-light); }
    .chip.strong { border-style: solid; border-color: var(--cf-color-violet); color: var(--cf-color-text); }
    .totals { display: flex; gap: 24px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--cf-color-border); }
    .totals div { display: grid; gap: 2px; }
    .totals strong { font-size: 1.4rem; font-variant-numeric: tabular-nums; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuoteEditorComponent {
  private readonly store = inject(ProjectStore);
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

  protected readonly suggestions = computed(() => {
    const used = new Set(this.rows().map((r) => r.name.trim().toLowerCase()));
    return PROJECT_TYPE_SUGGESTED_PARTS[this.type()].filter((s) => !used.has(s.toLowerCase()));
  });
  protected readonly hasBase = computed(() => this.rows().some((r) => r.name.startsWith('Prezzo base')));
  protected readonly oneOffCents = computed(() => this.rows().filter((r) => !r.monthly).reduce((a, r) => a + toCents(r.price), 0));
  protected readonly monthlyCents = computed(() => this.rows().filter((r) => r.monthly).reduce((a, r) => a + toCents(r.price), 0));

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (p && !this.dirty()) this.load(p.type, p.quoteItems);
    });
  }

  private load(type: ProjectType, items: QuoteItem[]): void {
    this.type.set(type);
    this.rows.set(items.map((i) => ({ id: i.id, name: i.name, price: i.priceCents / 100, monthly: i.monthly })));
  }

  protected setType(t: ProjectType): void { this.type.set(t); this.dirty.set(true); }

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

  protected remove(i: number): void { this.rows.update((l) => l.filter((_, k) => k !== i)); this.dirty.set(true); }

  protected reset(): void {
    const p = this.store.project();
    this.dirty.set(false);
    if (p) this.load(p.type, p.quoteItems);
  }

  protected async save(): Promise<void> {
    const items = this.rows().filter((r) => r.name.trim() || r.price);
    if (items.some((r) => !r.name.trim())) { this.toast.error('Ogni voce con un prezzo deve avere un nome'); return; }
    if (items.some((r) => r.price !== null && (Number(r.price) < 0 || !Number.isFinite(Number(r.price))))) { this.toast.error('Prezzi non validi'); return; }
    this.saving.set(true);
    try {
      await this.store.update({
        type: this.type(),
        quoteItems: items.map((r) => ({ id: r.id, name: r.name.trim(), priceCents: toCents(r.price), monthly: r.monthly }))
      });
      this.dirty.set(false);
      this.reset();
      this.toast.success('Preventivo salvato');
    } catch (err) { this.toast.error(err); } finally { this.saving.set(false); }
  }
}

function toCents(v: number | null): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
