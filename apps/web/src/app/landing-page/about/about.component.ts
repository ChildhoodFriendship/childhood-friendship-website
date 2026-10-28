import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ParticleText } from './particle-text';
import { PortalI18nService } from '../../core/portal-i18n.service';

/** Chi siamo: titolo a due voci, testo a destra, tre righe di fatti sotto. Le righe si rivelano con lo scroll. */
@Component({
  selector: 'cf-about',
  template: `
    <section class="about" id="chi-siamo" aria-labelledby="about-title">
      <div class="inner">
        <div class="head">
          <p class="kicker"><span aria-hidden="true"></span>{{ i18n.landing().about.kicker }}</p>
          <div class="title" #area>
          <canvas #cvs class="fx" aria-hidden="true"></canvas>
          <h2 id="about-title" #title>
            <span class="ln"><span>{{ i18n.landing().about.titleL1 }} {{ i18n.landing().about.titleL2 }}</span></span>
            <span class="ln em"><span>{{ i18n.landing().about.titleL3 }} {{ i18n.landing().about.titleL4 }}</span></span>
          </h2>
          </div>
        </div>
        <div class="copy">
          <p>{{ i18n.landing().about.copy1 }}</p>
          <p>{{ i18n.landing().about.copy2 }}</p>
        </div>
        <ol class="facts" #factsList>
          @for (f of facts(); track f.k; let i = $index) {
            <li [style.--i]="i" [class.active]="i === activeFact()">
              <span class="n">0{{ i + 1 }}</span>
              <strong>{{ f.k }}</strong>
              <span class="v">{{ f.v }}</span>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; position: relative; z-index: 2; }
    .about { --pad: clamp(1.25rem, 4vw, 4rem); background: var(--cf-ink-deep); color: var(--cf-chalk); padding: clamp(5.5rem, 14vh, 10rem) var(--pad); }
    .inner { max-width: 1440px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); column-gap: clamp(2rem, 6vw, 7rem); row-gap: clamp(3.5rem, 9vh, 6rem); align-items: end; }

    .kicker { display: flex; align-items: center; gap: .7rem; margin: 0 0 1.5rem; font-family: var(--cf-display); font-size: .78rem; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #A78BFA; }
    .kicker span { width: .5rem; height: .5rem; border-radius: 2px; background: var(--cf-violet); box-shadow: 0 0 16px var(--cf-violet); }
    h2 { margin: 0; font-family: var(--cf-display); font-weight: 800; font-variation-settings: 'wdth' 80, 'opsz' 96; font-size: clamp(2rem, 4.2vw, 4.6rem); line-height: 1.04; letter-spacing: -.03em; }
    .ln { display: block; overflow: hidden; padding-bottom: .06em; }
    .ln > span { display: inline-block; white-space: nowrap; }
    .em { color: #A78BFA; }
    /* titolo a particelle: il canvas sborda per far volare la polvere; il testo vero compare a riposo */
    .title { position: relative; }
    .fx { position: absolute; pointer-events: none; z-index: 1; }
    h2.fx-on .ln > span { opacity: var(--solid, 0); animation: none !important; }
    h2.fx-on { cursor: crosshair; }

    .copy { display: grid; gap: 1.25rem; padding-bottom: .4rem; }
    .copy p { margin: 0; font-family: var(--cf-display); font-size: clamp(1rem, 1.15vw, 1.15rem); line-height: 1.6; color: rgba(246, 241, 255, .74); max-width: 46ch; }
    .copy p:first-child { color: var(--cf-chalk); }

    .facts { grid-column: 1 / -1; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(246, 241, 255, .14); }
    .facts li { position: relative; display: grid; gap: .45rem; align-content: start; padding: 1.5rem 1.5rem 0 0; font-family: var(--cf-display); }
    /* hover: una linea viola corre sul bordo, il testo si accende */
    .facts li::before { content: ''; position: absolute; left: 0; right: 0; top: -1px; height: 2px; background: var(--cf-violet); transform: scaleX(0); transform-origin: left; transition: transform .5s cubic-bezier(.7, 0, .2, 1); }
    .facts li + li::before { left: 1.5rem; }
    .facts li:hover::before { transform: scaleX(1); }
    .facts strong, .facts .v { transition: color .3s, transform .4s cubic-bezier(.2, .8, .2, 1); }
    .facts li:hover strong { color: #A78BFA; transform: translateX(4px); }
    .facts li:hover .v { color: rgba(246, 241, 255, .88); }
    .facts li + li { padding-left: 1.5rem; border-left: 1px solid rgba(246, 241, 255, .14); }
    .facts .n { font-size: .78rem; font-weight: 600; letter-spacing: .14em; color: #A78BFA; }
    .facts strong { font-size: 1.15rem; font-weight: 700; letter-spacing: -.01em; }
    .facts .v { font-size: .95rem; line-height: 1.5; color: rgba(246, 241, 255, .62); max-width: 32ch; }

    /* rivelazione legata allo scroll (solo dove supportata) */
    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .ln > span { animation: rise linear both; animation-timeline: view(); animation-range: entry 10% cover 32%; }
        .ln:nth-child(2) > span { animation-range: entry 18% cover 36%; }
        .copy > * { animation: fade linear both; animation-timeline: view(); animation-range: entry 20% cover 35%; }
        .facts { animation: line linear both; animation-timeline: view(); animation-range: entry 30% cover 40%; }
        .facts li { animation: fade linear both; animation-timeline: view(); animation-range: entry 40% cover 45%; }
      }
    }
    @keyframes rise { from { transform: translateY(105%); } }
    @keyframes fade { from { opacity: 0; transform: translateY(18px); } }
    @keyframes line { from { border-top-color: transparent; } }

    @media (max-width: 899px) {
      .inner { grid-template-columns: 1fr; row-gap: 2rem; }
      h2 { font-size: clamp(1.8rem, 6.5vw, 3rem); line-height: 1.08; }
      .ln > span { white-space: normal; }
      .facts { grid-template-columns: 1fr; margin-top: 1rem; }
      .facts li {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
        padding: 1.15rem 0;
        border-bottom: 1px solid rgba(246, 241, 255, .14);
        transition: all .35s cubic-bezier(.2, .8, .2, 1);
      }
      .facts li + li { padding-left: 0; border-left: 0; }
      .facts li + li::before { left: 0; }
      .facts li::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: -1px;
        height: 2px;
        background: var(--cf-violet);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform .4s cubic-bezier(.2, .8, .2, 1);
      }
      .facts li.active::before,
      .facts li:hover::before {
        transform: scaleX(1);
      }
      .facts li.active strong,
      .facts li:hover strong {
        color: #A78BFA;
        transform: translateX(4px);
      }
      .facts li.active .v,
      .facts li:hover .v {
        color: rgba(246, 241, 255, .95);
      }
      .facts li.active .n {
        color: #c084fc;
        text-shadow: 0 0 12px rgba(167, 139, 250, .4);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  protected readonly i18n = inject(PortalI18nService);
  protected readonly facts = computed(() => this.i18n.landing().about.facts);
  protected readonly activeFact = signal(0);
  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
  private readonly cvs = viewChild.required<ElementRef<HTMLCanvasElement>>('cvs');
  private readonly factsList = viewChild<ElementRef<HTMLElement>>('factsList');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const fx = new ParticleText(this.title().nativeElement, this.cvs().nativeElement, this.area().nativeElement);
        destroyRef.onDestroy(() => fx.dispose());
      }

      const updateFact = () => {
        if (window.innerWidth >= 900) return;
        const list = this.factsList()?.nativeElement;
        if (!list) return;
        const items = list.querySelectorAll('li');
        const targetY = window.innerHeight * 0.48;
        let bestIdx = 0;
        let bestDist = Infinity;
        items.forEach((item: Element, idx: number) => {
          const box = item.getBoundingClientRect();
          const center = box.top + box.height / 2;
          const dist = Math.abs(center - targetY);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = idx;
          }
        });
        this.activeFact.set(bestIdx);
      };

      let raf = 0;
      const onScroll = () => {
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            updateFact();
          });
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      updateFact();
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        cancelAnimationFrame(raf);
      });
    });
  }
}
