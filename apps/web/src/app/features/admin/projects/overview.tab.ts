import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { INDEXING_STATUSES, PROJECT_STATUSES } from '@cf/shared/catalog';
import type { ClientDto, ProjectDto, ProjectHealthCheckDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { indexingStatus, projectStatus } from '../../../shared/labels';
import { ProjectStore } from './project.store';
import { QuoteEditorComponent } from './quote-editor.component';

const urlPattern = /^https?:\/\/.+/;

@Component({
  selector: 'cf-overview-tab',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, QuoteEditorComponent],
  template: `
    <div class="layout">
      <main class="stack">
        <section class="card stack-sm monitor-card">
          <div class="row-between">
            <div class="row" style="gap: 8px; align-items: center">
              <span class="monitor-icon">⚡</span>
              <h3 style="margin: 0">Monitor Uptime & Database</h3>
            </div>
            <button type="button" class="btn btn-sm btn-ghost" [disabled]="checkingHealth() || archived()" (click)="checkHealth()">
              {{ checkingHealth() ? 'Verifica…' : '🔄 Verifica adesso' }}
            </button>
          </div>

          @if (health(); as h) {
            <div class="monitor-grid">
              <div class="monitor-item" [class.healthy]="h.siteOnline" [class.danger]="h.targetUrl && !h.siteOnline">
                <div class="monitor-header">
                  <span class="status-dot" [class.dot-green]="h.siteOnline" [class.dot-red]="h.targetUrl && !h.siteOnline" [class.dot-gray]="!h.targetUrl"></span>
                  <span class="small font-bold">Sito Produzione</span>
                </div>
                @if (h.targetUrl) {
                  <div class="monitor-val">
                    <strong>{{ h.siteOnline ? 'Online (' + h.siteStatus + ')' : (h.siteError ?? 'Offline') }}</strong>
                    @if (h.siteLatencyMs !== null) { <span class="muted small mono">{{ h.siteLatencyMs }} ms</span> }
                  </div>
                  <a class="small truncate" [href]="h.targetUrl" target="_blank" rel="noopener noreferrer">{{ h.targetUrl }}</a>
                } @else {
                  <span class="muted small">Nessun URL configurato</span>
                }
              </div>

              <div class="monitor-item" [class.healthy]="h.dbConnected" [class.danger]="!h.dbConnected">
                <div class="monitor-header">
                  <span class="status-dot" [class.dot-green]="h.dbConnected" [class.dot-red]="!h.dbConnected"></span>
                  <span class="small font-bold">Database Cloud</span>
                </div>
                <div class="monitor-val">
                  <strong>{{ h.dbConnected ? 'Raggiungibile' : 'Non risponde' }}</strong>
                  <span class="muted small mono">{{ h.dbLatencyMs }} ms</span>
                </div>
                <span class="muted small">Postgres Neon collegato</span>
              </div>

              @if (h.stagingUrl) {
                <div class="monitor-item" [class.healthy]="h.stagingOnline" [class.danger]="!h.stagingOnline">
                  <div class="monitor-header">
                    <span class="status-dot" [class.dot-green]="h.stagingOnline" [class.dot-red]="!h.stagingOnline"></span>
                    <span class="small font-bold">Ambiente Staging</span>
                  </div>
                  <div class="monitor-val">
                    <strong>{{ h.stagingOnline ? 'Attivo' : 'Offline' }}</strong>
                    @if (h.stagingLatencyMs !== null) { <span class="muted small mono">{{ h.stagingLatencyMs }} ms</span> }
                  </div>
                  <a class="small truncate" [href]="h.stagingUrl" target="_blank" rel="noopener noreferrer">{{ h.stagingUrl }}</a>
                </div>
              }
            </div>
            <div class="row-between small muted">
              <span>Ultimo controllo: {{ h.checkedAt | date: 'd MMM y, HH:mm:ss' }}</span>
              @if (h.siteOnline) { <span style="color: #22c55e">✓ Sincronizzato con scheda</span> }
            </div>
          } @else {
            <div class="empty-monitor">
              <p class="muted small">Verifica in tempo reale la raggiungibilità del sito web/app e la connessione al database cloud del progetto.</p>
              <div>
                <button type="button" class="btn btn-sm btn-primary" [disabled]="checkingHealth() || archived()" (click)="checkHealth()">
                  {{ checkingHealth() ? 'Test in corso…' : 'Esegui test di connettività' }}
                </button>
              </div>
            </div>
          }
        </section>

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

        <cf-quote-editor />
      </main>

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
    .monitor-card { border: 1px solid rgba(59, 130, 246, 0.25); background: rgba(59, 130, 246, 0.03); }
    .monitor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin: 6px 0; }
    .monitor-item { padding: 10px 12px; border-radius: var(--cf-radius-sm); background: var(--cf-color-surface); border: 1px solid var(--cf-color-border); display: flex; flex-direction: column; gap: 4px; }
    .monitor-item.healthy { border-color: rgba(34, 197, 94, 0.4); }
    .monitor-item.danger { border-color: rgba(239, 68, 68, 0.4); }
    .monitor-header { display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .dot-red { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .dot-gray { background: #94a3b8; }
    .monitor-val { display: flex; justify-content: space-between; align-items: baseline; }
    .font-bold { font-weight: 600; }
    .empty-monitor { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
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
  protected readonly saving = signal(false);
  protected readonly health = signal<ProjectHealthCheckDto | null>(null);
  protected readonly checkingHealth = signal(false);
  private loadedFor = '';

  protected async checkHealth(): Promise<void> {
    const p = this.store.project();
    if (!p) return;
    this.checkingHealth.set(true);
    try {
      const res = await this.api.post<ProjectHealthCheckDto>(`/projects/${p.id}/health-check`, {});
      this.health.set(res);
      if (res.targetUrl) {
        this.form.controls.isOnline.setValue(res.siteOnline);
      }
      if (res.siteOnline && res.dbConnected) {
        this.toast.success(`Tutto operativo! Sito (${res.siteLatencyMs} ms) e Database (${res.dbLatencyMs} ms) online.`);
      } else if (!res.siteOnline && res.targetUrl) {
        this.toast.info(`Sito non raggiungibile: ${res.siteError ?? 'errore'}. Database: ${res.dbConnected ? 'OK' : 'KO'}.`);
      } else {
        this.toast.success(`Database cloud operativo (${res.dbLatencyMs} ms).`);
      }
    } catch (err) {
      this.toast.error('Errore durante la verifica: ' + (err as Error).message);
    } finally {
      this.checkingHealth.set(false);
    }
  }

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
    this.health.set(null);
    try {
      this.client.set(await this.api.get<ClientDto>(`/clients/${p.clientId}`));
    } catch (err) { this.toast.error(err); }
  }

  protected reset(): void { const p = this.store.project(); if (p) this.patchForm(p); }

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
