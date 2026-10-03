import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getDocumentTypeDef } from '@cf/shared/catalog';
import type { DocumentDto } from '@cf/shared/types';
import { MarkdownPipe } from './markdown';

interface FieldView { key: string; label: string; list: string[] | null; url: string | null; text: string | null; }

/** Vista in sola lettura di un documento: campi strutturati + contenuto Markdown. Usata da portale e stampa. */
@Component({
  selector: 'cf-document-view',
  imports: [MarkdownPipe],
  template: `
    @if (fields().length) {
      <dl class="fields">
        @for (f of fields(); track f.key) {
          <div>
            <dt>{{ f.label }}</dt>
            <dd>
              @if (f.list) {
                <ul>@for (item of f.list; track $index) { <li>{{ item }}</li> }</ul>
              } @else if (f.url) {
                <a [href]="f.url" target="_blank" rel="noopener noreferrer">{{ f.url }}</a>
              } @else {
                <span style="white-space: pre-wrap">{{ f.text }}</span>
              }
            </dd>
          </div>
        }
      </dl>
    }
    @if (doc().content.trim()) {
      <div class="prose" [innerHTML]="doc().content | markdown"></div>
    } @else if (!fields().length) {
      <p class="muted">Documento in preparazione.</p>
    }
  `,
  styles: `
    .fields { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin: 0 0 24px; }
    dt { font-size: 12px; font-weight: 600; color: var(--cf-color-text-muted); text-transform: uppercase; letter-spacing: .05em; }
    dd { margin: 4px 0 0; }
    ul { margin: 0; padding-left: 1.2em; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentViewComponent {
  readonly doc = input.required<DocumentDto>();
  protected readonly fields = computed(() => {
    const d = this.doc();
    const def = getDocumentTypeDef(d.type);
    return (def?.fields ?? []).flatMap((f): FieldView[] => {
      const v = d.data[f.key];
      if (Array.isArray(v) && v.length) return [{ key: f.key, label: f.label, list: v as string[], url: null, text: null }];
      if (typeof v === 'string' && v.trim()) return [{ key: f.key, label: f.label, list: null, url: f.kind === 'url' ? v : null, text: f.kind === 'url' ? null : v }];
      return [];
    });
  });
}
