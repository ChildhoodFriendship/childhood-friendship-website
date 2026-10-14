import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL } from '../../legal/legal.data';

@Component({
  selector: 'cf-footer',
  imports: [LogoComponent, RouterLink],
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  protected readonly legal = LEGAL;
}
