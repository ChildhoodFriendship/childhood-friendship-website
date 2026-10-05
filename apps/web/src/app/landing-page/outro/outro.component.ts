import { ChangeDetectionStrategy, Component } from '@angular/core';

const LINES = [['Il', 'prossimo'], ['lo', 'costruiamo'], ['insieme.']];

/**
 * Finale cinematografico. Con la scena 3D attiva la sezione viene fissata e guidata dallo scroll
 * (vedi `BuilderScene.bindFinale`): titolo parola per parola davanti al logo-portale, la camera lo
 * attraversa e il velo viola passa il testimone alla card dei contatti. Senza 3D resta un titolo statico.
 */
@Component({
  selector: 'cf-outro',
  template: `
    <section class="outro" id="finale" aria-labelledby="outro-title">
      <div class="stage">
        <p class="kicker">Fine del nostro racconto. Inizio del tuo.</p>
        <h2 id="outro-title" aria-label="Il prossimo lo costruiamo insieme.">
          @for (line of lines; track $index) {
            <span class="line" aria-hidden="true">@for (w of line; track $index) {<span class="w">{{ w }}</span> }</span>
          }
        </h2>
      </div>
      <div class="veil" aria-hidden="true"></div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .outro { position: relative; min-height: 100vh; min-height: 100svh; display: grid; place-items: center; overflow: hidden;
      padding: 6rem clamp(1.25rem, 4vw, 4rem); background: var(--cf-ink-deep); color: var(--cf-chalk); text-align: center; }
    :host-context(main.scene-on) .outro { background: transparent; }
    .stage { position: relative; z-index: 1; display: grid; justify-items: center; gap: 1.75rem; transform-origin: 50% 45%; margin-top: -40vh; gap: 1rem; }
    .kicker { margin: 0; font-family: var(--cf-display); font-size: .85rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: rgba(246, 241, 255, .7); }
    h2 { font-family: var(--cf-display); font-weight: 800; font-variation-settings: 'wdth' 76, 'opsz' 96; font-size: clamp(2.6rem, 6vw, 6.8rem);
      line-height: .84; letter-spacing: -.035em; margin: 0; text-shadow: 0 10px 60px rgba(18, 10, 38, .55); }
    .line { display: block; }
    .w { display: inline-block; margin: 0 .09em; will-change: transform, opacity, filter; }
    .line:last-child .w { color: #C4B5FD; }
    .veil { position: absolute; inset: 0; background: #7C3AED; opacity: 0; pointer-events: none; z-index: 2; }
    @media (max-width: 899px) { .stage { margin-top: -38vh; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutroComponent {
  protected readonly lines = LINES;
}
