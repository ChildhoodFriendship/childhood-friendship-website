import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

type PricingView = 'development' | 'maintenance';

interface PricingCard {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly description: string;
  readonly features: readonly string[];
}

@Component({
  selector: 'cf-pricing-section',
  standalone: true,
  templateUrl: './pricing-section.component.html',
  styleUrl: './pricing-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PricingSectionComponent {
  protected readonly activeView = signal<PricingView>('development');

  protected readonly developmentPlans: readonly PricingCard[] = [
    {
      name: 'Landing Page',
      price: '€200',
      cadence: 'sviluppo iniziale',
      description: 'Una monopagina ad alta conversione, progettata per presentare il tuo brand e trasformare visite in opportunità.',
      features: ['Design custom dark/tech', 'Ottimizzazione SEO tecnica', 'Form di contatto']
    },
    {
      name: 'Web App',
      price: '€600',
      cadence: 'sviluppo iniziale',
      description: 'Un’applicazione web multipagina custom, costruita per processi, servizi e prodotti digitali che devono crescere.',
      features: ['Angular 22 e routing avanzato', 'Gestione dello stato', 'Integrazione API e database']
    },
    {
      name: 'App Mobile',
      price: '€700',
      cadence: 'sviluppo iniziale',
      description: 'Un’applicazione mobile cross-platform ad alte prestazioni con una base solida per dati, utenti e autenticazione.',
      features: ['Esperienza cross-platform', 'Logica di base e gestione dati', 'Autenticazione']
    }
  ];

  protected readonly maintenancePlans: readonly PricingCard[] = [
    {
      name: 'Canone di manutenzione',
      price: '€20',
      cadence: 'al mese',
      description: 'Supporto continuativo per mantenere il progetto stabile e accompagnarne l’evoluzione nel tempo.',
      features: ['Supporto continuativo', 'Verifiche di stabilità', 'Piccoli interventi di controllo']
    },
    {
      name: 'Modifica a chiamata',
      price: '€50',
      cadence: 'per modifica',
      description: 'Una tariffa trasparente per aggiornamenti spot richiesti dal cliente, senza attivare un canone ricorrente.',
      features: ['Modifica testuale', 'Aggiornamento grafico', 'Intervento singolo']
    }
  ];

  protected selectView(view: PricingView): void {
    this.activeView.set(view);
  }
}
