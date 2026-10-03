import { Injectable, computed, inject, signal } from '@angular/core';
import type { ProjectPatch } from '@cf/shared/schemas';
import type { ProjectDto } from '@cf/shared/types';
import { Api } from '../../../core/api';

/** Stato del progetto condiviso tra le schede (fornito dalla pagina di dettaglio). */
@Injectable()
export class ProjectStore {
  private readonly api = inject(Api);
  readonly project = signal<ProjectDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly id = computed(() => this.project()?.id ?? '');
  readonly archived = computed(() => !!this.project()?.archivedAt);

  async load(id: string): Promise<void> {
    this.error.set(null);
    try { this.project.set(await this.api.get<ProjectDto>(`/projects/${id}`)); }
    catch (err) { this.error.set((err as Error).message); }
  }

  async refresh(): Promise<void> {
    const id = this.id();
    if (id) this.project.set(await this.api.get<ProjectDto>(`/projects/${id}`));
  }

  async update(patch: ProjectPatch): Promise<void> {
    this.project.set(await this.api.patch<ProjectDto>(`/projects/${this.id()}`, patch));
  }

  async setArchived(archived: boolean): Promise<void> {
    this.project.set(await this.api.post<ProjectDto>(`/projects/${this.id()}/${archived ? 'archive' : 'restore'}`));
  }
}
