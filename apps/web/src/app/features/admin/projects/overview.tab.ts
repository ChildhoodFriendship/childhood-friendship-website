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


const urlPattern = /^https?:\/\/.+/;

@Component({
  selector: 'cf-overview-tab',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <div class="layout">
      <main class="stack">
        <section class="card stack-sm monitor-card">
          <div class="row-between">
            <div class="row" style="gap: 8px; align-items: center">
              <span class="monitor-icon">⚡</span>
              <h3 style="margin: 0">Monitor Uptime & Servizi</h3>
            </div>
            @if (checkingHealth()) {
              <span class="checking-badge">Verifica automatica in corso…</span>
            } @else if (health()?.checkedAt) {
              <span class="checked-time">Live · {{ health()!.checkedAt | date: 'HH:mm:ss' }}</span>
            }
          </div>

          <div class="monitor-grid">
            <!-- Database Cloud Neon (Sempre testato) -->
            <div class="monitor-item" [class.healthy]="health()?.dbConnected" [class.danger]="health() && !health()?.dbConnected">
              <div class="monitor-header">
                <span class="status-dot" [class.dot-green]="health()?.dbConnected" [class.dot-red]="health() && !health()?.dbConnected" [class.dot-gray]="!health()"></span>
                <span class="small font-bold">Database Cloud</span>
              </div>
              <div class="monitor-val">
                <strong>{{ health() ? (health()?.dbConnected ? 'Raggiungibile' : 'Non risponde') : 'In verifica…' }}</strong>
                @if (health()?.dbLatencyMs !== undefined) { <span class="muted small mono">{{ health()?.dbLatencyMs }} ms</span> }
              </div>
              <span class="muted small">Postgres Neon collegato</span>
            </div>

            <!-- Sito / Web App Produzione -->
            <div class="monitor-item" [class.healthy]="health()?.siteOnline" [class.danger]="health()?.targetUrl && !health()?.siteOnline">
              <div class="monitor-header">
                <span class="status-dot" [class.dot-green]="health()?.siteOnline" [class.dot-red]="health()?.targetUrl && !health()?.siteOnline" [class.dot-gray]="!health()?.targetUrl"></span>
                <span class="small font-bold">Sito / App Produzione</span>
              </div>
              @if (health()?.targetUrl) {
                <div class="monitor-val">
                  <strong>{{ health()?.siteOnline ? 'Online (' + health()?.siteStatus + ')' : (health()?.siteError ?? 'Offline') }}</strong>
                  @if (health()?.siteLatencyMs !== null) { <span class="muted small mono">{{ health()?.siteLatencyMs }} ms</span> }
                </div>
                <a class="small truncate" [href]="health()!.targetUrl!" target="_blank" rel="noopener noreferrer">{{ health()!.targetUrl }}</a>
              } @else {
                <div class="monitor-val"><strong>Non configurato</strong></div>
                <span class="muted small">Imposta URL produzione sotto</span>
              }
            </div>

            <!-- Eventuali Accessi / Servizi con URL (Dominio, Hosting, Store...) -->
            @for (ap of health()?.accessProbes ?? []; track ap.service) {
              <div class="monitor-item" [class.healthy]="ap.online" [class.danger]="!ap.online">
                <div class="monitor-header">
                  <span class="status-dot" [class.dot-green]="ap.online" [class.dot-red]="!ap.online"></span>
                  <span class="small font-bold">{{ ap.service }}</span>
                </div>
                <div class="monitor-val">
                  <strong>{{ ap.online ? 'Online (' + (ap.status ?? 200) + ')' : (ap.error ?? 'Offline') }}</strong>
                  @if (ap.latencyMs !== null) { <span class="muted small mono">{{ ap.latencyMs }} ms</span> }
                </div>
                <a class="small truncate" [href]="ap.url" target="_blank" rel="noopener noreferrer">{{ ap.url }}</a>
              </div>
            }

            @if (health()?.stagingUrl) {
              <div class="monitor-item" [class.healthy]="health()?.stagingOnline" [class.danger]="!health()?.stagingOnline">
                <div class="monitor-header">
                  <span class="status-dot" [class.dot-green]="health()?.stagingOnline" [class.dot-red]="!health()?.stagingOnline"></span>
                  <span class="small font-bold">Staging</span>
                </div>
                <div class="monitor-val">
                  <strong>{{ health()?.stagingOnline ? 'Attivo' : 'Offline' }}</strong>
                  @if (health()?.stagingLatencyMs !== null) { <span class="muted small mono">{{ health()?.stagingLatencyMs }} ms</span> }
                </div>
                <a class="small truncate" [href]="health()!.stagingUrl!" target="_blank" rel="noopener noreferrer">{{ health()!.stagingUrl }}</a>
              </div>
            }
          </div>
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
            <div class="form-actions full">
              <div class="client-link-side">
                @if (client(); as c) {
                  <a routerLink="/admin/clienti" [queryParams]="{ id: c.id }" class="client-chip-link" title="Apri scheda cliente">
                    <span class="client-chip-label">Cliente:</span>
                    <strong class="client-chip-name">{{ c.name }}</strong>
                    <span class="client-chip-arrow">↗</span>
                  </a>
                }
              </div>
              <div class="buttons-side">
                <button type="button" class="btn btn-ghost" [disabled]="!form.dirty" (click)="reset()">Annulla</button>
                <button class="btn btn-primary" [disabled]="saving() || !form.dirty || archived()">Salva</button>
              </div>
            </div>
          </form>
        </section>


      </main>

      
    </div>
  `,
  styles: `
    .layout { display: flex; flex-direction: column; gap: 16px; }
    .form-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .buttons-side { display: flex; gap: 8px; align-items: center; }
    .client-chip-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(167, 139, 250, 0.1);
      border: 1px solid rgba(167, 139, 250, 0.35);
      color: #F6F1FF !important;
      text-decoration: none !important;
      font-size: 0.88rem;
      transition: all 0.15s ease;
    }
    .client-chip-link:hover {
      background: rgba(124, 58, 237, 0.25);
      border-color: #C4B5FD;
      transform: translateY(-1px);
    }
    .client-chip-label {
      color: rgba(246, 241, 255, 0.65);
      font-weight: 500;
    }
    .client-chip-name {
      color: #DDD6FE;
      font-weight: 700;
    }
    .client-chip-arrow {
      color: #A78BFA;
      font-size: 0.9rem;
    }
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
    status: ['in_sviluppo' as ProjectDto['status']],
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
        void this.checkHealth();
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
