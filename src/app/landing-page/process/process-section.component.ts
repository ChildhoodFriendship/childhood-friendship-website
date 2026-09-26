import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ProcessStep {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'cf-process-section',
  standalone: true,
  templateUrl: './process-section.component.html',
  styleUrl: './process-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessSectionComponent {
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
