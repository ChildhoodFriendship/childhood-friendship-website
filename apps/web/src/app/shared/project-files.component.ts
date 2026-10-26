import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { ProjectFileDto } from '@cf/shared/types';
import { Api } from '../core/api';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { ConfirmService } from './confirm.service';

const MAX_BYTES = 25 * 1024 * 1024;
const EXT_TYPES: Record<string, string> = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  heic: 'image/heic', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip', txt: 'text/plain', csv: 'text/csv', mp4: 'video/mp4', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/x-m4a'
};
const typeOf = (f: File): string => f.type || EXT_TYPES[f.name.split('.').pop()?.toLowerCase() ?? ''] || 'application/octet-stream';

interface Uploading { name: string; pct: number }

/**
 * Materiali del progetto (logo, foto, testi, documenti): caricamento diretto su Vercel Blob
 * con token monouso chiesto all'API, poi registrazione. Usato sia nel portale sia nell'admin.
 */
@Component({
  selector: 'cf-project-files',
  imports: [DatePipe],
  template: `
    <div class="files card stack-sm" [class.drag]="dragging()" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
      <div class="row-between">
        <div>
          <h3>{{ title() }}</h3>
          @if (hint()) { <p class="muted small">{{ hint() }}</p> }
        </div>
        @if (!readonly()) {
          <label class="btn btn-primary btn-sm upload">
            + Carica file
            <input type="file" multiple (change)="onPick($event)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.mp4,.mov,.mp3,.m4a" />
          </label>
        }
      </div>
      @for (u of uploading(); track u.name) {
        <div class="line"><span class="grow truncate">{{ u.name }}</span><span class="mono small">{{ u.pct }}%</span></div>
        <div class="progress"><span [style.width.%]="u.pct"></span></div>
      }
      @for (f of files(); track f.id) {
        <div class="line">
          <span class="ico" aria-hidden="true">{{ icon(f) }}</span>
          <a class="grow truncate" [href]="f.url" target="_blank" rel="noopener noreferrer" [attr.download]="f.name">{{ f.name }}</a>
          <span class="muted small nowrap">{{ size(f.sizeBytes) }} · {{ f.uploadedByRole === 'client' ? 'cliente' : 'team' }} · {{ f.createdAt | date: 'd MMM' }}</span>
          @if (canDelete(f)) { <button class="btn btn-ghost btn-sm icon-btn" (click)="remove(f)" [attr.aria-label]="'Elimina ' + f.name">✕</button> }
        </div>
      } @empty {
        @if (!loading() && !uploading().length) { <p class="muted small empty-msg">Nessun file. {{ readonly() ? '' : 'Trascina qui logo, foto o testi, oppure usa “Carica file”.' }}</p> }
      }
    </div>
  `,
  styles: `
    .files { transition: border-color .15s, background .15s; }
    .files.drag { border-color: var(--cf-color-violet-light); background: var(--cf-violet-soft); }
    .upload { position: relative; overflow: hidden; cursor: pointer; }
    .upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .line { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--cf-color-border); }
    .line:last-child { border-bottom: 0; }
    .ico { width: 22px; text-align: center; }
    .nowrap { white-space: nowrap; }
    .empty-msg { margin: 4px 0 0; }
    @media (max-width: 600px) { .nowrap { display: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectFilesComponent {
  readonly projectId = input.required<string>();
  readonly readonly = input(false);
  readonly title = input('Materiali');
  readonly hint = input('Logo, foto, testi e documenti del progetto (max 25 MB ciascuno).');
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  protected readonly files = signal<ProjectFileDto[]>([]);
  protected readonly uploading = signal<Uploading[]>([]);
  protected readonly loading = signal(true);
  protected readonly dragging = signal(false);
  private readonly isTeam = computed(() => this.auth.isTeam());

  constructor() {
    effect(() => { void this.load(this.projectId()); });
  }

  private async load(id: string): Promise<void> {
    try { this.files.set(await this.api.get<ProjectFileDto[]>(`/projects/${id}/files`)); }
    catch (err) { this.toast.error(err); }
    finally { this.loading.set(false); }
  }

  protected canDelete(f: ProjectFileDto): boolean {
    return !this.readonly() && (this.isTeam() || f.uploadedById === this.auth.user()?.id);
  }

  protected onDrag(e: DragEvent, on: boolean): void {
    if (this.readonly()) return;
    e.preventDefault();
    this.dragging.set(on);
  }
  protected onDrop(e: DragEvent): void {
    if (this.readonly()) return;
    e.preventDefault();
    this.dragging.set(false);
    void this.uploadAll(Array.from(e.dataTransfer?.files ?? []));
  }
  protected onPick(e: Event): void {
    const el = e.target as HTMLInputElement;
    void this.uploadAll(Array.from(el.files ?? []));
    el.value = '';
  }

  private async uploadAll(list: File[]): Promise<void> {
    for (const f of list) await this.uploadOne(f);
  }

  private async uploadOne(file: File): Promise<void> {
    if (file.size > MAX_BYTES) { this.toast.error(`${file.name}: troppo grande (max 25 MB)`); return; }
    const pid = this.projectId();
    const contentType = typeOf(file);
    const entry: Uploading = { name: file.name, pct: 0 };
    this.uploading.update((u) => [...u, entry]);
    const setPct = (pct: number) => this.uploading.update((u) => u.map((x) => (x === entry ? { ...x, pct } : x)));
    try {
      const { pathname, clientToken } = await this.api.post<{ pathname: string; clientToken: string }>(
        `/projects/${pid}/files/upload-token`, { name: file.name, contentType, size: file.size });
      const { put } = await import('@vercel/blob/client');
      await put(pathname, file, { access: 'public', token: clientToken, contentType, onUploadProgress: (p) => setPct(Math.round(p.percentage)) });
      const saved = await this.api.post<ProjectFileDto>(`/projects/${pid}/files`, { pathname, name: file.name });
      this.files.update((f) => [saved, ...f]);
      this.toast.success(`${file.name} caricato`);
    } catch (err) {
      this.toast.error(err instanceof Error ? `${file.name}: ${err.message}` : err);
    } finally {
      this.uploading.update((u) => u.filter((x) => x.name !== entry.name));
    }
  }

  protected async remove(f: ProjectFileDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare "${f.name}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try {
      await this.api.delete(`/projects/${this.projectId()}/files/${f.id}`);
      this.files.update((list) => list.filter((x) => x.id !== f.id));
    } catch (err) { this.toast.error(err); }
  }

  protected size(b: number): string {
    return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  }
  protected icon(f: ProjectFileDto): string {
    const t = f.contentType;
    return t.startsWith('image/') ? '🖼' : t === 'application/pdf' ? '📄' : t.startsWith('video/') ? '🎬' : t.startsWith('audio/') ? '🎵' : t.includes('zip') ? '🗜' : '📎';
  }
}
