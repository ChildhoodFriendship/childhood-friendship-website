import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaveauSceneComponent } from './caveau-scene.component';

/** Easter egg: il caveau 3D dei progetti (prima versione dell'hero). */
@Component({
  selector: 'cf-caveau-page',
  imports: [RouterLink, CaveauSceneComponent],
  template: `
    <a class="back" routerLink="/">Torna in cortile</a>
    <cf-caveau-scene />
  `,
  styles: `
    :host { display: block; background: #0a0a0a; }
    .back { position: fixed; top: 1.25rem; left: 1.25rem; z-index: 50; color: var(--cf-chalk); font-family: var(--cf-hand); font-size: 1.6rem; text-decoration: none; }
    .back:hover { color: var(--cf-sun); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaveauPage {}
