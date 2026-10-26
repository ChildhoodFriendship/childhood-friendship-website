import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PHASES, type Phase } from '@cf/shared/catalog';
import type { AiUsageDto, TaskDto, UserDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { percent, phaseLabel } from '../../../shared/labels';
import { ProjectStore } from './project.store';

@Component({
  selector: 'cf-checklist-tab',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="stack">
      <form class="card row" (ngSubmit)="add()">
        <input class="input grow" name="title" [(ngModel)]="newTitle" placeholder="Nuovo task…" aria-label="Titolo nuovo task" [disabled]="archived()" />
        <input class="input" style="width: auto" type="date" name="due" [(ngModel)]="newDue" aria-label="Scadenza" />
        <button class="btn btn-primary" [disabled]="!newTitle.trim() || archived()">Aggiungi</button>
      </form>

      @for (g of groups(); track g.phase) {
        <section class="card card-tight">
          <header class="group-head">
            <h2>{{ phaseLabel(g.phase) }}</h2>
            <span class="muted small mono">{{ g.done }}/{{ g.tasks.length }}</span>
            <div class="progress" style="width: 120px"><span [style.width.%]="g.pct"></span></div>
          </header>
          <ul class="tasks">
            @for (t of g.tasks; track t.id) {
              <li [class.done]="t.done" [class.late]="isLate(t)">
                <label class="check grow">
                  <input type="checkbox" [checked]="t.done" (change)="toggle(t)" [disabled]="archived()" />
                  <span class="title">{{ t.title }}</span>
                </label>
                @if (t.documentId) { <a class="small" [routerLink]="['../documenti', t.documentId]">documento</a> }
                <select class="select sel-sm" [ngModel]="t.assigneeId ?? ''" (ngModelChange)="patch(t, { assigneeId: $event || null })" [disabled]="archived()" aria-label="Assegnatario">
                  <option value="">— nessuno</option>
                  @for (u of team(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
                </select>
                <input class="input date" type="date" [ngModel]="t.dueDate ?? ''" (ngModelChange)="patch(t, { dueDate: $event || null })" [disabled]="archived()" aria-label="Scadenza" />
                @if (aiEnabled() && !t.done) {
                  <button class="btn btn-ghost btn-sm" title="Stima scadenza con AI" (click)="estimate(t)" [disabled]="estimating() === t.id || archived()">{{ estimating() === t.id ? '…' : '✦ AI' }}</button>
                }
                <button class="btn btn-ghost btn-sm icon-btn" (click)="remove(t)" [disabled]="archived()" aria-label="Elimina task">✕</button>
              </li>
            }
          </ul>
        </section>
      } @empty {
        <div class="card empty"><strong>Nessun task</strong>Aggiungi il primo task qui sopra.</div>
      }
    </div>
  `,
  styles: `
    .group-head { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--cf-color-border); }
    .group-head h2 { flex: 1; font-size: 1rem; }
    .tasks { list-style: none; margin: 0; padding: 0; }
    .tasks li { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--cf-color-border); flex-wrap: wrap; }
    .tasks li:last-child { border-bottom: 0; }
    .tasks li.done .title { text-decoration: line-through; color: var(--cf-color-text-muted); }
    .tasks li.late .date { border-color: var(--cf-color-danger); color: var(--cf-color-danger); }
    .date { width: 150px; min-height: 30px; padding: 4px 8px; font-size: 13px; }
    .sel-sm { width: 150px; min-height: 30px; padding: 4px 8px; font-size: 13px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChecklistTab {
  private readonly store = inject(ProjectStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly phases = PHASES;
  protected readonly phaseLabel = phaseLabel;
  protected readonly archived = this.store.archived;
  protected readonly tasks = signal<TaskDto[]>([]);
  protected readonly team = signal<UserDto[]>([]);
  protected readonly aiEnabled = signal(false);
  protected readonly estimating = signal<string | null>(null);
  protected newTitle = '';
  protected newPhase: Phase = 'realizzazione';
  protected newDue = '';
  private readonly today = new Date().toISOString().slice(0, 10);

  protected readonly groups = computed(() => PHASES.map((phase) => {
    const tasks = this.tasks().filter((t) => t.phase === phase);
    const done = tasks.filter((t) => t.done).length;
    return { phase, tasks, done, pct: percent(done, tasks.length) };
  }).filter((g) => g.tasks.length));

  constructor() {
    effect(() => { const id = this.store.id(); if (id) void this.load(id); });
  }

  private async load(projectId: string): Promise<void> {
    try {
      const [tasks, users, ai] = await Promise.all([
        this.api.get<TaskDto[]>(`/projects/${projectId}/tasks`),
        this.api.get<UserDto[]>('/users'),
        this.api.get<AiUsageDto>('/ai/usage')
      ]);
      this.tasks.set(tasks);
      this.team.set(users.filter((u) => u.role !== 'client' && u.isActive));
      this.aiEnabled.set(ai.enabled);
    } catch (err) { this.toast.error(err); }
  }

  protected isLate(t: TaskDto): boolean { return !t.done && !!t.dueDate && t.dueDate < this.today; }

  private replace(row: TaskDto): void { this.tasks.update((list) => list.map((x) => (x.id === row.id ? row : x))); }

  protected async toggle(t: TaskDto): Promise<void> {
    await this.patch(t, { done: !t.done });
    void this.store.refresh();
  }

  protected async patch(t: TaskDto, patch: Partial<Pick<TaskDto, 'done' | 'dueDate' | 'assigneeId' | 'title'>>): Promise<void> {
    try { this.replace(await this.api.patch<TaskDto>(`/projects/${this.store.id()}/tasks/${t.id}`, patch)); }
    catch (err) { this.toast.error(err); }
  }

  protected async add(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title) return;
    try {
      const row = await this.api.post<TaskDto>(`/projects/${this.store.id()}/tasks`, { title, phase: this.newPhase, dueDate: this.newDue || null });
      this.tasks.update((list) => [...list, row]);
      this.newTitle = '';
      this.newDue = '';
      void this.store.refresh();
    } catch (err) { this.toast.error(err); }
  }

  protected async remove(t: TaskDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare il task "${t.title}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try {
      await this.api.delete(`/projects/${this.store.id()}/tasks/${t.id}`);
      this.tasks.update((list) => list.filter((x) => x.id !== t.id));
      void this.store.refresh();
    } catch (err) { this.toast.error(err); }
  }

  protected async estimate(t: TaskDto): Promise<void> {
    this.estimating.set(t.id);
    try {
      const r = await this.api.post<{ dueDate: string; reasoning: string }>(`/projects/${this.store.id()}/ai/tasks/${t.id}/due-date`);
      await this.patch(t, { dueDate: r.dueDate });
      this.toast.info(`Scadenza proposta ${r.dueDate}: ${r.reasoning}`);
    } catch (err) { this.toast.error(err); } finally { this.estimating.set(null); }
  }
}
