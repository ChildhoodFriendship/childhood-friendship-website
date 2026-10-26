import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PROJECT_STATUSES, type ProjectStatus } from '@cf/shared/catalog';
import type { ClientDto, Paginated, ProjectDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { percent, projectStatus } from '../../../shared/labels';
import { ModalComponent } from '../../../shared/modal.component';

@Component({
  selector: 'cf-projects-list-page',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, BadgeComponent, ModalComponent],
  template: `
    <div class="page">
      <div class="projects-toolbar">
        <div class="filters-row">
          <label class="sr-only" for="q">Cerca</label>
          <input id="q" class="input search-input" placeholder="Cerca progetto o cliente…" [(ngModel)]="q" (ngModelChange)="onSearch()" />
          <label class="sr-only" for="st">Stato</label>
          <select id="st" class="select status-select" [(ngModel)]="status" (ngModelChange)="reload()">
            <option value="">Tutti gli stati</option>
            @for (s of statuses; track s) { <option [value]="s">{{ projectStatus(s).label }}</option> }
          </select>
          <label class="check archived-check"><input type="checkbox" [(ngModel)]="archived" (ngModelChange)="reload()" /> Archiviati</label>
        </div>
        <button class="btn btn-primary btn-new" (click)="openCreate()">+ Nuovo progetto</button>
      </div>

      <section class="card card-tight">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Progetto</th><th>Cliente</th><th>Stato</th><th style="width: 180px">Avanzamento</th><th>Consegna</th><th>Online</th></tr></thead>
            <tbody>
              @for (p of items(); track p.id) {
                @let st = projectStatus(p.status);
                @let pct = pctOf(p);
                <tr class="row-link" (click)="open(p)" (keydown.enter)="open(p)" tabindex="0">
                  <td><a [routerLink]="['/admin/progetti', p.id]" (click)="$event.stopPropagation()"><strong>{{ p.name }}</strong></a></td>
                  <td class="muted">{{ p.clientName }}</td>
                  <td><cf-badge [label]="st.label" [tone]="st.tone" /></td>
                  <td><div class="row"><div class="progress grow"><span [style.width.%]="pct"></span></div><span class="mono small">{{ pct }}%</span></div></td>
                  <td class="nowrap" [class.late]="isLate(p)">{{ p.deadline ? (p.deadline | date: 'd MMM y') : '—' }}</td>
                  <td>{{ p.isOnline ? '●' : '○' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6"><div class="empty">
                  @if (loading()) { Caricamento… } @else { <strong>Nessun progetto</strong>Modifica i filtri o crea un nuovo progetto. }
                </div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (pages() > 1) {
        <div class="row-between">
          <span class="muted small">{{ total() }} totali</span>
          <div class="pagination">
            <button class="btn btn-sm" [disabled]="page() <= 1" (click)="go(page() - 1)">‹ Prec</button>
            <span class="muted small">{{ page() }} / {{ pages() }}</span>
            <button class="btn btn-sm" [disabled]="page() >= pages()" (click)="go(page() + 1)">Succ ›</button>
          </div>
        </div>
      }
    </div>

    <cf-modal [(open)]="createOpen" title="Nuovo progetto">
      <form id="new-project" class="form-grid" [formGroup]="form" (ngSubmit)="create()">
        <label class="field full"><span>Cliente *</span>
          <select class="select" formControlName="clientId">
            <option value="" disabled>Seleziona…</option>
            @for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          @if (!clients().length) { <span class="hint">Nessun cliente: <a routerLink="/admin/clienti" [queryParams]="{ nuovo: 1 }">creane uno</a>.</span> }
        </label>
        <label class="field full"><span>Nome progetto *</span><input class="input" formControlName="name" /></label>
        <label class="field full"><span>Descrizione</span><textarea class="textarea" formControlName="description" rows="3"></textarea></label>
        <label class="field"><span>Inizio</span><input class="input" type="date" formControlName="startDate" /></label>
        <label class="field"><span>Consegna</span><input class="input" type="date" formControlName="deadline" /></label>
        <label class="check full"><input type="checkbox" formControlName="withTemplate" /> Crea i 22 documenti standard e la checklist</label>
      </form>
      <div modal-footer class="modal-foot">
        <button type="button" class="btn btn-ghost" (click)="createOpen.set(false)">Annulla</button>
        <button type="submit" form="new-project" class="btn btn-primary" [disabled]="saving()">Crea progetto</button>
      </div>
    </cf-modal>
  `,
  styles: `
    .late { color: var(--cf-color-danger); }
    .projects-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .filters-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: nowrap;
      flex: 1 1 auto;
      max-width: 680px;
    }
    .search-input {
      width: 270px;
      min-width: 200px;
      flex: 0 1 270px;
    }
    .status-select {
      width: auto;
      min-width: 145px;
      flex: 0 0 auto;
    }
    .archived-check {
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-new {
      white-space: nowrap;
      flex-shrink: 0;
      margin-left: auto;
    }
    @media (max-width: 768px) {
      .filters-row {
        flex-wrap: wrap;
        max-width: 100%;
      }
      .search-input {
        width: 100%;
        flex: 1 1 100%;
      }
      .btn-new {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsListPage implements OnInit {
  readonly nuovo = input<string>();
  readonly stato = input<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly statuses = PROJECT_STATUSES;
  protected readonly projectStatus = projectStatus;
  protected readonly pageSize = 20;
  protected readonly items = signal<ProjectDto[]>([]);
  protected readonly clients = signal<ClientDto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly createOpen = signal(false);
  protected q = '';
  protected status: ProjectStatus | '' = '';
  protected clientId = '';
  protected archived = false;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    clientId: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    startDate: [''],
    deadline: [''],
    withTemplate: [true]
  });

  ngOnInit(): void {
    const s = this.stato();
    if (s && (PROJECT_STATUSES as readonly string[]).includes(s)) this.status = s as ProjectStatus;
    void this.loadClients();
    void this.reload();
    if (this.nuovo()) this.openCreate();
  }

  protected pages(): number { return Math.max(1, Math.ceil(this.total() / this.pageSize)); }
  protected pctOf(p: ProjectDto): number { return p.progress ? percent(p.progress.tasksDone, p.progress.tasksTotal) : 0; }
  protected isLate(p: ProjectDto): boolean { return !!p.deadline && p.deadline < this.today && p.status !== 'lanciato'; }
  protected open(p: ProjectDto): void { void this.router.navigate(['/admin/progetti', p.id]); }

  protected onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.reload(), 300);
  }

  protected reload(): Promise<void> { this.page.set(1); return this.load(); }
  protected go(p: number): void { this.page.set(p); void this.load(); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.get<Paginated<ProjectDto>>('/projects', {
        q: this.q.trim(), status: this.status, clientId: this.clientId, archived: this.archived, page: this.page(), pageSize: this.pageSize
      });
      this.items.set(res.items);
      this.total.set(res.total);
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadClients(): Promise<void> {
    try { this.clients.set(await this.api.get<ClientDto[]>('/clients')); } catch (err) { this.toast.error(err); }
  }

  protected openCreate(): void {
    this.form.reset({ clientId: this.clientId, name: '', description: '', startDate: this.today, deadline: '', withTemplate: true });
    this.createOpen.set(true);
  }

  protected async create(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Seleziona il cliente e inserisci il nome'); return; }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const p = await this.api.post<ProjectDto>('/projects', { ...v, startDate: v.startDate || null, deadline: v.deadline || null, description: v.description || null });
      this.createOpen.set(false);
      this.toast.success('Progetto creato');
      await this.router.navigate(['/admin/progetti', p.id]);
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.saving.set(false);
    }
  }
}
