import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../shared/logo.component';
import { COOKIES, LEGAL, PRIVACY } from './legal.data';

/** Pagina legale (informativa privacy o cookie policy), scelta dal dato di rotta `doc`. */
@Component({
  selector: 'cf-legal-page',
  imports: [RouterLink, LogoComponent],
  template: `
    <div class="legal">
      <header>
        <a class="brand" routerLink="/"><cf-logo class="mark" /> Childhood <strong>Friendship</strong></a>
        <nav aria-label="Documenti legali">
          <a routerLink="/privacy" [class.on]="doc() === 'privacy'">Privacy</a>
          <a routerLink="/cookie" [class.on]="doc() === 'cookie'">Cookie</a>
        </nav>
      </header>
      <main>
        <h1>{{ content().title }}</h1>
        <p class="intro">{{ content().intro }}</p>
        @for (s of content().sections; track s.title) {
          <section>
            <h2>{{ s.title }}</h2>
            @for (p of s.paragraphs ?? []; track $index) { <p>{{ p }}</p> }
            @if (s.items?.length) { <ul>@for (i of s.items; track $index) { <li>{{ i }}</li> }</ul> }
          </section>
        }
        <p class="meta">Ultimo aggiornamento: {{ legal.updated }} · Contatti: <a [href]="'mailto:' + legal.email">{{ legal.email }}</a></p>
        <a class="back" routerLink="/">← Torna al sito</a>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--cf-ink-deep, #120A26); color: var(--cf-chalk, #F6F1FF); }
    .legal { width: min(100% - 2rem, 760px); margin-inline: auto; padding-block: 2rem 4rem; font-family: 'Manrope Variable', 'Manrope', Arial, sans-serif; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 2rem; }
    .brand { display: inline-flex; align-items: center; gap: .6rem; color: inherit; text-decoration: none; font-size: .9rem; }
    .mark { width: 1.9rem; height: 1.9rem; }
    nav { display: flex; gap: 1rem; font-size: .85rem; }
    nav a { color: rgba(246, 241, 255, .65); text-decoration: none; }
    nav a.on, nav a:hover { color: #fff; text-decoration: underline; text-underline-offset: 4px; }
    h1 { font-family: var(--cf-display); font-size: clamp(2rem, 6vw, 3rem); line-height: 1.05; margin: 0 0 1rem; letter-spacing: -.02em; }
    .intro { font-size: 1.05rem; line-height: 1.65; color: rgba(246, 241, 255, .85); }
    section { margin-top: 2rem; }
    h2 { font-size: 1.1rem; margin: 0 0 .5rem; color: #C4B5FD; }
    p, li { line-height: 1.65; color: rgba(246, 241, 255, .82); font-size: .95rem; }
    ul { padding-left: 1.2rem; display: grid; gap: .5rem; }
    a { color: #C4B5FD; }
    .meta { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid rgba(246, 241, 255, .15); font-size: .85rem; }
    .back { display: inline-block; margin-top: 1rem; font-size: .9rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalPage {
  readonly doc = input<'privacy' | 'cookie'>('privacy');
  protected readonly legal = LEGAL;
  protected readonly content = computed(() => (this.doc() === 'cookie' ? COOKIES : PRIVACY));
}
