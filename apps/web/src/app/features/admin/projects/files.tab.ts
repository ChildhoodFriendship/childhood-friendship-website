import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectFilesComponent } from '../../../shared/project-files.component';
import { ProjectStore } from './project.store';

@Component({
  selector: 'cf-files-tab',
  imports: [ProjectFilesComponent],
  template: `
    @if (store.id()) {
      <cf-project-files [projectId]="store.id()" [readonly]="store.archived()" title="Materiali del progetto" />
    }
  `,
  styles: `:host { display: flex; flex-direction: column; gap: 12px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilesTab {
  protected readonly store = inject(ProjectStore);
}
