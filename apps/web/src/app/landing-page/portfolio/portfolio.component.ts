import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';

interface Project {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly line: string;
  readonly what: string;
  readonly done: readonly string[];
  readonly stack: readonly string[];
  readonly device: 'browser' | 'phone' | 'chip';
  readonly link?: { label: string; href: string };
  /** Palette della card: sfondo (due toni) e accento. */
  readonly c1: string;
  readonly c2: string;
  readonly accent: string;
  readonly ink: string;
}

/** Progetti reali (fonte: vault di progetto). Niente numeri inventati: solo cosa è stato costruito. */
const PROJECTS: readonly Project[] = [
  {
    id: 'gelateria', name: 'Gelateria da Cristian', kind: 'Sito vetrina · Attività locale',
    line: 'Un cono 3D che ti viene incontro.',
    what: 'Landing per una gelateria-caffetteria a Piove di Sacco: il cono fotorealistico in 3D si sovrappone al video del titolare che porge il gelato, poi accompagna lo scroll.',
    done: ['Modello 3D fotorealistico e animato', 'Card con colature e gocce animate', 'SEO locale, FAQ e dati strutturati'],
    stack: ['Three.js', 'JavaScript', 'SEO locale'], device: 'browser',
    c1: '#C5E3BE', c2: '#FDE8BA', accent: '#86BC7B', ink: '#2B2A1F'
  },
  {
    id: 'sissy', name: 'Sissy HairStyle', kind: 'App mobile · Prenotazioni',
    line: 'Prenoti scrivendo come parli.',
    what: 'App per un salone di parrucchieri con area clienti, area staff e pannello del titolare nella stessa base.',
    done: ['Prenotazione in linguaggio naturale', 'Calendario con drag & drop', 'Area staff che si "apre" all’accesso'],
    stack: ['Flutter', 'Firebase (in arrivo)'], device: 'phone',
    c1: '#FF7AA8', c2: '#7C3AED', accent: '#FFE1EC', ink: '#FFFFFF'
  },
  {
    id: 'sickfitpro', name: 'SickFitPro', kind: 'Web app + app · Fitness con AI',
    line: 'Allenamento e nutrizione, su misura.',
    what: 'Piattaforma fitness e nutrizione con coach AI: schede di allenamento, macro personalizzati e tracciamento, sul web e su mobile.',
    done: ['Schede e progressi tracciati', 'Coach AI per allenamento e dieta', 'Web e app dalla stessa piattaforma'],
    stack: ['Next.js', 'Flutter', 'Gemini AI'], device: 'phone',
    link: { label: 'sickfitpro.it', href: 'https://sickfitpro.it' },
    c1: '#0F172A', c2: '#16A34A', accent: '#4ADE80', ink: '#FFFFFF'
  },
  {
    id: 'abeona', name: 'Abeona', kind: 'Piattaforma · Viaggi su misura',
    line: 'Il mondo da girare con un dito.',
    what: 'Itinerari d’autore e viaggi su misura con un globo 3D interattivo, app mobile e un concierge AI.',
    done: ['Globo 3D interattivo', 'App mobile cross-platform', 'Concierge AI per gli itinerari'],
    stack: ['React', 'Three.js', 'Flutter', 'Firebase'], device: 'browser',
    c1: '#0B1D3A', c2: '#1E3A8A', accent: '#D4AF37', ink: '#FFFFFF'
  },
  {
    id: 'presenze', name: 'Presenze NFC', kind: 'IoT · Accessi e presenze',
    line: 'Un badge, un tocco, fatto.',
    what: 'Sistema hardware e software per controllo accessi e presenze: lettori NFC collegati a un backend con automazioni e notifiche.',
    done: ['Lettori NFC su ESP32', 'Backend e storico presenze', 'Automazioni e avvisi'],
    stack: ['ESP32', 'Express', 'PostgreSQL', 'n8n'], device: 'chip',
    c1: '#083344', c2: '#0E7490', accent: '#22D3EE', ink: '#FFFFFF'
  },
  {
    id: 'cf', name: 'Area clienti CF', kind: 'Gestionale · Su misura',
    line: 'Il progetto, sempre sotto gli occhi.',
    what: 'La piattaforma con cui seguiamo i clienti: progetti, checklist, documenti da approvare, messaggi e accessi cifrati.',
    done: ['Portale clienti e area admin', 'Documenti con approvazione', 'Credenziali cifrate e log'],
    stack: ['Angular', 'Express', 'PostgreSQL'], device: 'browser',
    c1: '#F4F0FF', c2: '#C4B5FD', accent: '#7C3AED', ink: '#120A26'
  }
];

/**
 * Portfolio cinematografico: carosello 3D guidato dallo scroll. Ogni progetto entra di lato, si ferma al centro,
 * si gira mostrando i dettagli e poi esce. Nella scena 3D il Builder e il socio "presentano" ogni card
 * (riceve l'evento `cf:portfolio`). Su mobile diventa un carosello a scorrimento con tocco per girare.
 */
@Component({
  selector: 'cf-portfolio',
  template: `
    <section #section class="portfolio" id="progetti" aria-labelledby="portfolio-title" [style.--n]="projects.length">
      <div class="sticky">
        <div class="ghost" aria-hidden="true">PROJECTS</div>
        <header class="head">
          <p class="kicker"><span aria-hidden="true"></span>Portfolio</p>
          <h2 id="portfolio-title">Cose che abbiamo<br /><em>costruito.</em></h2>
        </header>
        <div class="count" aria-hidden="true">
          <strong>{{ (current() + 1).toString().padStart(2, '0') }}</strong><span>/ {{ projects.length.toString().padStart(2, '0') }}</span>
          <div class="bar"><span [style.transform]="'scaleX(' + progress() + ')'"></span></div>
        </div>
        <!-- posti dei due personaggi 3D ai lati del carosello -->
        <div class="slot left" id="port-left" aria-hidden="true"></div>
        <div class="slot right" id="port-right" aria-hidden="true"></div>

        <ol class="ring" role="list">
          @for (p of projects; track p.id; let i = $index) {
            @let st = card()[i];
            <li class="pcard" [class.center]="i === current()" [class.flipped]="st.flip > 90" [class.hov]="hovered() === i"
              (pointerenter)="hover(i, $event)" (pointermove)="hover(i, $event)" (pointerleave)="hovered.set(-1)"
              [style.transform]="st.transform" [style.opacity]="st.opacity" [style.zIndex]="st.z"
              [style.--c1]="p.c1" [style.--c2]="p.c2" [style.--accent]="p.accent" [style.--ink]="p.ink" [style.--sheen]="st.sheen">
              <button type="button" class="flipper" [style.transform]="'rotateY(' + st.flip + 'deg) scale(' + st.hs + ')'" (click)="open(i)"
                [attr.aria-label]="p.link ? p.name + ': apri il sito live' : p.name + ': ' + (st.flip > 90 ? 'mostra copertina' : 'mostra dettagli')"
                [attr.data-cursor]="p.link ? 'apri sito' : (st.flip > 90 ? 'gira' : 'dettagli')">
                <!-- fronte: poster del progetto -->
                <span class="face front">
                  <span class="kind">{{ p.kind }}</span>
                  <span class="device {{ p.device }}" aria-hidden="true">
                    <span class="screen"><span class="l1"></span><span class="l2"></span><span class="l3"></span><span class="dot"></span></span>
                  </span>
                  <span class="name">{{ p.name }}</span>
                  <span class="line">{{ p.line }}</span>
                  <span class="hint" aria-hidden="true">{{ p.link ? 'Clicca per il sito live ↗' : 'Passa sopra per i dettagli' }}</span>
                </span>
                <!-- retro: dettagli -->
                <span class="face back">
                  <span class="kind">{{ p.kind }}</span>
                  <span class="bname">{{ p.name }}</span>
                  <span class="what">{{ p.what }}</span>
                  <span class="label">Cosa abbiamo costruito</span>
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
  protected readonly projects = PROJECTS;
  /** Posizione continua nel carosello e rotazione della card centrale (0..180). */
  private readonly pos = signal(0);
  private readonly flipNow = signal(0);
  private readonly manual = signal<Record<number, boolean>>({});
  /** Card sotto il puntatore: si gira sui dettagli e si ingrandisce. */
  protected readonly hovered = signal(-1);
  protected readonly progress = signal(0);
  protected readonly current = computed(() => Math.max(0, Math.min(this.projects.length - 1, Math.round(this.pos()))));
  private readonly cinematic = signal(false);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');

  /** Trasformazione 3D di ogni card: arco di carosello, profondità, giro della centrale. */
  protected readonly card = computed(() => {
    const pos = this.pos(), cur = this.current(), cin = this.cinematic(), man = this.manual(), hov = this.hovered();
    return this.projects.map((_, i) => {
      const o = i - pos;
      const a = Math.abs(o);
      // le card già passate restano girate (mostrano i dettagli), quelle future mostrano il fronte
      let flip = i < cur ? 180 : i === cur ? this.flipNow() : 0;
      if (man[i] !== undefined) flip = man[i] ? 180 : 0;
      if (hov === i) flip = 180;
      const hs = hov === i ? (cin ? 1.12 : 1.03) : 1;
      if (!cin) return { transform: '', opacity: 1, z: 1, flip, hs, sheen: '50%' };
      const x = o * 24;                       // vw: carosello stretto, ai lati restano liberi i due personaggi
      const ry = -o * 38;                     // gradi
      const z = -a * 300;                     // px
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
      const n = this.projects.length;
      let raf = 0, lastIdx = -1, lastFlip = false;
      const update = () => {
        raf = 0;
        const cin = mq.matches;
        this.cinematic.set(cin);
        if (!cin) return;
        const sec = this.section().nativeElement;
        const r = sec.getBoundingClientRect();
        const scrollable = sec.offsetHeight - window.innerHeight;
        const p = scrollable > 0 ? Math.min(1, Math.max(0, -r.top / scrollable)) : 0;
        this.progress.set(p);
        // ogni progetto: entra (0-20%), si ferma e si gira (35-60%), resta, esce (80-100%)
        const raw = Math.min(n - 1e-4, p * n), i = Math.floor(raw), t = raw - i;
        const ease = (x: number) => x * x * (3 - 2 * x);
        const move = t < 0.2 ? -0.5 + 0.5 * ease(t / 0.2) : t > 0.8 ? 0.5 * ease((t - 0.8) / 0.2) : 0;
        this.pos.set(Math.max(0, Math.min(n - 1, i + move)));
        const flip = 180 * ease(Math.min(1, Math.max(0, (t - 0.35) / 0.25)));
        this.flipNow.set(flip);
        if (Object.keys(this.manual()).length) this.manual.set({});
        // segnala alla scena 3D i momenti da "recitare": nuova card al centro, card che si gira
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

  /** Hover solo con mouse vero: su touch il tocco gira la card. */
  protected hover(i: number, e: PointerEvent): void {
    if (e.pointerType === 'mouse' && this.hovered() !== i) this.hovered.set(i);
  }

  /** Click: apre il sito live se c'è; su touch il primo tocco gira la card, il secondo apre. */
  protected open(i: number): void {
    const p = this.projects[i];
    const flipped = this.card()[i].flip > 90;
    if (p.link && (this.cinematic() || flipped)) { window.open(p.link.href, '_blank', 'noopener'); return; }
    this.toggle(i);
  }

  /** Gira la card a mano. */
  protected toggle(i: number): void {
    const now = this.card()[i].flip > 90;
    this.manual.update((m) => ({ ...m, [i]: !now }));
  }
}
