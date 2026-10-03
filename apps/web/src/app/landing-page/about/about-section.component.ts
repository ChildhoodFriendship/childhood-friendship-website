import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-about-section',
  standalone: true,
  templateUrl: './about-section.component.html',
  styleUrl: './about-section.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutSectionComponent {}
