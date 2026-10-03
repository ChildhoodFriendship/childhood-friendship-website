import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { DocumentDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { BadgeComponent } from '../../shared/badge.component';
import { ConfirmService } from '../../shared/confirm.service';
import { DocumentViewComponent } from '../../shared/document-view.component';
import { documentStatus } from '../../shared/labels';

@Component({
  selector: 'cf-portal-document-page',
  imports: [DatePipe, FormsModule, RouterLink, BadgeComponent, DocumentViewComponent],
  template: `
    <div class="page" style="max-width: 860px">
      @if (doc(); as d) {
        <header class="stack-sm no-print">
          <a [routerLink]="['/portale/progetti', projectId()]" class="small">← Torna al progetto</a>
          <div class="row-between">
            <h1>{{ d.title }}</h1>
            <div class="row">
              @let st = status();
              @if (st) { <cf-badge [label]="st.label" [tone]="st.tone" /> }
              <button class="btn btn-ghost btn-sm" (click)="print()">Scarica PDF</button>
            </div>
          </div>
          <span class="muted small">Aggiornato il {{ d.updatedAt | date: 'd MMMM y' }} · versione {{ d.version }}</span>
        </header>

        <article class="card print-area">
          <h1 class="print-only">{{ d.title }}</h1>
          <cf-document-view [doc]="d" />
        </article>

        @if (d.status === 'in_revisione') {
          <section class="card stack no-print review">
            <h2>La tua revisione</h2>
            <p class="muted small">Approvando confermi i contenuti e il team potrà procedere con la fase successiva.</p>
            <label class="field"><span>Commento {{ mode() === 'changes' ? '(obbligatorio)' : '(facoltativo)' }}</span>
              <textarea class="textarea" rows="3" [(ngModel)]="comment" placeholder="Cosa vorresti cambiare?"></textarea></label>
            <div class="form-actions">
              <button class="btn" (click)="review('request_changes')" [disabled]="busy()">Richiedi modifiche</button>
              <button class="btn btn-primary" (click)="review('approve')" [disabled]="busy()">Approva documento</button>
            </div>
          </section>
        } @else if (d.status === 'approvato') {
          <div class="alert no-print">✓ Hai approvato questo documento il {{ d.reviewedAt | date: 'd MMMM y' }}.</div>
        } @else if (d.status === 'modifiche_richieste') {
          <div class="alert alert-warn no-print">Hai richiesto modifiche: "{{ d.reviewComment }}". Il team ti invierà una nuova versione.</div>
        }
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      } @else {
        <div class="skeleton" style="height: 300px"></div>
      }
    </div>
  `,
  styles: `.review { border-color: rgba(139, 92, 246, .5); } .print-only { display: none; } @media print { .print-only { display: block; } }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalDocumentPage {
  readonly projectId = input.required<string>();
  readonly docId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly doc = signal<DocumentDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly mode = signal<'approve' | 'changes'>('approve');
  protected readonly status = computed(() => { const d = this.doc(); return d ? documentStatus(d.status) : null; });
  protected comment = '';

  constructor() {
    effect(() => { void this.load(this.projectId(), this.docId()); });
  }

  private async load(projectId: string, docId: string): Promise<void> {
    try { this.doc.set(await this.api.get<DocumentDto>(`/projects/${projectId}/documents/${docId}`)); }
    catch (err) { this.error.set((err as Error).message); }
  }

  protected async review(decision: 'approve' | 'request_changes'): Promise<void> {
    this.mode.set(decision === 'approve' ? 'approve' : 'changes');
    if (decision === 'request_changes' && !this.comment.trim()) { this.toast.error('Scrivi quali modifiche desideri'); return; }
    if (decision === 'approve' && !(await this.confirm.ask('Confermi di approvare il documento?', { confirmLabel: 'Approva' }))) return;
    this.busy.set(true);
    try {
      this.doc.set(await this.api.post<DocumentDto>(`/projects/${this.projectId()}/documents/${this.docId()}/review`, { decision, comment: this.comment.trim() || null }));
      this.comment = '';
      this.toast.success(decision === 'approve' ? 'Grazie, documento approvato!' : 'Richiesta inviata al team');
    } catch (err) { this.toast.error(err); } finally { this.busy.set(false); }
  }

  protected print(): void { window.print(); }
}
