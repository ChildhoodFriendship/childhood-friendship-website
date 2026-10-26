import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
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
 * Materiali del progetto (logo, foto, anteprime asset, documenti):
 * visualizzazione con gli ultimi 4 asset visibili e freccia per espandere/collassare la sezione.
 */
@Component({
  selector: 'cf-project-files',
  template: `
    <div class="files card stack-sm" [class.drag]="dragging()" (dragover)="onDrag($event, true)" (dragleave)="onDrag($event, false)" (drop)="onDrop($event)">
      <div class="row-between files-head">
        <div>
          <h3>{{ title() }}</h3>
          @if (hint()) { <p class="muted small hint-text">{{ hint() }}</p> }
        </div>
        @if (!readonly()) {
          <label class="btn btn-primary btn-sm upload">
            + Carica file
            <input type="file" multiple (change)="onPick($event)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv,.mp4,.mov,.mp3,.m4a" />
          </label>
        }
      </div>

      @for (u of uploading(); track u.name) {
        <div class="upload-bar">
          <div class="row-between small"><span class="truncate">{{ u.name }}</span><span class="mono">{{ u.pct }}%</span></div>
          <div class="progress"><span [style.width.%]="u.pct"></span></div>
        </div>
      }

      <div class="assets-grid">
        @for (f of visibleFiles(); track f.id) {
          <div class="asset-card" [title]="f.name">
            <a class="asset-preview-link" [href]="f.url" target="_blank" rel="noopener noreferrer">
              @if (isImage(f)) {
                <img [src]="f.url" [alt]="f.name" loading="lazy" class="asset-img" />
              } @else {
                <div class="asset-doc-fallback">
                  <span class="ext-badge">{{ fileExt(f) }}</span>
                  <span class="doc-icon">{{ icon(f) }}</span>
                </div>
              }
              <div class="asset-meta-overlay">
                <span class="asset-size">{{ size(f.sizeBytes) }}</span>
              </div>
            </a>
            @if (canDelete(f)) {
              <button
                type="button"
                class="btn-delete-asset"
                (click)="remove(f, $event)"
                [attr.aria-label]="'Elimina ' + f.name"
                title="Elimina asset">
                ✕
              </button>
            }
          </div>
        }
      </div>

      @if (hasMore()) {
        <div class="expand-row">
          <button type="button" class="btn-expand-assets" (click)="toggleExpanded()" aria-label="Espandi o contrai materiali">
            <span>{{ expanded() ? 'Mostra meno' : 'Mostra tutti gli asset (' + files().length + ')' }}</span>
            <span class="expand-arrow" [class.is-expanded]="expanded()">▾</span>
          </button>
        </div>
      }

      @if (!loading() && !files().length && !uploading().length) {
        <p class="muted small empty-msg">Nessun file presente. {{ readonly() ? '' : 'Trascina qui loghi o foto, oppure usa “+ Carica file”.' }}</p>
      }
    </div>
  `,
  styles: `
    .files {
      transition: border-color .15s, background .15s;
      position: relative;
    }
    .files.drag {
      border-color: var(--cf-color-violet-light);
      background: var(--cf-violet-soft);
    }
    .files-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 6px;
    }
    .hint-text {
      margin: 2px 0 0;
    }
    .upload {
      position: relative;
      overflow: hidden;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .upload input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }

    .upload-bar {
      margin: 8px 0;
    }

    /* Griglia visuale anteprime */
    .assets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 14px;
      margin-top: 10px;
    }

    .asset-card {
      position: relative;
      aspect-ratio: 1 / 1;
      border-radius: 14px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
      display: flex;
    }
    .asset-card:hover {
      transform: translateY(-2px);
      border-color: rgba(167, 139, 250, 0.6);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(139, 92, 246, 0.15);
    }

    .asset-preview-link {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      text-decoration: none !important;
      position: relative;
      overflow: hidden;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, rgba(30, 27, 46, 0.6) 0%, rgba(15, 12, 25, 0.95) 100%);
    }

    .asset-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.35s ease;
      display: block;
    }
    .asset-card:hover .asset-img {
      transform: scale(1.06);
    }

    .asset-doc-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      height: 100%;
    }
    .ext-badge {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: #DDD6FE;
      background: rgba(124, 58, 237, 0.3);
      border: 1px solid rgba(167, 139, 250, 0.4);
      padding: 2px 7px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .doc-icon {
      font-size: 1.8rem;
      line-height: 1;
    }

    .asset-meta-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 18px 8px 6px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0) 100%);
      display: flex;
      justify-content: flex-end;
      pointer-events: none;
    }
    .asset-size {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      color: rgba(246, 241, 255, 0.8);
      background: rgba(0, 0, 0, 0.5);
      padding: 1px 5px;
      border-radius: 4px;
    }

    /* Pulsante X con hover */
    .btn-delete-asset {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(220, 38, 38, 0.9);
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.75);
      transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background 0.15s;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      padding: 0;
      line-height: 1;
    }
    .asset-card:hover .btn-delete-asset,
    .asset-card:focus-within .btn-delete-asset {
      opacity: 1;
      transform: scale(1);
    }
    @media (hover: none), (max-width: 640px) {
      .btn-delete-asset {
        opacity: 0.92;
        transform: scale(1);
      }
    }
    .btn-delete-asset:hover {
      background: #EF4444;
      transform: scale(1.12);
    }

    /* Pulsante freccia espansione */
    .expand-row {
      display: flex;
      justify-content: center;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .btn-expand-assets {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      border-radius: 999px;
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(167, 139, 250, 0.3);
      color: #DDD6FE;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-expand-assets:hover {
      background: rgba(124, 58, 237, 0.25);
      border-color: #C4B5FD;
      color: #FFFFFF;
      transform: translateY(-1px);
    }
    .expand-arrow {
      font-size: 0.95rem;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-block;
    }
    .expand-arrow.is-expanded {
      transform: rotate(180deg);
    }

    .empty-msg {
      margin: 8px 0 0;
    }
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
  protected readonly expanded = signal(false);

  // Mostra i primi 4 di default; espande se l'utente clicca sulla freccetta
  protected readonly visibleFiles = computed(() => {
    const list = this.files();
    return this.expanded() ? list : list.slice(0, 4);
  });

  protected readonly hasMore = computed(() => this.files().length > 4);

  constructor() {
    effect(() => { void this.load(this.projectId()); });
  }

  private async load(id: string): Promise<void> {
    try { this.files.set(await this.api.get<ProjectFileDto[]>(`/projects/${id}/files`)); }
    catch (err) { this.toast.error(err); }
    finally { this.loading.set(false); }
  }

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  protected canDelete(f: ProjectFileDto): boolean {
    return !this.readonly();
  }

  protected isImage(f: ProjectFileDto): boolean {
    const t = f.contentType || '';
    if (t.startsWith('image/')) return true;
    return /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)($|\?)/i.test(f.url || f.name);
  }

  protected fileExt(f: ProjectFileDto): string {
    const parts = (f.name || '').split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
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

  protected async remove(f: ProjectFileDto, event?: Event): Promise<void> {
    event?.stopPropagation();
    event?.preventDefault();
    if (!(await this.confirm.ask(`Sei sicuro di voler eliminare questo asset?`, { title: 'Elimina asset', danger: true, confirmLabel: 'Elimina' }))) return;
    try {
      await this.api.delete(`/projects/${this.projectId()}/files/${f.id}`);
      this.files.update((list) => list.filter((x) => x.id !== f.id));
      this.toast.success('Asset eliminato');
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
