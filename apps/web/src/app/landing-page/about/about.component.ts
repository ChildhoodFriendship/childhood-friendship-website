import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Fact { readonly k: string; readonly v: string; }

const FACTS: readonly Fact[] = [
  { k: 'Un team piccolo', v: 'Parli direttamente con chi progetta e scrive il codice.' },
  { k: "Dall'idea al lancio", v: 'Strategia, design e sviluppo nelle stesse mani.' },
  { k: 'Anche dopo', v: 'Restiamo a portata di messaggio quando il prodotto cresce.' }
];

/** Chi siamo: titolo a due voci, testo a destra, tre righe di fatti sotto. Le righe si rivelano con lo scroll. */
@Component({
  selector: 'cf-about',
  template: `
    <section class="about" id="chi-siamo" aria-labelledby="about-title">
      <div class="inner">
        <div class="head">
          <p class="kicker"><span aria-hidden="true"></span>Chi siamo</p>
          <h2 id="about-title">
            <span class="ln"><span>L'amicizia ci ha</span></span>
            <span class="ln"><span>dato il nome.</span></span>
            <span class="ln em"><span>La disciplina</span></span>
            <span class="ln em"><span>ci definisce.</span></span>
          </h2>
        </div>
        <div class="copy">
          <p>Childhood Friendship nasce da un legame che dura nel tempo e da una convinzione semplice: il software migliore è quello costruito con cura, insieme alle persone giuste.</p>
          <p>Uniamo pensiero strategico, design essenziale e ingegneria pragmatica per trasformare obiettivi complessi in prodotti digitali chiari, utili e pronti a crescere.</p>
          <a class="link" href="#contatti" data-cursor="ciao">Conosciamoci <span aria-hidden="true">↗</span></a>
        </div>
        <ol class="facts">
          @for (f of facts; track f.k; let i = $index) {
            <li [style.--i]="i">
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
    h2 { margin: 0; font-family: var(--cf-display); font-weight: 800; font-variation-settings: 'wdth' 80, 'opsz' 96; font-size: clamp(2.7rem, 6.2vw, 6.4rem); line-height: .9; letter-spacing: -.035em; }
    .ln { display: block; overflow: hidden; padding-bottom: .06em; }
    .ln > span { display: inline-block; }
    .em { color: #A78BFA; }

    .copy { display: grid; gap: 1.25rem; padding-bottom: .4rem; }
    .copy p { margin: 0; font-family: var(--cf-display); font-size: clamp(1rem, 1.15vw, 1.15rem); line-height: 1.6; color: rgba(246, 241, 255, .74); max-width: 46ch; }
    .copy p:first-child { color: var(--cf-chalk); }
    .link { justify-self: start; margin-top: .75rem; display: inline-flex; gap: .55rem; align-items: center; font-family: var(--cf-display); font-weight: 700; font-size: 1rem; color: var(--cf-chalk); text-decoration: none;
      padding-bottom: .35rem; background: linear-gradient(currentColor, currentColor) left bottom / 100% 1px no-repeat; transition: background-size .35s cubic-bezier(.7, 0, .2, 1), color .2s; }
    .link span { color: #A78BFA; transition: transform .3s cubic-bezier(.2, .8, .2, 1); }
    .link:hover, .link:focus-visible { color: #A78BFA; background-size: 0 1px; background-position: right bottom; outline: none; }
    .link:hover span { transform: translate(3px, -3px); }

    .facts { grid-column: 1 / -1; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(246, 241, 255, .14); }
    .facts li { display: grid; gap: .45rem; align-content: start; padding: 1.5rem 1.5rem 0 0; font-family: var(--cf-display); }
    .facts li + li { padding-left: 1.5rem; border-left: 1px solid rgba(246, 241, 255, .14); }
    .facts .n { font-size: .78rem; font-weight: 600; letter-spacing: .14em; color: #A78BFA; }
    .facts strong { font-size: 1.15rem; font-weight: 700; letter-spacing: -.01em; }
    .facts .v { font-size: .95rem; line-height: 1.5; color: rgba(246, 241, 255, .62); max-width: 32ch; }

    /* rivelazione legata allo scroll (solo dove supportata) */
    @supports (animation-timeline: view()) {
      @media (prefers-reduced-motion: no-preference) {
        .ln > span { animation: rise linear both; animation-timeline: view(); animation-range: entry 10% cover 32%; }
        .ln:nth-child(2) > span { animation-range: entry 16% cover 35%; }
        .ln:nth-child(3) > span { animation-range: entry 22% cover 38%; }
        .ln:nth-child(4) > span { animation-range: entry 28% cover 41%; }
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
      .facts { grid-template-columns: 1fr; margin-top: 1rem; }
      .facts li { padding: 1.1rem 0; border-bottom: 1px solid rgba(246, 241, 255, .14); }
      .facts li + li { padding-left: 0; border-left: 0; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutComponent {
  protected readonly facts = FACTS;
}
