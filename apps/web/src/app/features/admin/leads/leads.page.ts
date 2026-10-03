import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LEAD_STATUSES, type LeadStatus } from '@cf/shared/catalog';
import type { ClientDto, LeadDto, Paginated } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { ConfirmService } from '../../../shared/confirm.service';
import { LEAD_SERVICE_LABELS, leadStatus } from '../../../shared/labels';

@Component({
  selector: 'cf-leads-page',
  imports: [DatePipe, FormsModule, BadgeComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div><span class="eyebrow">Commerciale</span><h1>Lead dal sito</h1><p>Richieste arrivate dal form contatti.</p></div>
        <select class="select" style="width: auto" [(ngModel)]="status" (ngModelChange)="load()" aria-label="Filtra per stato">
          <option value="">Tutti</option>
          @for (s of statuses; track s) { <option [value]="s">{{ leadStatus(s).label }}</option> }
        </select>
      </header>
      <div class="stack">
        @for (l of items(); track l.id) {
          @let st = leadStatus(l.status);
          <article class="card stack-sm">
            <div class="row-between">
              <div><strong>{{ l.name }}</strong>@if (l.company) { <span class="muted"> · {{ l.company }}</span> }
                <div class="small"><a [href]="'mailto:' + l.email">{{ l.email }}</a>@if (l.phone) { · <a [href]="'tel:' + l.phone">{{ l.phone }}</a> }</div></div>
              <div class="row"><span class="badge">{{ serviceLabels[l.service] }}</span><cf-badge [label]="st.label" [tone]="st.tone" /><span class="muted small">{{ l.createdAt | date: 'd MMM y, HH:mm' }}</span></div>
            </div>
            <p class="msg">{{ l.message }}</p>
            <div class="row">
              <select class="select sel-sm" [ngModel]="l.status" (ngModelChange)="patch(l, { status: $event })" aria-label="Stato lead">
                @for (s of statuses; track s) { <option [value]="s">{{ leadStatus(s).label }}</option> }
              </select>
              <input class="input grow sel-sm" [ngModel]="l.notes ?? ''" (change)="patchNotes(l, $event)" placeholder="Note interne…" aria-label="Note" />
              @if (l.clientId) {
                <button class="btn btn-sm" (click)="goClient(l)">Apri cliente</button>
              } @else {
                <button class="btn btn-sm btn-primary" (click)="convert(l)">Converti in cliente</button>
              }
              @if (auth.isAdmin()) { <button class="btn btn-ghost btn-sm icon-btn" (click)="remove(l)" aria-label="Elimina lead">✕</button> }
            </div>
          </article>
        } @empty { <div class="card empty"><strong>Nessun lead</strong>Le richieste dal sito appariranno qui.</div> }
      </div>
      @if (total() > items().length) { <button class="btn" style="align-self: center" (click)="more()">Carica altri</button> }
    </div>
  `,
  styles: `.msg { white-space: pre-wrap; background: var(--cf-surface-2); padding: 12px; border-radius: 8px; }
    .sel-sm { width: auto; min-height: 30px; padding: 4px 8px; font-size: 13px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeadsPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = LEAD_STATUSES;
  protected readonly leadStatus = leadStatus;
  protected readonly serviceLabels = LEAD_SERVICE_LABELS;
  protected readonly items = signal<LeadDto[]>([]);
  protected readonly total = signal(0);
  protected status: LeadStatus | '' = '';
  private page = 1;

  ngOnInit(): void { void this.load(); }

  protected async load(append = false): Promise<void> {
    if (!append) this.page = 1;
    try {
      const r = await this.api.get<Paginated<LeadDto>>('/leads', { status: this.status, page: this.page, pageSize: 20 });
      this.items.update((l) => (append ? [...l, ...r.items] : r.items));
      this.total.set(r.total);
    } catch (err) { this.toast.error(err); }
  }
  protected more(): void { this.page++; void this.load(true); }

  private replace(l: LeadDto): void { this.items.update((list) => list.map((x) => (x.id === l.id ? l : x))); }

  protected async patch(l: LeadDto, patch: { status?: LeadStatus; notes?: string | null }): Promise<void> {
    try { this.replace(await this.api.patch<LeadDto>(`/leads/${l.id}`, patch)); } catch (err) { this.toast.error(err); }
  }
  protected patchNotes(l: LeadDto, e: Event): void {
    const v = (e.target as HTMLInputElement).value.trim();
    if (v !== (l.notes ?? '')) void this.patch(l, { notes: v || null });
  }

  protected async convert(l: LeadDto): Promise<void> {
    if (!(await this.confirm.ask(`Creare il cliente "${l.company || l.name}" con i dati del lead?`, { confirmLabel: 'Converti' }))) return;
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
