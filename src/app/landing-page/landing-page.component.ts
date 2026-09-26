import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ServiceCard {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

interface ProcessStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'cf-landing-page',
  standalone: true,
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  protected readonly services: readonly ServiceCard[] = [
    {
      number: '01',
      title: 'Siti web',
      description: 'Presenze digitali veloci, riconoscibili e costruite per trasformare visite in opportunità.',
      tags: ['Landing page', 'Corporate', 'E-commerce']
    },
    {
      number: '02',
      title: 'Web app',
      description: 'Prodotti digitali su misura che semplificano processi e fanno crescere il tuo business.',
      tags: ['Dashboard', 'SaaS', 'Portali']
    },
    {
      number: '03',
      title: 'App mobile',
      description: 'Esperienze mobile intuitive, progettate per essere affidabili dal primo tap all’ultimo.',
      tags: ['iOS', 'Android', 'Cross-platform']
    }
  ];

  protected readonly process: readonly ProcessStep[] = [
    {
      number: '01',
      title: 'Capire',
      description: 'Partiamo dai tuoi obiettivi, dal contesto e dalle persone che useranno il prodotto.'
    },
    {
      number: '02',
      title: 'Costruire',
      description: 'Disegniamo una soluzione chiara e la sviluppiamo con iterazioni rapide e trasparenti.'
    },
    {
      number: '03',
      title: 'Far crescere',
      description: 'Consegniamo basi solide, misuriamo i risultati e continuiamo a migliorare insieme.'
    }
  ];
}
