import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Chiusura del racconto: la camera si allontana, il Builder e il logo restano soli sulla scena. */
@Component({
  selector: 'cf-outro',
  template: `
    <section class="outro" id="finale" aria-labelledby="outro-title">
      <h2 id="outro-title">Il prossimo<br />lo costruiamo<br />insieme.</h2>
      <a class="cta" href="#contatti" data-cursor="scrivici">Parliamone</a>
    </section>
  `,
  styles: `
    :host { display: block; }
    .outro { min-height: 140vh; display: flex; flex-direction: column; justify-content: flex-end; gap: 2rem;
      padding: 0 clamp(1.25rem, 4vw, 4rem) clamp(4rem, 12vh, 8rem); background: var(--cf-ink-deep); color: var(--cf-chalk); }
    :host-context(main.scene-on) .outro { background: transparent; }
    h2 { font-family: var(--cf-display); font-weight: 800; font-variation-settings: 'wdth' 78, 'opsz' 96; font-size: clamp(3rem, 9vw, 9rem);
      line-height: .86; letter-spacing: -.04em; margin: 0; max-width: 1440px; }
    .cta { align-self: flex-start; font-family: var(--cf-display); font-weight: 700; font-size: 1.1rem; color: var(--cf-ink-deep); background: var(--cf-chalk);
      padding: 1.15rem 1.9rem; border-radius: 999px; text-decoration: none; transition: background .2s, color .2s; }
    .cta:hover { background: var(--cf-violet); color: #fff; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutroComponent {}
