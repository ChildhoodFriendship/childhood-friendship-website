import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DOCUMENT_STATUSES, PHASES, getDocumentTypeDef, type DocumentStatus } from '@cf/shared/catalog';
import type { DocumentDto, DocumentSummaryDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { documentStatus, phaseLabel } from '../../../shared/labels';
import { ProjectStore } from './project.store';

@Component({
  selector: 'cf-documents-tab',
  imports: [DatePipe, FormsModule, RouterLink, BadgeComponent],
  template: `
    <div class="stack">
      <div class="row-between">
        <div class="row">
          <select class="select" style="width: auto" [(ngModel)]="filter" aria-label="Filtra per stato">
            <option value="">Tutti gli stati</option>
            @for (s of statuses; track s) { <option [value]="s">{{ documentStatus(s).label }}</option> }
          </select>
          <span class="muted small">{{ counts().approved }} approvati · {{ counts().review }} in revisione</span>
        </div>
        <button class="btn" (click)="createFree()" [disabled]="store.archived()">+ Documento libero</button>
      </div>

      @for (g of groups(); track g.phase) {
        <section class="card card-tight">
          <h2 class="group-title">{{ g.label }}</h2>
          <div class="table-wrap"><table class="table">
            <tbody>
              @for (d of g.docs; track d.id) {
                @let st = documentStatus(d.status);
                <tr>
                  <td><a [routerLink]="[d.id]"><strong>{{ d.title }}</strong></a>
                    @if (!d.clientVisible) { <span class="muted small"> · interno</span> }</td>
                  <td><cf-badge [label]="st.label" [tone]="st.tone" /></td>
                  <td class="muted small mono">v{{ d.version }}</td>
                  <td class="muted small nowrap">{{ d.updatedAt | date: 'd MMM y' }}</td>
                </tr>
              }
            </tbody>
          </table></div>
        </section>
      } @empty {
        <div class="card empty"><strong>Nessun documento</strong>Crea un documento libero o cambia filtro.</div>
      }
    </div>
  `,
  styles: `.group-title { padding: 14px 16px 6px; font-size: 1rem; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsTab {
  protected readonly store = inject(ProjectStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly statuses = DOCUMENT_STATUSES;
  protected readonly documentStatus = documentStatus;
  protected readonly docs = signal<DocumentSummaryDto[]>([]);
  protected readonly filterSig = signal<DocumentStatus | ''>('');
  protected get filter(): DocumentStatus | '' { return this.filterSig(); }
  protected set filter(v: DocumentStatus | '') { this.filterSig.set(v); }

  protected readonly counts = computed(() => ({
    approved: this.docs().filter((d) => d.status === 'approvato').length,
    review: this.docs().filter((d) => d.status === 'in_revisione').length
  }));

  protected readonly groups = computed(() => {
    const f = this.filterSig();
    const list = f ? this.docs().filter((d) => d.status === f) : this.docs();
    return PHASES.map((phase) => ({
      phase, label: phaseLabel(phase),
      docs: list.filter((d) => (getDocumentTypeDef(d.type)?.phase ?? 'realizzazione') === phase)
    })).filter((g) => g.docs.length);
  });

  constructor() {
    effect(() => { const id = this.store.id(); if (id) void this.load(id); });
  }

  private async load(id: string): Promise<void> {
    try { this.docs.set(await this.api.get<DocumentSummaryDto[]>(`/projects/${id}/documents`)); }
    catch (err) { this.toast.error(err); }
  }

  protected async createFree(): Promise<void> {
    try {
      const d = await this.api.post<DocumentDto>(`/projects/${this.store.id()}/documents`, { type: 'generico', title: 'Nuovo documento' });
      await this.router.navigate(['/admin/progetti', this.store.id(), 'documenti', d.id]);
    } catch (err) { this.toast.error(err); }
  }
}
