import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';

const TEXT = "Ogni progetto parte da una persona con un'idea e poco tempo. Noi la ascoltiamo, la mettiamo in ordine e la trasformiamo in un prodotto che la gente usa davvero. Niente template. Niente scorciatoie. Niente sparizioni dopo il lancio.";

/** Manifesto che si "accende" parola per parola mentre la sezione attraversa lo schermo. */
@Component({
  selector: 'cf-manifesto',
  imports: [LogoComponent],
  template: `
    <section #section class="manifesto" id="manifesto" aria-labelledby="manifesto-title">
      <h2 id="manifesto-title" class="sr-only">Il nostro manifesto</h2>
      <p class="text" [attr.aria-label]="text">
        @for (w of words; track $index) {
          <span aria-hidden="true" [class.on]="$index < lit()">{{ w }} </span>
        }
      </p>
      <div class="sign">
        <cf-logo class="mark" tone="light" />
        <p>Il nome viene da un'amicizia nata da bambini. Il metodo, da anni passati a scrivere codice che deve funzionare il lunedì mattina.</p>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .manifesto { background: var(--cf-chalk); color: var(--cf-ink-deep); padding: clamp(6rem, 16vh, 11rem) clamp(1.25rem, 4vw, 4rem); }
    .text { font-family: var(--cf-display); font-weight: 700; font-variation-settings: 'wdth' 85, 'opsz' 72; font-size: clamp(2rem, 5.2vw, 5rem);
      line-height: 1.04; letter-spacing: -.025em; max-width: 1440px; margin: 0 auto; }
    .text span { opacity: .14; transition: opacity .35s; }
    .text span.on { opacity: 1; }
    .sign { max-width: 1440px; margin: clamp(3rem, 8vh, 5rem) auto 0; display: flex; gap: 1.25rem; align-items: flex-start; }
    .sign p { font-family: var(--cf-display); font-size: 1.15rem; line-height: 1.55; max-width: 44ch; margin: 0; color: rgba(18, 10, 38, .7); }
    .mark { flex: none; width: 3rem; height: 3rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    @media (prefers-reduced-motion: reduce) { .text span { opacity: 1; transition: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManifestoComponent {
  protected readonly text = TEXT;
  protected readonly words = TEXT.split(' ');
  protected readonly lit = signal(0);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { this.lit.set(this.words.length); return; }
      let raf = 0;
      const update = () => {
        raf = 0;
        const r = this.section().nativeElement.getBoundingClientRect();
        const vh = window.innerHeight;
        // 0 quando la sezione entra dal basso, 1 quando il suo centro supera il terzo superiore
        const progress = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height * 0.75)));
        this.lit.set(Math.round(progress * this.words.length));
      };
      const onScroll = () => { raf ||= requestAnimationFrame(update); };
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
      destroyRef.onDestroy(() => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); });
    });
  }
}
