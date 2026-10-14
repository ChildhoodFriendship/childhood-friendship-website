import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LEAD_STATUSES, PROJECT_STATUSES } from '@cf/shared/catalog';
import type { DashboardDto } from '@cf/shared/types';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { BadgeComponent } from '../../shared/badge.component';
import { BarChartComponent, type ChartSeries } from '../../shared/bar-chart.component';
import { LEAD_STATUS_LABELS, documentStatus, euro, projectStatus } from '../../shared/labels';

/** Palette validata (dataviz validator, superficie scura #171717): viola CF + ambra. */
const C_SITO = '#8B5CF6';
const C_PROSPEZIONE = '#D97706';

const dayFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('it-IT', { month: 'short' });

@Component({
  selector: 'cf-dashboard-page',
  imports: [DatePipe, RouterLink, BadgeComponent, BarChartComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div><span class="eyebrow">Panoramica</span><h1>Buongiorno, {{ firstName() }}</h1><p>{{ today | date: 'EEEE d MMMM y' }}</p></div>
        <a class="btn btn-primary" routerLink="/admin/progetti" [queryParams]="{ nuovo: 1 }">+ Nuovo progetto</a>
      </header>

      @if (error()) { <div class="alert alert-error">{{ error() }} <button class="btn btn-sm" (click)="load()">Riprova</button></div> }

      @if (data(); as d) {
        <section class="kpis" aria-label="Indicatori">
          <a class="card kpi" routerLink="/admin/progetti">
            <span class="muted">Progetti attivi</span><strong>{{ activeProjects() }}</strong>
            <small class="muted">{{ d.projectsByStatus.lanciato }} lanciati</small>
          </a>
          <a class="card kpi" routerLink="/admin/lead">
            <span class="muted">Nuovi lead</span><strong>{{ d.newLeads }}</strong>
            <small class="muted">{{ leadsThisWeek() }} questa settimana</small>
          </a>
          <a class="card kpi" routerLink="/admin/lead">
            <span class="muted">Valore pipeline</span><strong>{{ euro(d.pipelineValueCents) }}</strong>
            <small class="muted">lead aperti con prezzo</small>
          </a>
          <div class="card kpi">
            <span class="muted">Chiuso negli ultimi 6 mesi</span><strong>{{ euro(closedTotal()) }}</strong>
            <small class="muted">{{ closedDeals() }} progetti · conversione {{ conversion() }}%</small>
          </div>
          <div class="card kpi">
            <span class="muted">Task in ritardo</span><strong [class.danger]="d.overdueTasks.length">{{ d.overdueTasks.length }}</strong>
            <small class="muted">{{ d.documentsInReview.length }} documenti in attesa</small>
          </div>
        </section>

        <div class="grid-2 charts">
          <section class="card">
            <div class="card-head"><h2>Lead per settimana</h2><span class="muted small">ultime 12 settimane · {{ leads12() }} totali</span></div>
            <cf-bar-chart label="Lead per settimana" [labels]="weekLabels()" [series]="leadSeries()" />
          </section>
          <section class="card">
            <div class="card-head"><h2>Chiuso per mese</h2><span class="muted small">valore dei lead chiusi</span></div>
            <cf-bar-chart label="Valore chiuso per mese" [labels]="monthLabels()" [series]="revenueSeries()" [format]="euroShort" [showLabels]="true" />
          </section>
          <section class="card">
            <div class="card-head"><h2>Funnel lead</h2><span class="muted small">tutte le fonti</span></div>
            <ul class="funnel">
              @for (s of leadStatuses; track s) {
                <li>
                  <a [routerLink]="['/admin/lead']" [queryParams]="{ stato: s }">
                    <span class="f-label">{{ leadLabels[s] }}</span>
                    <span class="f-track"><span class="f-bar" [class.lost]="s === 'perso'" [style.width.%]="funnelPct(d.leadsByStatus[s])"></span></span>
                    <span class="f-val mono">{{ d.leadsByStatus[s] }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>
          <section class="card">
            <div class="card-head"><h2>Task completati</h2><span class="muted small">ultime 8 settimane · {{ tasks8() }} totali</span></div>
            <cf-bar-chart label="Task completati per settimana" [labels]="taskLabels()" [series]="taskSeries()" [showLabels]="true" [height]="180" />
          </section>
        </div>

        <section class="card">
          <h2>Pipeline progetti</h2>
          <div class="pipeline">
            @for (s of statuses; track s) {
              @let st = projectStatus(s);
              <a class="pipe" [routerLink]="['/admin/progetti']" [queryParams]="{ stato: s }">
                <cf-badge [label]="st.label" [tone]="st.tone" /><strong>{{ d.projectsByStatus[s] }}</strong>
              </a>
            }
          </div>
        </section>

        <div class="grid-2">
          <section class="card">
            <h2>Scadenze nei prossimi 30 giorni</h2>
            @for (p of d.upcomingDeadlines; track p.projectId) {
              <a class="line" [routerLink]="['/admin/progetti', p.projectId]"><span class="grow truncate">{{ p.projectName }}</span><span class="mono small">{{ p.deadline | date: 'd MMM' }}</span></a>
            } @empty { <p class="muted">Nessuna consegna imminente.</p> }
          </section>
          <section class="card">
            <h2>Task in ritardo</h2>
            @for (t of d.overdueTasks; track t.taskId) {
              <a class="line" [routerLink]="['/admin/progetti', t.projectId, 'checklist']"><span class="grow truncate">{{ t.title }} <span class="muted">· {{ t.projectName }}</span></span><span class="mono small danger">{{ t.dueDate | date: 'd MMM' }}</span></a>
            } @empty { <p class="muted">Tutto in orario.</p> }
          </section>
          <section class="card">
            <h2>Documenti in revisione</h2>
            @for (doc of d.documentsInReview; track doc.documentId) {
              @let ds = documentStatus(doc.status);
              <a class="line" [routerLink]="['/admin/progetti', doc.projectId, 'documenti', doc.documentId]"><span class="grow truncate">{{ doc.title }} <span class="muted">· {{ doc.projectName }}</span></span><cf-badge [label]="ds.label" [tone]="ds.tone" /></a>
            } @empty { <p class="muted">Nessun documento in attesa del cliente.</p> }
          </section>
        </div>

      } @else if (!error()) {
        <div class="kpis">@for (i of [1, 2, 3, 4, 5]; track i) { <div class="card skeleton" style="height: 112px"></div> }</div>
        <div class="grid-2 charts">@for (i of [1, 2]; track i) { <div class="card skeleton" style="height: 280px"></div> }</div>
      }
    </div>
  `,
  styles: `
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .kpi { display: grid; gap: 4px; color: inherit !important; text-decoration: none !important; transition: border-color .15s; }
    a.kpi:hover { border-color: var(--cf-color-violet-light); }
    .kpi strong { font-size: 1.75rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .kpi small { font-size: .78rem; }
    .danger { color: var(--cf-color-danger); }
    .charts { align-items: stretch; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .card-head h2 { margin: 0; }
    .funnel { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 10px; }
    .funnel a { display: grid; grid-template-columns: 96px 1fr 40px; align-items: center; gap: 12px; color: inherit !important; text-decoration: none !important; }
    .funnel a:hover .f-label { color: var(--cf-color-violet-light); }
    .f-label { font-size: .85rem; color: var(--cf-color-text-muted); }
    .f-track { height: 14px; border-radius: 4px; background: var(--cf-surface-2, rgba(255,255,255,.04)); overflow: hidden; }
    .f-bar { display: block; height: 100%; min-width: 2px; border-radius: 0 4px 4px 0; background: ${C_SITO}; }
    .f-bar.lost { background: var(--cf-color-text-muted); opacity: .5; }
    .f-val { text-align: right; font-size: .9rem; }
    .pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
    .pipe { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; background: var(--cf-surface-2); color: inherit !important; text-decoration: none !important; }
    .pipe strong { font-size: 1.25rem; }
    .line { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--cf-color-border); color: inherit !important; text-decoration: none !important; }
    .line:last-child { border-bottom: 0; }
    a.line:hover .grow { color: var(--cf-color-violet-light); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  private readonly api = inject(Api);
  protected readonly auth = inject(AuthService);
  protected readonly statuses = PROJECT_STATUSES;
  protected readonly leadStatuses = LEAD_STATUSES;
  protected readonly leadLabels = LEAD_STATUS_LABELS;
  protected readonly projectStatus = projectStatus;
  protected readonly documentStatus = documentStatus;
  protected readonly euro = euro;
  protected readonly euroShort = (cents: number): string => {
    const v = cents / 100;
    return v >= 1000 ? `${(v / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k €` : `${Math.round(v)} €`;
  };
  protected readonly today = new Date();
  protected readonly data = signal<DashboardDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  protected readonly activeProjects = computed(() => {
    const d = this.data();
    return d ? Object.entries(d.projectsByStatus).filter(([s]) => s !== 'in_pausa').reduce((a, [, n]) => a + n, 0) : 0;
  });

  protected readonly weekLabels = computed(() => (this.data()?.leadsWeekly ?? []).map((w) => dayFmt.format(new Date(w.week))));
  protected readonly leadSeries = computed<ChartSeries[]>(() => {
    const w = this.data()?.leadsWeekly ?? [];
    return [
      { name: 'Sito', color: C_SITO, values: w.map((x) => x.sito) },
      { name: 'Prospezione', color: C_PROSPEZIONE, values: w.map((x) => x.prospezione) }
    ];
  });
  protected readonly leads12 = computed(() => (this.data()?.leadsWeekly ?? []).reduce((a, w) => a + w.sito + w.prospezione, 0));
  protected readonly leadsThisWeek = computed(() => { const w = this.data()?.leadsWeekly.at(-1); return w ? w.sito + w.prospezione : 0; });

  protected readonly monthLabels = computed(() => (this.data()?.revenueMonthly ?? []).map((m) => monthFmt.format(new Date(`${m.month}-01`))));
  protected readonly revenueSeries = computed<ChartSeries[]>(() => [
    { name: 'Chiuso', color: C_SITO, values: (this.data()?.revenueMonthly ?? []).map((m) => m.cents) }
  ]);
  protected readonly closedTotal = computed(() => (this.data()?.revenueMonthly ?? []).reduce((a, m) => a + m.cents, 0));
  protected readonly closedDeals = computed(() => (this.data()?.revenueMonthly ?? []).reduce((a, m) => a + m.deals, 0));

  protected readonly taskLabels = computed(() => (this.data()?.tasksWeekly ?? []).map((w) => dayFmt.format(new Date(w.week))));
  protected readonly taskSeries = computed<ChartSeries[]>(() => [
    { name: 'Completati', color: C_SITO, values: (this.data()?.tasksWeekly ?? []).map((w) => w.completed) }
  ]);
  protected readonly tasks8 = computed(() => (this.data()?.tasksWeekly ?? []).reduce((a, w) => a + w.completed, 0));

  /** Conversione = convertiti / (convertiti + persi): misura solo i lead già decisi. */
  protected readonly conversion = computed(() => {
    const s = this.data()?.leadsByStatus;
    if (!s) return 0;
    const decided = s.convertito + s.perso;
    return decided ? Math.round((s.convertito / decided) * 100) : 0;
  });
  private readonly funnelMax = computed(() => Math.max(1, ...Object.values(this.data()?.leadsByStatus ?? {})));
  protected funnelPct(n: number): number { return (n / this.funnelMax()) * 100; }

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    this.error.set(null);
    try { this.data.set(await this.api.get<DashboardDto>('/dashboard')); }
    catch (err) { this.error.set((err as Error).message); }
  }
}
