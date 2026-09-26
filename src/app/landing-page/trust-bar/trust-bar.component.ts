import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-trust-bar',
  standalone: true,
  templateUrl: './trust-bar.component.html',
  styleUrl: './trust-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrustBarComponent {}
