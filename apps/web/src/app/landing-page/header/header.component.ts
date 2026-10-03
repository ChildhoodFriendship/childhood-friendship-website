import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cf-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {}
