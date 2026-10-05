import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CONTACTS } from '../contacts';

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
      <!-- contatti diretti: solo icone -->
      <nav class="social" aria-label="Contatti diretti">
        @if (contacts.email) {
          <a class="ico" [href]="'mailto:' + contacts.email" aria-label="Scrivici una email" data-cursor="email">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M4 7.5l8 6 8-6" /></svg>
          </a>
        }
          <a class="ico" [href]="contacts.phone ? 'tel:' + phoneHref : '#contatti'" aria-label="Chiamaci" data-cursor="chiama">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h2.6l1.6 4.2-2 1.3a11.5 11.5 0 0 0 6.2 6.2l1.3-2 4.2 1.6v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" /></svg>
          </a>
          <a class="ico" [href]="contacts.instagram ? 'https://instagram.com/' + contacts.instagram : '#contatti'" [attr.target]="contacts.instagram ? '_blank' : null" rel="noopener" aria-label="Seguici su Instagram" data-cursor="instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle class="dot" cx="17.2" cy="6.8" r="1" /></svg>
          </a>
      </nav>
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
    .social { position: absolute; z-index: 1; top: 6.5rem; right: clamp(1.25rem, 4vw, 4rem); display: flex; gap: .75rem; }
    .ico { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 16px; color: var(--cf-chalk);
      background: rgba(246, 241, 255, .06); border: 1.5px solid rgba(246, 241, 255, .22); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      transition: background .25s, border-color .25s, color .25s, transform .25s, box-shadow .25s; }
    .ico svg { width: 1.45rem; height: 1.45rem; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .ico .dot { fill: currentColor; stroke: none; }
    .ico:hover, .ico:focus-visible { background: var(--cf-violet); border-color: #A78BFA; color: #fff; transform: translateY(-3px); box-shadow: 0 10px 30px -8px rgba(124, 58, 237, .8); outline: none; }
    .veil { position: absolute; inset: 0; background: #7C3AED; opacity: 0; pointer-events: none; z-index: 2; }
    @media (max-width: 899px) {
      .stage { margin-top: -38vh; }
      .social { top: 5rem; right: 1rem; gap: .5rem; }
      .ico { width: 2.75rem; height: 2.75rem; border-radius: 14px; }
      .ico svg { width: 1.25rem; height: 1.25rem; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutroComponent {
  protected readonly contacts = CONTACTS;
  protected readonly phoneHref = CONTACTS.phone.replace(/[^\d+]/g, '');
  protected readonly lines = LINES;
}
