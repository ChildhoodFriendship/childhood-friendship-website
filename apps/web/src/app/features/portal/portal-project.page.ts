import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PHASES, getDocumentTypeDef } from '@cf/shared/catalog';
import type { DocumentSummaryDto, PortalProjectDto, PortalTaskDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { ToastService } from '../../core/toast.service';
import { BadgeComponent } from '../../shared/badge.component';
import { documentStatus, percent, phaseLabel, projectStatus } from '../../shared/labels';
import { MessagesThreadComponent } from '../../shared/messages-thread.component';
import { ProjectFilesComponent } from '../../shared/project-files.component';

@Component({
  selector: 'cf-portal-project-page',
  imports: [DatePipe, RouterLink, BadgeComponent, MessagesThreadComponent, ProjectFilesComponent],
  template: `
    <div class="page" style="max-width: 1080px">
      @if (project(); as p) {
        <header class="stack-sm">
          <a routerLink="/portale" class="small">← I tuoi progetti</a>
          <div class="page-header">
            <div>
              <h1>{{ p.name }}</h1>
              <div class="row" style="margin-top: 8px">
                @let st = projectStatus(p.status);
                <cf-badge [label]="st.label" [tone]="st.tone" />
                @if (p.deadline) { <span class="muted small">Consegna prevista {{ p.deadline | date: 'd MMMM y' }}</span> }
                @if (p.isOnline && p.targetUrl) { <a class="small" [href]="p.targetUrl" target="_blank" rel="noopener noreferrer">Visita il sito ↗</a> }
              </div>
            </div>
          </div>
        </header>

        @if (toReview().length) {
          <section class="card attention stack-sm">
            <h2>Serve il tuo ok</h2>
            <p class="muted small">Questi documenti aspettano la tua approvazione per proseguire.</p>
            @for (d of toReview(); track d.id) {
              <a class="line" [routerLink]="['documenti', d.id]"><span class="grow">{{ d.title }}</span><span class="btn btn-sm btn-primary">Rivedi</span></a>
            }
          </section>
        }

        <section class="card">
          <h2>Avanzamento</h2>
          <ol class="phases">
            @for (ph of phases(); track ph.phase) {
              <li [class.done]="ph.pct === 100" [class.current]="ph.current">
                <span class="dot" aria-hidden="true"></span>
                <strong>{{ ph.label }}</strong>
                <span class="muted small mono">{{ ph.pct }}%</span>
              </li>
            }
          </ol>
        </section>

        <div class="cols">
          <section class="stack-sm">
            <h2>Messaggi</h2>
            <cf-messages-thread [projectId]="p.id" />
            <cf-project-files [projectId]="p.id" [readonly]="!!p.archivedAt" title="I tuoi materiali"
              hint="Caricaci logo, foto, testi e documenti utili al progetto (max 25 MB ciascuno)." />
          </section>
          <aside class="stack">
            <section class="card stack-sm">
              <h3>Documenti</h3>
              @for (d of docs(); track d.id) {
                @let ds = documentStatus(d.status);
                <a class="line" [routerLink]="['documenti', d.id]"><span class="grow truncate">{{ d.title }}</span><cf-badge [label]="ds.label" [tone]="ds.tone" /></a>
              } @empty { <p class="muted small">I documenti appariranno qui man mano.</p> }
            </section>
          </aside>
        </div>
      } @else if (error()) {
        <div class="alert alert-error">{{ error() }} · <a routerLink="/portale">Torna ai progetti</a></div>
      } @else {
        <div class="skeleton" style="height: 200px"></div>
      }
    </div>
  `,
  styles: `
    .attention { border-color: rgba(251, 191, 36, .5); }
    .line { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--cf-color-border); color: inherit !important; text-decoration: none !important; }
    .line:last-child { border-bottom: 0; }
    .cols { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
    @media (max-width: 960px) { .cols { grid-template-columns: 1fr; } }
    .phases { list-style: none; margin: 16px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .phases li { display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 10px; background: var(--cf-surface-2); border: 1px solid transparent; }
    .phases li.current { border-color: var(--cf-color-violet-light); }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--cf-color-border); }
    .phases li.done .dot { background: var(--cf-color-success); }
    .phases li.current .dot { background: var(--cf-color-violet-light); box-shadow: 0 0 0 4px var(--cf-violet-soft); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortalProjectPage {
  readonly projectId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly projectStatus = projectStatus;
  protected readonly documentStatus = documentStatus;
  protected readonly project = signal<PortalProjectDto | null>(null);
  protected readonly docs = signal<DocumentSummaryDto[]>([]);
  protected readonly tasks = signal<PortalTaskDto[]>([]);
  protected readonly error = signal<string | null>(null);

  protected readonly toReview = computed(() => this.docs().filter((d) => d.status === 'in_revisione'));
  protected readonly phases = computed(() => {
    const list = PHASES.map((phase) => {
      const t = this.tasks().filter((x) => x.phase === phase);
      return { phase, label: phaseLabel(phase), pct: percent(t.filter((x) => x.done).length, t.length), total: t.length, current: false };
    }).filter((p) => p.total);
    const current = list.find((p) => p.pct < 100);
    if (current) current.current = true;
    return list;
  });

  constructor() {
    effect(() => { void this.load(this.projectId()); });
  }

  private async load(id: string): Promise<void> {
    try {
      const [p, docs, tasks] = await Promise.all([
        this.api.get<PortalProjectDto>(`/projects/${id}`),
        this.api.get<DocumentSummaryDto[]>(`/projects/${id}/documents`),
        this.api.get<PortalTaskDto[]>(`/projects/${id}/tasks`)
      ]);
      this.project.set(p);
      // Mostriamo al cliente solo documenti già avviati, ordinati per fase
      this.docs.set(docs.filter((d) => d.status !== 'bozza' || d.version > 1)
        .sort((a, b) => PHASES.indexOf(getDocumentTypeDef(a.type)?.phase ?? 'realizzazione') - PHASES.indexOf(getDocumentTypeDef(b.type)?.phase ?? 'realizzazione')));
      this.tasks.set(tasks);
    } catch (err) {
      this.error.set((err as Error).message);
      this.toast.error(err);
    }
  }
}
