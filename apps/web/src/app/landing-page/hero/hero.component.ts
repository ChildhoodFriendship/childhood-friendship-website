import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, viewChild, viewChildren } from '@angular/core';
import { PointerService } from '../pointer.service';
import { PortalI18nService } from '../../core/portal-i18n.service';

const RADIUS = 260;

/**
 * Hero: titolo a font variabile che "respira" vicino al cursore
 * (peso e larghezza cambiano in base alla distanza da ogni lettera).
 */
@Component({
  selector: 'cf-hero',
  template: `
    <section #section class="hero" id="top" aria-labelledby="hero-title" [style.--mx.px]="glow().x" [style.--my.px]="glow().y">
      <div class="glow" aria-hidden="true"></div>
      <div class="inner">
        <div class="copy">
        <p class="kicker">{{ i18n.landing().hero.kicker }}</p>
        <h1 id="hero-title" [attr.aria-label]="lines().join(' ')">
          @for (line of lines(); track line; let li = $index) {
            <span class="line" aria-hidden="true">
              @for (ch of line.split(''); track $index) {
                <span #ch class="ch" [style.animation-delay.ms]="li * 120 + $index * 28">{{ ch }}</span>
              }
            </span>
          }
        </h1>
        <div class="foot">
          <p class="lede">{{ i18n.landing().hero.lede }}</p>
          <a class="cta" href="#contatti" [attr.data-cursor]="i18n.isEn() ? 'write us' : 'scrivici'">{{ i18n.landing().hero.cta }}</a>
        </div>
        </div>
        <!-- spazio riservato al Builder 3D: la scena lo centra qui -->
        <div class="stage" id="hero-stage" aria-hidden="true"></div>
      </div>
      <a class="scroll" href="#manifesto" [attr.aria-label]="i18n.landing().hero.scrollAria"><span></span></a>
    </section>
  `,
  styleUrl: './hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroComponent {
  protected readonly i18n = inject(PortalI18nService);
  protected readonly lines = computed(() => this.i18n.landing().hero.lines);
  private readonly pointer = inject(PointerService);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly chars = viewChildren<ElementRef<HTMLElement>>('ch');
  private centers: { x: number; y: number }[] = [];
  protected readonly glow = computed(() => {
    const p = this.pointer.pos();
    const r = this.section().nativeElement.getBoundingClientRect();
    return { x: p.x - r.left, y: p.y - r.top };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const measure = () => {
      this.centers = this.chars().map((c) => {
        const r = c.nativeElement.getBoundingClientRect();
        return { x: r.left + r.width / 2 + window.scrollX, y: r.top + r.height / 2 + window.scrollY };
      });
    };
    afterNextRender(() => {
      // misura dopo il caricamento dei font e l'animazione d'ingresso
      void document.fonts?.ready.then(() => setTimeout(measure, 1200));
      window.addEventListener('resize', measure);
      destroyRef.onDestroy(() => window.removeEventListener('resize', measure));
    });

    effect(() => {
      // re-trigger measure on language change
      this.lines();
      setTimeout(measure, 100);
    });

    effect(() => {
      const p = this.pointer.pos();
      if (this.pointer.reducedMotion || !this.pointer.finePointer || !this.centers.length) return;
      const els = this.chars();
      const px = p.x + window.scrollX;
      const py = p.y + window.scrollY;
      els.forEach((el, i) => {
        const c = this.centers[i];
        if (!c) return;
        const t = Math.max(0, 1 - Math.hypot(px - c.x, py - c.y) / RADIUS);
        const e = t * t * (3 - 2 * t);
        el.nativeElement.style.fontVariationSettings = `'wght' ${Math.round(800 - e * 560)}, 'wdth' ${Math.round(75 + e * 25)}, 'opsz' 96`;
      });
    });
  }
}
