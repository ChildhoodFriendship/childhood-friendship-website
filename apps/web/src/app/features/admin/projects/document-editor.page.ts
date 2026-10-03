import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getDocumentTypeDef, type DocumentFieldDef } from '@cf/shared/catalog';
import type { AiTextResult, AiUsageDto, DocumentDto, DocumentVersionDto } from '@cf/shared/types';
import { Api, ApiError } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { ConfirmService } from '../../../shared/confirm.service';
import { DocumentViewComponent } from '../../../shared/document-view.component';
import { documentStatus } from '../../../shared/labels';
import { MarkdownPipe } from '../../../shared/markdown';
import { ModalComponent } from '../../../shared/modal.component';
import { ProjectStore } from './project.store';

interface Snapshot { version: number; title: string; content: string; data: Record<string, unknown>; createdAt: string; }

@Component({
  selector: 'cf-document-editor-page',
  imports: [DatePipe, FormsModule, RouterLink, BadgeComponent, DocumentViewComponent, MarkdownPipe, ModalComponent],
  template: `
    @if (doc(); as d) {
      <div class="layout">
        <div class="stack main no-print">
          <div class="row-between">
            <a routerLink="../" class="small">← Documenti</a>
            <div class="row">
              @let st = statusInfo();
              @if (st) { <cf-badge [label]="st.label" [tone]="st.tone" /> }
              <span class="muted small mono">v{{ d.version }}</span>
            </div>
          </div>

          @if (d.status === 'modifiche_richieste' && d.reviewComment) {
            <div class="alert alert-warn"><strong>Modifiche richieste dal cliente:</strong> {{ d.reviewComment }}</div>
          }
          @if (conflict()) {
            <div class="alert alert-error row-between">Qualcun altro ha salvato una versione più recente.
              <button class="btn btn-sm" (click)="reload()">Ricarica (perdi le modifiche)</button></div>
          }

          <section class="card stack">
            <label class="field"><span>Titolo</span><input class="input" [(ngModel)]="title" (ngModelChange)="touch()" [disabled]="readonly()" /></label>
            @if (def()?.fields?.length) {
              <div class="form-grid">
                @for (f of def()!.fields; track f.key) {
                  <label class="field" [class.full]="f.kind !== 'text' && f.kind !== 'url'">
                    <span>{{ f.label }}{{ f.required ? ' *' : '' }}</span>
                    @switch (f.kind) {
                      @case ('list') {
                        <textarea class="textarea" rows="4" [(ngModel)]="fields[f.key]" (ngModelChange)="touch()" [disabled]="readonly()"></textarea>
                        <span class="hint">Un elemento per riga</span>
                      }
                      @case ('textarea') { <textarea class="textarea" rows="4" [(ngModel)]="fields[f.key]" (ngModelChange)="touch()" [disabled]="readonly()"></textarea> }
                      @default { <input class="input" [type]="f.kind === 'url' ? 'url' : 'text'" [(ngModel)]="fields[f.key]" (ngModelChange)="touch()" [disabled]="readonly()" [placeholder]="f.kind === 'url' ? 'https://' : ''" /> }
                    }
                  </label>
                }
              </div>
            }
          </section>

          <section class="card stack">
            <div class="row-between">
              <div class="tabs" style="border: 0">
                <button type="button" [class.active]="!preview()" (click)="preview.set(false)">Modifica</button>
                <button type="button" [class.active]="preview()" (click)="preview.set(true)">Anteprima</button>
              </div>
              @if (aiEnabled() && !readonly()) {
                <button class="btn btn-sm" (click)="aiOpen.set(true)">✦ Assistente AI</button>
              }
            </div>
            @if (preview()) {
              <div class="prose preview" [innerHTML]="content | markdown"></div>
            } @else {
              <label class="sr-only" for="content">Contenuto Markdown</label>
              <textarea id="content" class="textarea code" [(ngModel)]="content" (ngModelChange)="touch()" [disabled]="readonly()"
                placeholder="Scrivi in Markdown: ## Titolo, - elenco, **grassetto**…"></textarea>
            }
          </section>

          <div class="actions-bar">
            <label class="check"><input type="checkbox" [(ngModel)]="clientVisible" (ngModelChange)="touch()" [disabled]="readonly()" /> Visibile al cliente</label>
            <span class="grow"></span>
            <button class="btn btn-ghost" (click)="print()">Esporta PDF</button>
            @if (d.status !== 'in_revisione' && d.clientVisible && !dirty()) {
              <button class="btn" (click)="submitReview()" [disabled]="readonly()">Invia al cliente</button>
            }
            @if (d.status === 'in_revisione') {
              <button class="btn" (click)="markApproved()" [disabled]="readonly()" title="Approvazione ricevuta fuori piattaforma">Segna approvato</button>
            }
            <button class="btn btn-primary" (click)="save()" [disabled]="!dirty() || saving() || readonly()">{{ saving() ? 'Salvataggio…' : 'Salva' }}</button>
          </div>
        </div>

        <aside class="stack no-print">
          <section class="card stack-sm">
            <h3>Cronologia</h3>
            <p class="muted small">Ultima modifica {{ d.updatedAt | date: 'd MMM y, HH:mm' }}{{ d.updatedByName ? ' · ' + d.updatedByName : '' }}</p>
            @if (d.reviewedAt) { <p class="muted small">Revisione cliente {{ d.reviewedAt | date: 'd MMM y, HH:mm' }}</p> }
            @for (v of versions(); track v.version) {
              <button class="version" (click)="openVersion(v)"><span class="mono">v{{ v.version }}</span><span class="grow truncate">{{ v.createdByName ?? '—' }}</span><span class="muted small">{{ v.createdAt | date: 'd MMM HH:mm' }}</span></button>
            } @empty { <p class="muted small">Nessuna versione precedente.</p> }
          </section>
        </aside>
      </div>

      <div class="print-only print-area">
        <h1>{{ title }}</h1>
        <p class="muted">{{ store.project()?.clientName }} · {{ store.project()?.name }} · v{{ d.version }}</p>
        <cf-document-view [doc]="d" />
      </div>

      <cf-modal [(open)]="aiOpen" title="Assistente AI" [wide]="true">
        <div class="stack">
          <p class="muted small">L'AI usa i dati del progetto e degli altri documenti. Il risultato non viene salvato finché non lo inserisci e salvi.</p>
          <label class="field"><span>Indicazioni (facoltative)</span><textarea class="textarea" rows="2" [(ngModel)]="aiInstructions" placeholder="Es. tono più tecnico, includi una sezione su GDPR…"></textarea></label>
          <div class="row">
            <button class="btn btn-primary" (click)="runAi('generate')" [disabled]="aiLoading()">Genera bozza</button>
            <button class="btn" (click)="runAi('enhance')" [disabled]="aiLoading() || !content.trim()">Migliora testo attuale</button>
            @if (aiLoading()) { <span class="muted small">Generazione in corso…</span> }
          </div>
          @if (aiResult()) {
            <div class="card prose ai-result" [innerHTML]="aiResult() | markdown"></div>
          }
        </div>
        <div modal-footer class="modal-foot">
          <button class="btn btn-ghost" (click)="aiOpen.set(false)">Chiudi</button>
          <button class="btn" [disabled]="!aiResult()" (click)="applyAi('append')">Aggiungi in fondo</button>
          <button class="btn btn-primary" [disabled]="!aiResult()" (click)="applyAi('replace')">Sostituisci contenuto</button>
        </div>
      </cf-modal>

      <cf-modal [(open)]="versionOpen" [title]="'Versione ' + (snapshot()?.version ?? '')" [wide]="true">
        @if (snapshot(); as s) {
          <p class="muted small">{{ s.createdAt | date: 'd MMM y, HH:mm' }} · {{ s.title }}</p>
          <div class="prose" [innerHTML]="s.content | markdown"></div>
        }
        <div modal-footer class="modal-foot">
          <button class="btn btn-ghost" (click)="versionOpen.set(false)">Chiudi</button>
          <button class="btn btn-primary" (click)="restoreVersion()" [disabled]="readonly()">Ripristina nell'editor</button>
        </div>
      </cf-modal>
    } @else {
      <div class="skeleton" style="height: 300px"></div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 16px; align-items: start; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
    .preview { min-height: 320px; }
    .actions-bar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 16px;
      background: rgba(10, 10, 10, .92); backdrop-filter: blur(6px); border: 1px solid var(--cf-color-border); border-radius: var(--cf-radius); }
    .version { display: flex; gap: 8px; align-items: center; width: 100%; padding: 8px; border: 0; border-radius: 6px; background: none; color: inherit; font: inherit; cursor: pointer; text-align: left; }
    .version:hover { background: var(--cf-color-surface-raised); }
    .ai-result { max-height: 360px; overflow-y: auto; }
    .print-only { display: none; }
    @media print { .print-only { display: block; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentEditorPage {
  readonly docId = input.required<string>();
  protected readonly store = inject(ProjectStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly doc = signal<DocumentDto | null>(null);
  protected readonly versions = signal<DocumentVersionDto[]>([]);
  protected readonly dirty = signal(false);
  protected readonly saving = signal(false);
  protected readonly conflict = signal(false);
  protected readonly preview = signal(false);
  protected readonly aiEnabled = signal(false);
  protected readonly aiOpen = signal(false);
  protected readonly aiLoading = signal(false);
  protected readonly aiResult = signal('');
  protected readonly versionOpen = signal(false);
  protected readonly snapshot = signal<Snapshot | null>(null);
  protected readonly readonly = this.store.archived;

  protected title = '';
  protected content = '';
  protected clientVisible = true;
  protected fields: Record<string, string> = {};
  protected aiInstructions = '';

  protected readonly def = computed(() => { const d = this.doc(); return d ? getDocumentTypeDef(d.type) : undefined; });
  protected readonly statusInfo = computed(() => { const d = this.doc(); return d ? documentStatus(d.status) : null; });

  private get base(): string { return `/projects/${this.store.id()}/documents/${this.docId()}`; }

  constructor() {
    effect(() => { if (this.store.id() && this.docId()) void this.reload(); });
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onUnload(e: BeforeUnloadEvent): void { if (this.dirty()) e.preventDefault(); }

  protected touch(): void { this.dirty.set(true); }

  protected async reload(): Promise<void> {
    try {
      const [d, versions, ai] = await Promise.all([
        this.api.get<DocumentDto>(this.base),
        this.api.get<DocumentVersionDto[]>(`${this.base}/versions`),
        this.api.get<AiUsageDto>('/ai/usage')
      ]);
      this.apply(d);
      this.versions.set(versions);
      this.aiEnabled.set(ai.enabled);
    } catch (err) { this.toast.error(err); }
  }

  private apply(d: DocumentDto): void {
    this.doc.set(d);
    this.title = d.title;
    this.content = d.content;
    this.clientVisible = d.clientVisible;
    this.fields = {};
    for (const f of getDocumentTypeDef(d.type)?.fields ?? []) this.fields[f.key] = this.toText(f, d.data[f.key]);
    this.dirty.set(false);
    this.conflict.set(false);
  }

  private toText(f: DocumentFieldDef, v: unknown): string {
    if (f.kind === 'list') return Array.isArray(v) ? v.join('\n') : '';
    return typeof v === 'string' ? v : '';
  }

  private collectData(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const f of this.def()?.fields ?? []) {
      const raw = (this.fields[f.key] ?? '').trim();
      if (f.kind === 'list') { const items = raw.split('\n').map((s) => s.trim()).filter(Boolean); if (items.length) out[f.key] = items; }
      else if (raw) out[f.key] = raw;
    }
    return out;
  }

  protected async save(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    if (!this.title.trim()) { this.toast.error('Il titolo è obbligatorio'); return; }
    this.saving.set(true);
    try {
      const updated = await this.api.patch<DocumentDto>(this.base, {
        baseVersion: d.version, title: this.title.trim(), content: this.content, data: this.collectData(), clientVisible: this.clientVisible
      });
      this.apply(updated);
      this.versions.set(await this.api.get<DocumentVersionDto[]>(`${this.base}/versions`));
      this.toast.success(updated.version > d.version ? `Salvato (v${updated.version})` : 'Salvato');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) this.conflict.set(true);
      this.toast.error(err);
    } finally { this.saving.set(false); }
  }

  protected async submitReview(): Promise<void> {
    if (!(await this.confirm.ask('Il cliente vedrà il documento nel portale e potrà approvarlo o chiedere modifiche.', { title: 'Inviare al cliente?', confirmLabel: 'Invia' }))) return;
    try { this.apply(await this.api.post<DocumentDto>(`${this.base}/submit`)); this.toast.success('Documento inviato in revisione'); }
    catch (err) { this.toast.error(err); }
  }

  protected async markApproved(): Promise<void> {
    if (!(await this.confirm.ask('Registra l\'approvazione ricevuta dal cliente (email, call…). Verrà tracciata nel registro.', { title: 'Segna come approvato', confirmLabel: 'Approva' }))) return;
    try {
      this.apply(await this.api.post<DocumentDto>(`${this.base}/review`, { decision: 'approve', comment: 'Approvazione registrata dal team' }));
      void this.store.refresh();
      this.toast.success('Documento approvato');
    } catch (err) { this.toast.error(err); }
  }

  protected async runAi(action: 'generate' | 'enhance'): Promise<void> {
    if (this.dirty() && action === 'enhance') this.toast.info('L\'AI migliora l\'ultima versione salvata');
    this.aiLoading.set(true);
    try {
      const r = await this.api.post<AiTextResult>(`/projects/${this.store.id()}/ai/documents/${this.docId()}`, { action, instructions: this.aiInstructions || null });
      this.aiResult.set(r.text);
    } catch (err) { this.toast.error(err); } finally { this.aiLoading.set(false); }
  }

  protected applyAi(mode: 'replace' | 'append'): void {
    this.content = mode === 'replace' ? this.aiResult() : `${this.content.trimEnd()}\n\n${this.aiResult()}`;
    this.dirty.set(true);
    this.preview.set(false);
    this.aiOpen.set(false);
    this.aiResult.set('');
  }

  protected async openVersion(v: DocumentVersionDto): Promise<void> {
    try {
      this.snapshot.set(await this.api.get<Snapshot>(`${this.base}/versions/${v.version}`));
      this.versionOpen.set(true);
    } catch (err) { this.toast.error(err); }
  }

  protected restoreVersion(): void {
    const s = this.snapshot();
    const d = this.doc();
    if (!s || !d) return;
    this.apply({ ...d, title: s.title, content: s.content, data: s.data });
    this.doc.set(d);
    this.dirty.set(true);
    this.versionOpen.set(false);
    this.toast.info(`Contenuto della v${s.version} caricato: salva per confermare`);
  }

  protected print(): void { window.print(); }
}
