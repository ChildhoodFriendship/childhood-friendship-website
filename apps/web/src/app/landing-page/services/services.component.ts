import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface Service {
  readonly id: string;
  readonly title: string;
  readonly line: string;
  readonly body: string;
  readonly includes: readonly string[];
  readonly from: string;
}

const SERVICES: readonly Service[] = [
  {
    id: 'siti', title: 'Siti web', line: 'Il primo incontro con il tuo brand. Deve lasciare il segno.',
    body: 'Progettiamo e sviluppiamo siti veloci, leggibili e riconoscibili, pensati per trasformare una visita in un contatto.',
    includes: ['Design su misura', 'SEO tecnica', 'Caricamento rapido', 'Form e misurazione'], from: 'da 200 €'
  },
  {
    id: 'webapp', title: 'Web app', line: 'Gestionali, portali e piattaforme costruiti sui tuoi processi.',
    body: 'Software che toglie lavoro invece di aggiungerne: dashboard, aree riservate, integrazioni con i sistemi che usi già.',
    includes: ['Analisi dei processi', 'Area clienti e ruoli', 'Integrazioni API', 'Database e backup'], from: 'da 600 €'
  },
  {
    id: 'mobile', title: 'App mobile', line: 'Nella tasca dei tuoi clienti, sempre pronta.',
    body: 'App per iOS e Android con un solo codice: accesso utenti, notifiche e dati sincronizzati con il resto del tuo business.',
    includes: ['iOS e Android', 'Login e profili', 'Notifiche push', 'Pubblicazione sugli store'], from: 'da 700 €'
  },
  {
    id: 'cura', title: 'Cura e crescita', line: 'Il lancio è l\'inizio. Restiamo.',
    body: 'Aggiornamenti, sicurezza, piccoli interventi e nuove funzioni quando servono. Un canone chiaro o interventi a chiamata.',
    includes: ['Aggiornamenti e backup', 'Monitoraggio', 'Modifiche rapide', 'Report sullo stato'], from: 'da 20 € / mese'
  }
];

@Component({
  selector: 'cf-services',
  template: `
    <section class="services" id="servizi" aria-labelledby="services-title">
      <header class="head">
        <h2 id="services-title">Cosa costruiamo</h2>
        <p>Quattro modi di lavorare insieme. Scegli da dove partire, al resto pensiamo noi.</p>
      </header>
      <ul class="rows">
        @for (s of services; track s.id) {
          @let isOpen = open() === s.id;
          <li class="row" [class.open]="isOpen">
            <button type="button" class="summary" (click)="toggle(s.id)" [attr.aria-expanded]="isOpen" [attr.aria-controls]="'srv-' + s.id"
              [attr.data-cursor]="isOpen ? 'chiudi' : 'apri'">
              <span class="title">{{ s.title }}</span>
              <span class="line">{{ s.line }}</span>
              <span class="plus" aria-hidden="true"></span>
            </button>
            <div class="detail" [id]="'srv-' + s.id" role="region" [attr.aria-label]="s.title">
              <div class="detail-inner">
                <p class="body">{{ s.body }}</p>
                <ul class="incl">@for (i of s.includes; track i) { <li>{{ i }}</li> }</ul>
                <div class="price"><span>{{ s.from }}</span><a href="#contatti">Chiedi un preventivo</a></div>
              </div>
            </div>
          </li>
        }
      </ul>
      <p class="note">Hosting, dominio e servizi cloud sono esclusi dai prezzi: li scegliamo insieme e restano intestati a te.</p>
    </section>
  `,
  styleUrl: './services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesComponent {
  protected readonly services = SERVICES;
  protected readonly open = signal<string | null>('siti');
  protected toggle(id: string): void { this.open.update((o) => (o === id ? null : id)); }
}
