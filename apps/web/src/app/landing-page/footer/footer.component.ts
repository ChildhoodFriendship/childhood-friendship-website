import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-footer',
  imports: [LogoComponent],
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {}
