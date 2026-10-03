import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { INDEXING_STATUSES, PROJECT_STATUSES } from '@cf/shared/catalog';
import type { AppointmentDto, ClientDto, ProjectDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { indexingStatus, projectStatus } from '../../../shared/labels';
import { ProjectStore } from './project.store';

const urlPattern = /^https?:\/\/.+/;

@Component({
  selector: 'cf-overview-tab',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <div class="layout">
      <section class="card stack">
        <div class="row-between"><h2>Dettagli progetto</h2>
          @if (form.dirty) { <span class="small muted">Modifiche non salvate</span> }
        </div>
        <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
          <label class="field full"><span>Nome</span><input class="input" formControlName="name" /></label>
          <label class="field full"><span>Descrizione</span><textarea class="textarea" formControlName="description" rows="3"></textarea></label>
          <label class="field"><span>Stato</span>
            <select class="select" formControlName="status">@for (s of statuses; track s) { <option [value]="s">{{ projectStatus(s).label }}</option> }</select>
          </label>
          <label class="field"><span>Indicizzazione</span>
            <select class="select" formControlName="indexingStatus">@for (s of indexing; track s) { <option [value]="s">{{ indexingStatus(s).label }}</option> }</select>
          </label>
          <label class="field"><span>Inizio</span><input class="input" type="date" formControlName="startDate" /></label>
          <label class="field"><span>Consegna</span><input class="input" type="date" formControlName="deadline" /></label>
          <label class="field"><span>URL produzione</span><input class="input" formControlName="targetUrl" placeholder="https://" /></label>
          <label class="field"><span>URL staging</span><input class="input" formControlName="stagingUrl" placeholder="https://" /></label>
          <label class="field full"><span>Repository</span><input class="input" formControlName="repositoryUrl" placeholder="https://github.com/…" /></label>
          <label class="check"><input type="checkbox" formControlName="isOnline" /> Sito online</label>
          <label class="check"><input type="checkbox" formControlName="marketingEnabled" /> Gestiamo il marketing</label>
          @if (form.controls.marketingEnabled.value) {
            <label class="field"><span>Budget marketing (€)</span><input class="input" type="number" min="0" step="50" formControlName="marketingBudget" /></label>
          }
          <div class="form-actions full">
            <button type="button" class="btn btn-ghost" [disabled]="!form.dirty" (click)="reset()">Annulla</button>
            <button class="btn btn-primary" [disabled]="saving() || !form.dirty || archived()">Salva</button>
          </div>
        </form>
      </section>

      <aside class="stack">
        @if (client(); as c) {
          <section class="card stack-sm">
            <div class="row-between"><h3>Cliente</h3><a routerLink="/admin/clienti" [queryParams]="{ id: c.id }" class="small">Scheda</a></div>
            <strong>{{ c.name }}</strong>
            @if (c.vatNumber) { <span class="muted small">P.IVA {{ c.vatNumber }}</span> }
            @if (c.contactName) { <span>{{ c.contactName }}</span> }
            @if (c.contactEmail) { <a [href]="'mailto:' + c.contactEmail">{{ c.contactEmail }}</a> }
            @if (c.contactPhone) { <a [href]="'tel:' + c.contactPhone">{{ c.contactPhone }}</a> }
            @if (c.openingHours) { <span class="muted small">Orari: {{ c.openingHours }}</span> }
          </section>
        }

        <section class="card stack-sm">
          <h3>Appuntamenti</h3>
          @for (a of appointments(); track a.id) {
            <div class="appt" [class.past]="isPast(a)">
              <div class="grow"><strong>{{ a.title }}</strong><br /><span class="muted small">{{ a.startsAt | date: 'EEE d MMM y, HH:mm' }}{{ a.kind ? ' · ' + a.kind : '' }}</span></div>
              <button class="btn btn-ghost btn-sm icon-btn" (click)="removeAppointment(a)" aria-label="Elimina appuntamento">✕</button>
            </div>
          } @empty { <p class="muted small">Nessun appuntamento.</p> }
          <form class="stack-sm" [formGroup]="apptForm" (ngSubmit)="addAppointment()">
            <input class="input" formControlName="title" placeholder="Es. Call di allineamento" aria-label="Titolo appuntamento" />
            <div class="row">
              <input class="input grow" type="datetime-local" formControlName="startsAt" aria-label="Data e ora" />
              <button class="btn btn-sm" [disabled]="apptForm.invalid || archived()">Aggiungi</button>
            </div>
          </form>
        </section>

        <section class="card stack-sm">
          <h3>Zona pericolosa</h3>
          @if (archived()) {
            <button class="btn" (click)="toggleArchive(false)">Ripristina progetto</button>
            @if (auth.isAdmin()) { <button class="btn btn-danger" (click)="remove()">Elimina definitivamente</button> }
          } @else {
            <button class="btn btn-danger" (click)="toggleArchive(true)">Archivia progetto</button>
            <p class="muted small">L'archiviazione rende il progetto di sola lettura per tutti.</p>
          }
        </section>
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
    .appt { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--cf-color-border); }
    .appt.past { opacity: .55; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewTab {
  private readonly store = inject(ProjectStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = PROJECT_STATUSES;
  protected readonly indexing = INDEXING_STATUSES;
  protected readonly projectStatus = projectStatus;
  protected readonly indexingStatus = indexingStatus;
  protected readonly archived = this.store.archived;
  protected readonly client = signal<ClientDto | null>(null);
  protected readonly appointments = signal<AppointmentDto[]>([]);
  protected readonly saving = signal(false);
  private loadedFor = '';

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    status: ['pianificazione' as ProjectDto['status']],
    indexingStatus: ['non_indicizzato' as ProjectDto['indexingStatus']],
    startDate: [''],
    deadline: [''],
    targetUrl: ['', Validators.pattern(urlPattern)],
    stagingUrl: ['', Validators.pattern(urlPattern)],
    repositoryUrl: ['', Validators.pattern(urlPattern)],
    isOnline: [false],
    marketingEnabled: [false],
    marketingBudget: [0]
  });
  protected readonly apptForm = this.fb.group({ title: ['', Validators.required], startsAt: ['', Validators.required] });

  constructor() {
    effect(() => {
      const p = this.store.project();
      if (!p) return;
      if (!this.form.dirty) this.patchForm(p);
      if (this.loadedFor !== p.id) {
        this.loadedFor = p.id;
        void this.loadSide(p);
      }
    });
  }

  private patchForm(p: ProjectDto): void {
    this.form.reset({
      name: p.name, description: p.description ?? '', status: p.status, indexingStatus: p.indexingStatus,
      startDate: p.startDate ?? '', deadline: p.deadline ?? '', targetUrl: p.targetUrl ?? '', stagingUrl: p.stagingUrl ?? '',
      repositoryUrl: p.repositoryUrl ?? '', isOnline: p.isOnline, marketingEnabled: p.marketingEnabled,
      marketingBudget: Math.round((p.marketingBudgetCents ?? 0) / 100)
    });
  }

  private async loadSide(p: ProjectDto): Promise<void> {
    try {
      const [client, appts] = await Promise.all([
        this.api.get<ClientDto>(`/clients/${p.clientId}`),
        this.api.get<AppointmentDto[]>(`/projects/${p.id}/appointments`)
      ]);
      this.client.set(client);
      this.appointments.set(appts);
    } catch (err) { this.toast.error(err); }
  }

  protected reset(): void { const p = this.store.project(); if (p) this.patchForm(p); }
  protected isPast(a: AppointmentDto): boolean { return new Date(a.startsAt) < new Date(); }

  protected async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Controlla i campi evidenziati (gli URL devono iniziare con https://)'); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    try {
      await this.store.update({
        name: v.name, description: v.description || null, status: v.status, indexingStatus: v.indexingStatus,
        startDate: v.startDate || null, deadline: v.deadline || null, targetUrl: v.targetUrl || null, stagingUrl: v.stagingUrl || null,
        repositoryUrl: v.repositoryUrl || null, isOnline: v.isOnline, marketingEnabled: v.marketingEnabled,
        marketingBudgetCents: v.marketingEnabled ? Math.round((Number(v.marketingBudget) || 0) * 100) : null
      });
      this.form.markAsPristine();
      this.reset();
      this.toast.success('Progetto aggiornato');
    } catch (err) { this.toast.error(err); } finally { this.saving.set(false); }
  }

  protected async addAppointment(): Promise<void> {
    const v = this.apptForm.getRawValue();
    try {
      const a = await this.api.post<AppointmentDto>(`/projects/${this.store.id()}/appointments`, { title: v.title, startsAt: new Date(v.startsAt).toISOString() });
      this.appointments.update((list) => [...list, a].sort((x, y) => x.startsAt.localeCompare(y.startsAt)));
      this.apptForm.reset();
    } catch (err) { this.toast.error(err); }
  }

  protected async removeAppointment(a: AppointmentDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare "${a.title}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try {
      await this.api.delete(`/projects/${this.store.id()}/appointments/${a.id}`);
      this.appointments.update((list) => list.filter((x) => x.id !== a.id));
    } catch (err) { this.toast.error(err); }
  }

  protected async toggleArchive(archive: boolean): Promise<void> {
    if (archive && !(await this.confirm.ask('Il progetto diventerà di sola lettura anche per il cliente.', { title: 'Archiviare il progetto?', confirmLabel: 'Archivia', danger: true }))) return;
    try { await this.store.setArchived(archive); this.toast.success(archive ? 'Progetto archiviato' : 'Progetto ripristinato'); }
    catch (err) { this.toast.error(err); }
  }

  protected async remove(): Promise<void> {
    const p = this.store.project();
    if (!p || !(await this.confirm.ask(`Eliminare definitivamente "${p.name}" con documenti, messaggi e accessi? L'operazione non è reversibile.`, { title: 'Elimina progetto', confirmLabel: 'Elimina', danger: true }))) return;
    try {
      await this.api.delete(`/projects/${p.id}`);
      this.toast.success('Progetto eliminato');
      await this.router.navigateByUrl('/admin/progetti');
    } catch (err) { this.toast.error(err); }
  }
}
