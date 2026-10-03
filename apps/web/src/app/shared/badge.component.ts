import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BadgeTone } from './labels';

@Component({
  selector: 'cf-badge',
  template: `<span class="badge" [class]="cls()">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');
  protected readonly cls = computed(() => `badge ${this.tone() === 'neutral' ? '' : 'badge-' + this.tone()}`);
}
