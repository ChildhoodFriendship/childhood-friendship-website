import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { AuditDto, Paginated } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';

const ENTITIES = ['user', 'invite', 'client', 'project', 'task', 'document', 'credential', 'appointment', 'marketing_campaign', 'marketing_analysis', 'lead'];

@Component({
  selector: 'cf-audit-page',
  imports: [DatePipe, JsonPipe, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div><span class="eyebrow">Sicurezza</span><h1>Registro attività</h1><p>Chi ha fatto cosa e quando. Include accessi e visualizzazione credenziali.</p></div>
        <select class="select" style="width: auto" [(ngModel)]="entity" (ngModelChange)="go(1)" aria-label="Filtra per entità">
          <option value="">Tutte le entità</option>@for (e of entities; track e) { <option [value]="e">{{ e }}</option> }
        </select>
      </header>
      <section class="card card-tight"><div class="table-wrap"><table class="table">
        <thead><tr><th>Quando</th><th>Utente</th><th>Azione</th><th>Dettagli</th></tr></thead>
        <tbody>
          @for (a of items(); track a.id) {
            <tr>
              <td class="nowrap small">{{ a.createdAt | date: 'd MMM y, HH:mm:ss' }}</td>
              <td>{{ a.actorName ?? 'Sistema' }}</td>
              <td class="mono small">{{ a.action }}</td>
              <td class="mono small muted meta">{{ hasMeta(a) ? (a.meta | json) : '' }}</td>
            </tr>
          } @empty { <tr><td colspan="4"><div class="empty">Nessuna attività.</div></td></tr> }
        </tbody>
      </table></div></section>
      <div class="row-between">
        <span class="muted small">{{ total() }} eventi</span>
        <div class="row">
          <button class="btn btn-sm" [disabled]="page() <= 1" (click)="go(page() - 1)">← Più recenti</button>
          <button class="btn btn-sm" [disabled]="page() * 50 >= total()" (click)="go(page() + 1)">Meno recenti →</button>
        </div>
      </div>
    </div>
  `,
  styles: `.meta { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly entities = ENTITIES;
  protected readonly items = signal<AuditDto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected entity = '';

  ngOnInit(): void { void this.go(1); }
  protected hasMeta(a: AuditDto): boolean { return Object.keys(a.meta).length > 0; }

  protected async go(p: number): Promise<void> {
    this.page.set(p);
    try {
      const r = await this.api.get<Paginated<AuditDto>>('/audit', { entity: this.entity, page: p, pageSize: 50 });
      this.items.set(r.items); this.total.set(r.total);
    } catch (err) { this.toast.error(err); }
  }
}
