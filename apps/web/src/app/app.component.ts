import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OverlaysComponent } from './shared/overlays.component';

@Component({
  selector: 'cf-root',
  imports: [RouterOutlet, OverlaysComponent],
  template: '<router-outlet /><cf-overlays />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}
