import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-hero-section',
  standalone: true,
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSectionComponent {}
