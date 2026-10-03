import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Hero leggero (solo HTML/CSS): stesso messaggio dell'hero 3D. */
@Component({
  selector: 'cf-hero-static',
  template: `
    <section class="hero-static" aria-labelledby="hero-title">
      <div class="grid-lines" aria-hidden="true"></div>
      <div class="content section-shell">
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> Software studio indipendente</p>
          <h1 id="hero-title">Codice su misura.<br><em>Risultati concreti.</em></h1>
          <p class="hero-description">Progettiamo e sviluppiamo software che fa la differenza — dalla strategia al deploy, senza compromessi.</p>
          <div class="hero-actions">
            <a class="button button-primary" href="#contatti">Parliamo del tuo progetto <span aria-hidden="true">↗</span></a>
            <a class="text-link" href="#servizi">Cosa facciamo <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>
    </section>
  `,
  styleUrl: './hero-static.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroStaticComponent {}
