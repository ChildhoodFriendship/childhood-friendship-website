import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MessagesThreadComponent } from '../../../shared/messages-thread.component';
import { ProjectStore } from './project.store';

@Component({
  selector: 'cf-messages-tab',
  imports: [MessagesThreadComponent],
  template: `
    <p class="muted small">Conversazione condivisa con il cliente: tutto ciò che scrivi qui è visibile nel suo portale.</p>
    @if (store.id()) { <cf-messages-thread [projectId]="store.id()" /> }
  `,
  styles: `:host { display: flex; flex-direction: column; gap: 12px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesTab {
  protected readonly store = inject(ProjectStore);
}
