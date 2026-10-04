import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type PricingView = 'development' | 'maintenance';

interface Plan {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly price: string;
  readonly cadence: string;
  readonly description: string;
  readonly idealFor: string;
  readonly features: readonly string[];
}

const DEVELOPMENT: readonly Plan[] = [
  {
    id: 'landing', name: 'Landing page', tagline: 'Una pagina, un obiettivo: farti scegliere.',
    price: '200', cadence: 'una tantum',
    description: 'Una monopagina ad alta conversione, progettata per presentare il tuo brand e trasformare le visite in contatti.',
    idealFor: 'Lanci, professionisti, attività locali, campagne.',
    features: ['Design su misura', 'SEO tecnica', 'Form di contatto', 'Ottimizzata per mobile']
  },
  {
    id: 'webapp', name: 'Web app', tagline: 'Software costruito sui tuoi processi.',
    price: '600', cadence: 'una tantum',
    description: 'Un’applicazione web multipagina su misura per gestire processi, servizi e prodotti digitali che devono crescere.',
    idealFor: 'Gestionali, portali clienti, piattaforme e dashboard.',
    features: ['Angular 22', 'Area riservata e ruoli', 'Integrazione API e database', 'Gestione dello stato']
  },
  {
    id: 'mobile', name: 'App mobile', tagline: 'Nella tasca dei tuoi clienti.',
    price: '700', cadence: 'una tantum',
    description: 'Un’app cross-platform ad alte prestazioni, con una base solida per dati, utenti e autenticazione.',
    idealFor: 'Prenotazioni, community, fidelizzazione, servizi on the go.',
    features: ['iOS e Android', 'Login e profili', 'Logica e gestione dati', 'Base pronta a crescere']
  }
];

const MAINTENANCE: readonly Plan[] = [
  {
    id: 'canone', name: 'Canone di cura', tagline: 'Il lancio è l’inizio. Restiamo.',
    price: '20', cadence: 'al mese',
    description: 'Supporto continuativo per mantenere il progetto stabile, sicuro e aggiornato, e accompagnarne l’evoluzione.',
    idealFor: 'Chi vuole un punto di riferimento fisso, senza pensieri.',
    features: ['Supporto continuativo', 'Verifiche di stabilità', 'Aggiornamenti', 'Piccoli interventi']
  },
  {
    id: 'chiamata', name: 'Modifica a chiamata', tagline: 'Paghi solo quando serve.',
    price: '50', cadence: 'per intervento',
    description: 'Una tariffa trasparente per aggiornamenti puntuali, senza attivare un canone ricorrente.',
    idealFor: 'Ritocchi occasionali a testi, immagini e grafica.',
    features: ['Modifica dei testi', 'Aggiornamento grafico', 'Intervento singolo']
  }
];

@Component({
  selector: 'cf-pricing-section',
  standalone: true,
  templateUrl: './pricing-section.component.html',
  styleUrl: './pricing-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricingSectionComponent {
  protected readonly view = signal<PricingView>('development');
  protected readonly plans = computed(() => (this.view() === 'development' ? DEVELOPMENT : MAINTENANCE));
  protected readonly open = signal<string | null>(DEVELOPMENT[0].id);

  protected select(view: PricingView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.open.set(view === 'development' ? DEVELOPMENT[0].id : MAINTENANCE[0].id);
  }

  protected toggle(id: string): void {
    this.open.update((o) => (o === id ? null : id));
  }
}
