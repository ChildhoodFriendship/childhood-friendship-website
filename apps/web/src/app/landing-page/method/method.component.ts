import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';

interface Step { readonly n: string; readonly title: string; readonly text: string; readonly proof: string; }

const STEPS: readonly Step[] = [
  { n: '01', title: 'Ascoltiamo', text: 'Prima di scrivere una riga di codice capiamo chi userà il prodotto e cosa deve ottenere il tuo business.', proof: 'Ne esce un documento di obiettivi che approvi tu.' },
  { n: '02', title: 'Progettiamo', text: 'Struttura, flussi e design. Ti mostriamo tutto prima di costruire, così decidi guardando, non immaginando.', proof: 'Prototipo navigabile e preventivo definitivo.' },
  { n: '03', title: 'Costruiamo', text: 'Sviluppo a cicli brevi. Ogni settimana vedi cosa è stato fatto e cosa arriva dopo.', proof: 'Segui tutto dalla tua area clienti.' },
  { n: '04', title: 'Restiamo', text: 'Dopo il lancio misuriamo, correggiamo e miglioriamo. Il progetto cresce e noi restiamo a portata di messaggio.', proof: 'Canone chiaro o interventi a chiamata.' }
];

/** Metodo: su desktop le card occupano tutta la larghezza e quella della fase raggiunta si allarga con lo scroll. */
@Component({
  selector: 'cf-method',
  template: `
    <section #section class="method" id="metodo" aria-labelledby="method-title" [style.--steps]="steps.length">
      <div class="sticky">
        <div class="top">
          <header class="head">
            <p class="kicker">Il metodo</p>
            <h2 id="method-title">Come<br />costruiamo</h2>
            <div class="now" aria-live="polite">
              <span class="now-n">{{ steps[active()].n }}</span>
              <span class="now-t">{{ steps[active()].title }}</span>
            </div>
            <div class="bar" aria-hidden="true"><span [style.transform]="'scaleX(' + progress() + ')'"></span></div>
          </header>
          <!-- palco della scena 3D: il Builder recita qui la fase corrente -->
          <div class="stage" id="method-stage" aria-hidden="true"></div>
        </div>
        <ol class="track">
          @for (s of steps; track s.n; let i = $index) {
            <li class="panel" [class.active]="i === active()" [style.flex-grow]="grow()[i]" [style.--open]="open()[i]">
              <span class="n" aria-hidden="true">{{ s.n }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
              <p class="proof">{{ s.proof }}</p>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styleUrl: './method.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MethodComponent {
  protected readonly steps = STEPS;
  /** Posizione continua nella sequenza (0 = prima fase, n-1 = ultima). */
  protected readonly pos = signal(0);
  /** Larghezza relativa di ogni card: quella raggiunta si allarga, le altre si stringono. */
  protected readonly grow = computed(() => this.steps.map((_, i) => 1 + 3.2 * this.near(i)));
  /** Quanto è "aperta" ogni card (0..1): pilota l'opacità del testo lungo. */
  protected readonly open = computed(() => this.steps.map((_, i) => this.near(i)));
  protected readonly progress = signal(0);
  protected readonly active = signal(0);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');

  /** 1 sulla card raggiunta, 0 a una card di distanza (con curva morbida). */
  private near(i: number): number {
    const d = Math.min(1, Math.abs(this.pos() - i));
    const k = 1 - d;
    return k * k * (3 - 2 * k);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const horizontal = () => window.matchMedia('(min-width: 900px)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let raf = 0;
      const update = () => {
        raf = 0;
        const sec = this.section().nativeElement;
        const r = sec.getBoundingClientRect();
        const scrollable = sec.offsetHeight - window.innerHeight;
        const p = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
        this.progress.set(p);
        this.active.set(Math.min(this.steps.length - 1, Math.floor(p * this.steps.length)));
        // ogni fase occupa la stessa porzione di scroll; al centro della sua porzione la card è tutta aperta
        this.pos.set(horizontal() ? Math.min(this.steps.length - 1, Math.max(0, p * this.steps.length - 0.5)) : this.active());
      };
      const onScroll = () => { raf ||= requestAnimationFrame(update); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      update();
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        cancelAnimationFrame(raf);
      });
    });
  }
}
