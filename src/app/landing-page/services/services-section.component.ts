import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ServiceCard {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

@Component({
  selector: 'cf-services-section',
  standalone: true,
  templateUrl: './services-section.component.html',
  styleUrl: './services-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesSectionComponent {
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
}
