import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LEGAL } from '../../legal/legal.data';
import { PortalI18nService } from '../../core/portal-i18n.service';

@Component({
  selector: 'cf-footer',
  imports: [LogoComponent, RouterLink],
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
  protected readonly i18n = inject(PortalI18nService);
  protected readonly legal = LEGAL;
}
