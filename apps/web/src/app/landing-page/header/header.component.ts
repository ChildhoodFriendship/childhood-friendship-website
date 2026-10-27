import { LogoComponent } from '../../shared/logo.component';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PortalI18nService } from '../../core/portal-i18n.service';

@Component({
  selector: 'cf-header',
  imports: [LogoComponent],
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  protected readonly i18n = inject(PortalI18nService);
}
