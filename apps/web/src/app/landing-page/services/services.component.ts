import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PortalI18nService } from '../../core/portal-i18n.service';

@Component({
  selector: 'cf-services',
  template: `
    <section class="services" id="servizi" aria-labelledby="services-title">
      <header class="head">
        <h2 id="services-title">{{ i18n.landing().services.title }}</h2>
        <p>{{ i18n.landing().services.subtitle }}</p>
      </header>
      <ul class="rows" (mouseleave)="hoverOut()">
        @for (s of services(); track s.id) {
          @let isOpen = open() === s.id;
          <li class="row" [class.open]="isOpen">
            <button type="button" class="summary" (click)="toggle(s.id)" (mouseenter)="hoverIn(s.id)" [attr.aria-expanded]="isOpen" [attr.aria-controls]="'srv-' + s.id"
              [attr.data-cursor]="isOpen ? (i18n.isEn() ? 'close' : 'chiudi') : (i18n.isEn() ? 'open' : 'apri')">
              <span class="title">{{ s.title }}</span>
              <span class="line">{{ s.line }}</span>
              <span class="plus" aria-hidden="true"></span>
            </button>
            <div class="detail" [id]="'srv-' + s.id" role="region" [attr.aria-label]="s.title">
              <div class="detail-inner">
                <p class="body">{{ s.body }}</p>
                <ul class="incl">@for (i of s.includes; track i) { <li>{{ i }}</li> }</ul>
                <div class="price"><span>{{ s.from }}</span><a href="#contatti">{{ i18n.landing().services.askQuote }}</a></div>
              </div>
            </div>
          </li>
        }
      </ul>
      <p class="note">{{ i18n.landing().services.note }}</p>
    </section>
  `,
  styleUrl: './services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesComponent {
  protected readonly i18n = inject(PortalI18nService);
  protected readonly services = computed(() => this.i18n.landing().services.items);
  /** All'arrivo sono tutte chiuse: si aprono al click o, col mouse, al passaggio. */
  protected readonly open = signal<string | null>(null);
  private byHover = false;
  private readonly finePointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  protected toggle(id: string): void { this.byHover = false; this.open.update((o) => (o === id ? null : id)); }
  protected hoverIn(id: string): void {
    if (!this.finePointer) return;
    this.byHover = true;
    this.open.set(id);
  }
  /** Uscendo dalla lista si richiude ciò che era stato aperto col passaggio (non quello aperto col click). */
  protected hoverOut(): void {
    if (this.byHover) { this.open.set(null); this.byHover = false; }
  }
}
