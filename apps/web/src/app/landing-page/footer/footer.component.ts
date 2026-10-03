import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {}
