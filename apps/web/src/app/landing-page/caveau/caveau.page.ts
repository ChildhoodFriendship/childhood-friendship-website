import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaveauSceneComponent } from './caveau-scene.component';

/** Easter egg: il caveau 3D dei progetti (prima versione dell'hero). */
@Component({
  selector: 'cf-caveau-page',
  imports: [RouterLink, CaveauSceneComponent],
  template: `
    <a class="back" routerLink="/" aria-label="Torna alla home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></a>
    <cf-caveau-scene />
  `,
  styles: `
    :host { display: block; background: #0a0a0a; }
    .back { position: fixed; top: 1.25rem; left: 1.25rem; z-index: 50; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 14px;
      color: var(--cf-chalk); background: rgba(246, 241, 255, .06); border: 1.5px solid rgba(246, 241, 255, .2); backdrop-filter: blur(8px); transition: background .25s, border-color .25s; }
    .back svg { width: 1.3rem; height: 1.3rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .back:hover, .back:focus-visible { background: var(--cf-violet); border-color: #A78BFA; outline: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaveauPage {}
