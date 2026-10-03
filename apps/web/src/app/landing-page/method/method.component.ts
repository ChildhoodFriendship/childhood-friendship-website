import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';

interface Step { readonly n: string; readonly title: string; readonly text: string; readonly proof: string; }

const STEPS: readonly Step[] = [
  { n: '01', title: 'Ascoltiamo', text: 'Prima di scrivere una riga di codice capiamo chi userà il prodotto e cosa deve ottenere il tuo business.', proof: 'Ne esce un documento di obiettivi che approvi tu.' },
  { n: '02', title: 'Progettiamo', text: 'Struttura, flussi e design. Ti mostriamo tutto prima di costruire, così decidi guardando, non immaginando.', proof: 'Prototipo navigabile e preventivo definitivo.' },
  { n: '03', title: 'Costruiamo', text: 'Sviluppo a cicli brevi. Ogni settimana vedi cosa è stato fatto e cosa arriva dopo.', proof: 'Segui tutto dalla tua area clienti.' },
  { n: '04', title: 'Restiamo', text: 'Dopo il lancio misuriamo, correggiamo e miglioriamo. Il progetto cresce e noi restiamo a portata di messaggio.', proof: 'Canone chiaro o interventi a chiamata.' }
];

/** Metodo: pannelli in scorrimento orizzontale guidato dallo scroll verticale (desktop). */
@Component({
  selector: 'cf-method',
  template: `
    <section #section class="method" id="metodo" aria-labelledby="method-title" [style.--steps]="steps.length">
      <div class="sticky">
        <header class="head">
          <h2 id="method-title">Come costruiamo</h2>
          <div class="bar" aria-hidden="true"><span [style.transform]="'scaleX(' + progress() + ')'"></span></div>
        </header>
        <ol #track class="track" [style.transform]="'translate3d(' + -shift() + 'px,0,0)'">
          @for (s of steps; track s.n; let i = $index) {
            <li class="panel" [class.active]="i === active()">
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
  protected readonly shift = signal(0);
  protected readonly progress = signal(0);
  protected readonly active = signal(0);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

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
        if (horizontal()) {
          const t = this.track().nativeElement;
          this.shift.set(p * Math.max(0, t.scrollWidth - t.clientWidth));
        } else {
          this.shift.set(0);
        }
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
