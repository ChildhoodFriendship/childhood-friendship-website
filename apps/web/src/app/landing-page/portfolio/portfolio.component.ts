import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { PortalI18nService } from '../../core/portal-i18n.service';

/**
 * Portfolio cinematografico: carosello 3D guidato dallo scroll. Ogni progetto entra di lato, si ferma al centro,
 * si gira mostrando i dettagli e poi esce. Nella scena 3D il Builder e il socio "presentano" ogni card
 * (riceve l'evento `cf:portfolio`). Su mobile diventa un carosello a scorrimento con tocco per girare.
 */
@Component({
  selector: 'cf-portfolio',
  template: `
    <section #section class="portfolio" id="progetti" aria-labelledby="portfolio-title" [style.--n]="projects().length">
      <div class="sticky">
        <div class="ghost" aria-hidden="true">PROJECTS</div>
        <header class="head">
          <p class="kicker"><span aria-hidden="true"></span>{{ i18n.landing().portfolio.kicker }}</p>
          <h2 id="portfolio-title">
            {{ i18n.isEn() ? 'Things we have' : 'Cose che abbiamo' }}<br />
            <em>{{ i18n.isEn() ? 'crafted.' : 'costruito.' }}</em>
          </h2>
        </header>
        <div class="count" aria-hidden="true">
          <strong>{{ (current() + 1).toString().padStart(2, '0') }}</strong><span>/ {{ projects().length.toString().padStart(2, '0') }}</span>
          <div class="bar"><span [style.transform]="'scaleX(' + progress() + ')'"></span></div>
        </div>
        <!-- posti dei due personaggi 3D ai lati del carosello -->
        <div class="slot left" id="port-left" aria-hidden="true"></div>
        <div class="slot right" id="port-right" aria-hidden="true"></div>

        <ol class="ring" role="list">
          @for (p of projects(); track p.id; let i = $index) {
            @let st = card()[i];
            <li class="pcard" [class.center]="i === current()" [class.flipped]="st.flip > 90" [class.hov]="hovered() === i"
              (pointerenter)="hover(i, $event)" (pointermove)="hover(i, $event)" (pointerleave)="hovered.set(-1)"
              [style.transform]="st.transform" [style.opacity]="st.opacity" [style.zIndex]="st.z"
              [style.--c1]="p.c1" [style.--c2]="p.c2" [style.--accent]="p.accent" [style.--ink]="p.ink" [style.--sheen]="st.sheen">
              <button type="button" class="flipper" [style.transform]="'rotateY(' + st.flip + 'deg) scale(' + st.hs + ')'" (click)="open(i)"
                [attr.aria-label]="p.link ? p.name + ': ' + (i18n.isEn() ? 'open live site' : 'apri il sito live') : p.name + ': ' + (st.flip > 90 ? (i18n.isEn() ? 'show cover' : 'mostra copertina') : (i18n.isEn() ? 'show details' : 'mostra dettagli'))"
                [attr.data-cursor]="p.link ? (i18n.isEn() ? 'live site' : 'apri sito') : (st.flip > 90 ? (i18n.isEn() ? 'flip' : 'gira') : (i18n.isEn() ? 'details' : 'dettagli'))">
                <!-- fronte: poster del progetto -->
                <span class="face front">
                  <span class="kind">{{ p.kind }}</span>
                  <span class="device {{ p.device }}" aria-hidden="true">
                    <span class="screen"><span class="l1"></span><span class="l2"></span><span class="l3"></span><span class="dot"></span></span>
                  </span>
                  <span class="name">{{ p.name }}</span>
                  <span class="line">{{ p.line }}</span>
                  <span class="hint" aria-hidden="true">{{ p.link ? (i18n.isEn() ? 'Click for live site ↗' : 'Clicca per il sito live ↗') : (i18n.isEn() ? 'Hover for details' : 'Passa sopra per i dettagli') }}</span>
                </span>
                <!-- retro: dettagli -->
                <span class="face back">
                  <span class="kind">{{ p.kind }}</span>
                  <span class="bname">{{ p.name }}</span>
                  <span class="what">{{ p.what }}</span>
                  <span class="label">{{ i18n.isEn() ? 'What we built' : 'Cosa abbiamo costruito' }}</span>
                  <span class="done">@for (d of p.done; track d) {<span>{{ d }}</span>}</span>
                  <span class="stack">@for (s of p.stack; track s) {<span>{{ s }}</span>}</span>
                  @if (p.link) { <span class="live" aria-hidden="true">{{ p.link.label }} ↗</span> }
                </span>
              </button>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styleUrl: './portfolio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioComponent {
  protected readonly i18n = inject(PortalI18nService);
  protected readonly projects = computed(() => this.i18n.landing().portfolio.projects);
  /** Posizione continua nel carosello e rotazione della card centrale (0..180). */
  private readonly pos = signal(0);
  private readonly flipNow = signal(0);
  private readonly manual = signal<Record<number, boolean>>({});
  /** Card sotto il puntatore: si gira sui dettagli e si ingrandisce. */
  protected readonly hovered = signal(-1);
  protected readonly progress = signal(0);
  protected readonly current = computed(() => Math.max(0, Math.min(this.projects().length - 1, Math.round(this.pos()))));
  private readonly cinematic = signal(false);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');

  /** Trasformazione 3D di ogni card: arco di carosello, profondità, giro della centrale. */
  protected readonly card = computed(() => {
    const list = this.projects();
    const pos = this.pos(), cur = this.current(), cin = this.cinematic(), man = this.manual(), hov = this.hovered();
    return list.map((_, i) => {
      const o = i - pos;
      const a = Math.abs(o);
      let flip = i < cur ? 180 : i === cur ? this.flipNow() : 0;
      if (man[i] !== undefined) flip = man[i] ? 180 : 0;
      if (hov === i) flip = 180;
      const hs = hov === i ? (cin ? 1.12 : 1.03) : 1;
      if (!cin) return { transform: '', opacity: 1, z: 1, flip, hs, sheen: '50%' };
      const x = o * 24;
      const ry = -o * 38;
      const z = -a * 300;
      const s = 1 - Math.min(a, 2) * 0.12;
      return {
        transform: `translate(-50%, -50%) translateX(${x}vw) translateZ(${z}px) rotateY(${ry}deg) scale(${s})`,
        opacity: hov === i ? Math.max(1 - a * 0.3, 0.95) : a <= 1 ? 1 - a * 0.3 : Math.max(0, 0.7 - (a - 1) * 0.9),
        z: hov === i ? 200 : 100 - Math.round(a * 10),
        flip, hs,
        sheen: `${50 + o * 60 + (flip / 180) * 40}%`
      };
    });
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const mq = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
      let raf = 0, lastIdx = -1, lastFlip = false;
      const update = () => {
        raf = 0;
        const n = this.projects().length;
        const cin = mq.matches;
        this.cinematic.set(cin);
        if (!cin) return;
        const sec = this.section().nativeElement;
        const r = sec.getBoundingClientRect();
        const scrollable = sec.offsetHeight - window.innerHeight;
        const p = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
        this.progress.set(p);
        const raw = Math.min(n - 1e-4, p * n), i = Math.floor(raw), t = raw - i;
        const ease = (x: number) => x * x * (3 - 2 * x);
        const move = t < 0.2 ? -0.5 + 0.5 * ease(t / 0.2) : t > 0.8 ? 0.5 * ease((t - 0.8) / 0.2) : 0;
        this.pos.set(Math.max(0, Math.min(n - 1, i + move)));
        const flip = 180 * ease(Math.min(1, Math.max(0, (t - 0.35) / 0.25)));
        this.flipNow.set(flip);
        if (Object.keys(this.manual()).length) this.manual.set({});
        const flipped = flip > 90;
        if (i !== lastIdx || flipped !== lastFlip) {
          window.dispatchEvent(new CustomEvent('cf:portfolio', { detail: { index: i, flipped, newCard: i !== lastIdx } }));
          lastIdx = i; lastFlip = flipped;
        }
      };
      const onScroll = () => { raf ||= requestAnimationFrame(update); };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      mq.addEventListener('change', onScroll);
      update();
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        mq.removeEventListener('change', onScroll);
        cancelAnimationFrame(raf);
      });
    });
  }

  protected hover(i: number, e: PointerEvent): void {
    if (e.pointerType === 'mouse' && this.hovered() !== i) this.hovered.set(i);
  }

  protected open(i: number): void {
    const p = this.projects()[i];
    const flipped = this.card()[i].flip > 90;
    if (p.link && (this.cinematic() || flipped)) { window.open(p.link.href, '_blank', 'noopener'); return; }
    this.toggle(i);
  }

  protected toggle(i: number): void {
    const now = this.card()[i].flip > 90;
    this.manual.update((m) => ({ ...m, [i]: !now }));
  }
}
