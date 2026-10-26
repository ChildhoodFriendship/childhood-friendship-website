import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LEAD_STATUSES, type LeadStatus } from '@cf/shared/catalog';
import type { LeadPatch } from '@cf/shared/schemas';
import type { ClientDto, LeadDto, Paginated } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { ConfirmService } from '../../../shared/confirm.service';
import { LEAD_SERVICE_LABELS, euro, leadStatus } from '../../../shared/labels';

const SERVICES = ['Sito vetrina', 'Landing page', 'Sito + menu digitale', 'Ordini online / asporto', 'Prenotazioni online', 'Web app', 'App mobile', 'Scheda Google + SEO locale', 'Manutenzione'];

/**
 * CRM unico: richieste dal form del sito e locali trovati dalla prospezione automatica (n8n),
 * con stato, progetto chiuso, prezzo fatto e servizio offerto.
 */
@Component({
  selector: 'cf-leads-page',
  imports: [DatePipe, FormsModule, BadgeComponent],
  template: `
    <div class="page">




      <section class="kpis" aria-label="Riepilogo">
        <div class="card stat"><span class="muted">Totale</span><strong>{{ total() }}</strong></div>
        <div class="card stat"><span class="muted">Chiusi (pagina)</span><strong>{{ closed().length }}</strong></div>
        <div class="card stat"><span class="muted">Fatturato chiuso (pagina)</span><strong class="ok">{{ eur(closedCents()) }}</strong></div>
      </section>

      <div class="filters">
        <div class="chips" role="group" aria-label="Origine">
          @for (s of sources; track s.value) {
            <button type="button" class="chip" [class.on]="source === s.value" (click)="source = s.value; load()">{{ s.label }}</button>
          }
        </div>
        <select class="select" style="width: auto" [(ngModel)]="status" (ngModelChange)="load()" aria-label="Filtra per stato">
          <option value="">Tutti gli stati</option>
          @for (s of statuses; track s) { <option [value]="s">{{ leadStatus(s).label }}</option> }
        </select>
        <input class="input grow" type="search" [(ngModel)]="q" (ngModelChange)="search()" placeholder="Cerca nome, categoria, indirizzo, servizio…" aria-label="Cerca" />
      </div>

      <datalist id="cf-servizi">@for (s of serviceOptions; track s) { <option [value]="s"></option> }</datalist>

      <div class="stack">
        @for (l of items(); track l.id) {
          @let st = leadStatus(l.status);
          <article class="card stack-sm lead" [class.won]="l.status === 'convertito'">
            <div class="row-between top">
              <div class="who">
                <div class="row name">
                  @if (l.score !== null) { <span class="score" [class.hot]="l.score >= 75" [class.warm]="l.score >= 60 && l.score < 75">{{ l.score }}</span> }
                  <strong>{{ l.company || l.name }}</strong>
                  @if (l.company && l.company !== l.name) { <span class="muted">· {{ l.name }}</span> }
                </div>
                <div class="small muted">
                  @if (l.category) { {{ l.category }} · }@if (l.address) { {{ l.address }} }
                </div>
                <div class="small links">
                  @if (l.email) { <a [href]="'mailto:' + l.email">{{ l.email }}</a> }
                  @if (l.phone) { <a [href]="'tel:' + l.phone.replace(' ', '')">{{ l.phone }}</a> }
                  @if (l.waLink) { <a class="tag wa" [href]="l.waLink" target="_blank" rel="noopener">WhatsApp</a> }
                  @if (l.mapsUrl) { <a class="tag" [href]="l.mapsUrl" target="_blank" rel="noopener">Scheda Google</a> }
                  @if (l.website) { <a class="tag" [href]="l.website" target="_blank" rel="noopener">Sito attuale</a> }
                </div>
              </div>
              <div class="row meta">
                <span class="badge">{{ l.source === 'sito' ? 'Form sito' : 'Prospezione' }}</span>
                <cf-badge [label]="st.label" [tone]="st.tone" />
                <span class="muted small">{{ l.createdAt | date: 'd MMM y' }}</span>
              </div>
            </div>

            @if (l.message) { <p class="msg">{{ l.message }}</p> }
            @if (l.outreachMessage) { <details><summary class="small">Messaggio di primo contatto</summary><p class="msg">{{ l.outreachMessage }}</p></details> }

            <div class="grid-edit">
              <label class="field"><span>Stato</span>
                <select class="select sel-sm" [ngModel]="l.status" (ngModelChange)="patch(l, { status: $event })">
                  @for (s of statuses; track s) { <option [value]="s">{{ leadStatus(s).label }}</option> }
                </select></label>
              <label class="field"><span>Progetto chiuso</span>
                <span class="switch"><input type="checkbox" [checked]="l.status === 'convertito'" (change)="toggleClosed(l, $event)" /><span></span></span></label>
              <label class="field"><span>Prezzo fatto (€)</span>
                <input class="input sel-sm" inputmode="decimal" [value]="priceText(l)" (change)="patchPrice(l, $event)" placeholder="0" /></label>
              <label class="field wide"><span>Servizio offerto</span>
                <input class="input sel-sm" list="cf-servizi" [value]="l.offeredService ?? ''" (change)="patchText(l, 'offeredService', $event)" placeholder="Es. Sito vetrina" /></label>
              <label class="field wide"><span>Note interne</span>
                <input class="input sel-sm" [value]="l.notes ?? ''" (change)="patchText(l, 'notes', $event)" placeholder="Note…" /></label>
            </div>

            <div class="row actions">
              @if (l.clientId) {
                <button class="btn btn-sm" (click)="goClient(l)">Apri cliente</button>
              } @else {
                <button class="btn btn-sm btn-primary" (click)="convert(l)">Crea cliente</button>
              }
              @if (l.closedAt) { <span class="muted small">Chiuso il {{ l.closedAt | date: 'd MMM y' }}</span> }
              @if (auth.isAdmin()) { <button class="btn btn-ghost btn-sm icon-btn del" (click)="remove(l)" aria-label="Elimina lead">✕</button> }
            </div>
          </article>
        } @empty { <div class="card empty"><strong>Nessun lead</strong>Le richieste dal sito e la prospezione automatica appariranno qui.</div> }
      </div>
      @if (total() > items().length) { <button class="btn" style="align-self: center" (click)="more()">Carica altri</button> }
    </div>
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
    .ok { color: var(--cf-color-success); }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .chips { display: flex; gap: 6px; }
    .chip { border: 1px solid var(--cf-color-border); background: var(--cf-color-surface); color: var(--cf-color-text); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
    .chip.on { background: var(--cf-color-violet); border-color: var(--cf-color-violet); color: #fff; }
    .lead.won { border-color: rgba(34, 197, 94, .45); }
    .top { align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .name { gap: 8px; align-items: center; }
    .score { display: inline-grid; place-items: center; min-width: 34px; height: 24px; border-radius: 6px; font-size: 12px; font-weight: 700; background: var(--cf-violet-soft); color: var(--cf-color-violet-light); }
    .score.hot { background: rgba(239, 68, 68, .15); color: #f87171; }
    .score.warm { background: rgba(245, 158, 11, .15); color: #fbbf24; }
    .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; align-items: center; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--cf-surface-2); text-decoration: none !important; }
    .tag.wa { background: rgba(34, 197, 94, .15); color: #4ade80 !important; }
    .meta { gap: 8px; flex-wrap: wrap; }
    .msg { white-space: pre-wrap; background: var(--cf-surface-2); padding: 12px; border-radius: 8px; margin: 0; }
    details summary { cursor: pointer; color: var(--cf-color-text-muted); }
    details .msg { margin-top: 8px; }
    .grid-edit { display: grid; grid-template-columns: 170px 120px 140px 1fr 1fr; gap: 10px; align-items: end; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--cf-color-text-muted); }
    .sel-sm { min-height: 32px; padding: 4px 8px; font-size: 13px; }
    .switch { position: relative; display: inline-block; width: 42px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch span { position: absolute; inset: 0; background: var(--cf-color-border); border-radius: 999px; transition: .2s; cursor: pointer; }
    .switch span::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
    .switch input:checked + span { background: var(--cf-color-success); }
    .switch input:checked + span::before { transform: translateX(18px); }
    .switch input:focus-visible + span { outline: 2px solid var(--cf-color-violet-light); }
    .actions { gap: 10px; align-items: center; }
    .del { margin-left: auto; }
    @media (max-width: 900px) { .grid-edit { grid-template-columns: 1fr 1fr; } .wide { grid-column: 1 / -1; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeadsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = LEAD_STATUSES;
  protected readonly leadStatus = leadStatus;
  protected readonly serviceLabels = LEAD_SERVICE_LABELS;
  protected readonly serviceOptions = SERVICES;
  protected readonly sources = [{ value: '', label: 'Tutti' }, { value: 'sito', label: 'Form sito' }, { value: 'n8n', label: 'Prospezione' }];
  protected readonly items = signal<LeadDto[]>([]);
  protected readonly total = signal(0);
  protected readonly closed = computed(() => this.items().filter((l) => l.status === 'convertito'));
  protected readonly closedCents = computed(() => this.closed().reduce((s, l) => s + (l.priceCents ?? 0), 0));
  protected readonly eur = euro;
  protected status: LeadStatus | '' = '';
  protected source = '';
  protected q = '';
  private page = 1;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.q = qp.get('q') ?? '';
    this.source = qp.get('origine') ?? '';
    const stato = qp.get('stato');
    if (stato && (LEAD_STATUSES as readonly string[]).includes(stato)) this.status = stato as LeadStatus;
    void this.load();
  }

  protected async load(append = false): Promise<void> {
    if (!append) this.page = 1;
    try {
      const r = await this.api.get<Paginated<LeadDto>>('/leads', { status: this.status, source: this.source, q: this.q, page: this.page, pageSize: 30 });
      this.items.update((l) => (append ? [...l, ...r.items] : r.items));
      this.total.set(r.total);
    } catch (err) { this.toast.error(err); }
  }
  protected more(): void { this.page++; void this.load(true); }
  protected search(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  private replace(l: LeadDto): void { this.items.update((list) => list.map((x) => (x.id === l.id ? l : x))); }

  protected async patch(l: LeadDto, patch: LeadPatch): Promise<void> {
    try { this.replace(await this.api.patch<LeadDto>(`/leads/${l.id}`, patch)); } catch (err) { this.toast.error(err); }
  }
  protected toggleClosed(l: LeadDto, e: Event): void {
    const on = (e.target as HTMLInputElement).checked;
    void this.patch(l, { status: on ? 'convertito' : 'qualificato' });
  }
  protected patchText(l: LeadDto, key: 'notes' | 'offeredService', e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v !== (l[key] ?? '')) void this.patch(l, { [key]: v || null });
  }
  protected priceText(l: LeadDto): string {
    return l.priceCents === null ? '' : (l.priceCents / 100).toLocaleString('it-IT', { maximumFractionDigits: 2 });
  }
  protected patchPrice(l: LeadDto, e: Event): void {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
    const cents = raw ? Math.round(Number(raw) * 100) : null;
    if (cents !== null && !Number.isFinite(cents)) { this.toast.error('Prezzo non valido'); return; }
    if (cents !== l.priceCents) void this.patch(l, { priceCents: cents });
  }

  protected async convert(l: LeadDto): Promise<void> {
    if (!(await this.confirm.ask(`Creare il cliente "${l.company || l.name}" con i dati del lead?`, { confirmLabel: 'Crea cliente' }))) return;
    try {
      const r = await this.api.post<{ lead: LeadDto; client: ClientDto }>(`/leads/${l.id}/convert`);
      this.replace(r.lead);
      this.toast.success('Cliente creato');
    } catch (err) { this.toast.error(err); }
  }
  protected goClient(l: LeadDto): void { void this.router.navigate(['/admin/clienti'], { queryParams: { id: l.clientId } }); }

  protected async remove(l: LeadDto): Promise<void> {
    if (!(await this.confirm.ask('Eliminare definitivamente il lead (es. richiesta GDPR)?', { danger: true, confirmLabel: 'Elimina' }))) return;
    try { await this.api.delete(`/leads/${l.id}`); this.items.update((x) => x.filter((i) => i.id !== l.id)); } catch (err) { this.toast.error(err); }
  }
}
