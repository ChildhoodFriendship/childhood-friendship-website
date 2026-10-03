import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-header',
  imports: [LogoComponent],
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {}
