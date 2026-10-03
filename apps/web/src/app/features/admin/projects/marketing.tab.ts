import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CAMPAIGN_STATUSES, MARKETING_CONTENT_STATUSES, MARKETING_CONTENT_TYPES, PLATFORM_KINDS, type CampaignStatus, type MarketingContentStatus, type MarketingContentType, type PlatformKind } from '@cf/shared/catalog';
import type { AiUsageDto, AnalysisDto, CampaignDto, ContentDto, PlatformDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';
import { BadgeComponent } from '../../../shared/badge.component';
import { ConfirmService } from '../../../shared/confirm.service';
import { campaignStatus, euro } from '../../../shared/labels';
import { ModalComponent } from '../../../shared/modal.component';
import { ProjectStore } from './project.store';

type Section = 'calendario' | 'campagne' | 'piattaforme' | 'analisi';
interface Summary { budgetCents: number; allocatedCents: number; spentCents: number; activeCampaigns: number; }

const ANALYSIS_LABELS: Record<string, string> = {
  strengths: 'Punti di forza', weaknesses: 'Punti deboli', opportunities: 'Opportunità', threats: 'Minacce',
  political: 'Politici', economic: 'Economici', social: 'Sociali', technological: 'Tecnologici', environmental: 'Ambientali', legal: 'Legali',
  suggerimenti: 'Suggerimenti'
};

@Component({
  selector: 'cf-marketing-tab',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, BadgeComponent, ModalComponent],
  template: `
    <div class="stack">
      @if (summary(); as s) {
        <section class="grid">
          <div class="card stat"><span class="muted">Budget</span><strong>{{ euro(s.budgetCents) }}</strong></div>
          <div class="card stat"><span class="muted">Allocato in campagne</span><strong>{{ euro(s.allocatedCents) }}</strong>
            @if (s.budgetCents && s.allocatedCents > s.budgetCents) { <span class="small danger">Oltre il budget</span> }</div>
          <div class="card stat"><span class="muted">Speso</span><strong>{{ euro(s.spentCents) }}</strong>
            <div class="progress"><span [style.width.%]="spentPct()"></span></div></div>
          <div class="card stat"><span class="muted">Campagne attive</span><strong>{{ s.activeCampaigns }}</strong></div>
        </section>
      }

      <nav class="tabs" aria-label="Sezioni marketing">
        @for (t of sections; track t.id) { <button type="button" [class.active]="section() === t.id" (click)="section.set(t.id)">{{ t.label }}</button> }
      </nav>

      @switch (section()) {
        @case ('calendario') {
          <div class="row-between">
            <div class="row">
              <input class="input" type="month" [(ngModel)]="month" (ngModelChange)="loadContents()" aria-label="Mese" />
            </div>
            <button class="btn btn-primary" (click)="openContent()" [disabled]="ro()">+ Contenuto</button>
          </div>
          <section class="card card-tight"><div class="table-wrap"><table class="table">
            <thead><tr><th>Data</th><th>Contenuto</th><th>Tipo</th><th>Piattaforma</th><th>Stato</th><th></th></tr></thead>
            <tbody>
              @for (c of contents(); track c.id) {
                <tr>
                  <td class="nowrap mono small">{{ c.scheduledFor | date: 'EEE d MMM' }}</td>
                  <td><strong>{{ c.title }}</strong>@if (c.aiGenerated) { <span class="muted small"> · AI</span> }<br /><span class="muted small truncate" style="display: block; max-width: 420px">{{ c.body }}</span></td>
                  <td>{{ c.contentType }}</td>
                  <td>{{ platformName(c.platformId) }}</td>
                  <td>
                    <select class="select sel-sm" [ngModel]="c.status" (ngModelChange)="patchContent(c, { status: $event })" [disabled]="ro()" aria-label="Stato">
                      @for (s of contentStatuses; track s) { <option [value]="s">{{ s }}</option> }
                    </select>
                  </td>
                  <td class="actions">
                    <button class="btn btn-ghost btn-sm" (click)="openContent(c)">Modifica</button>
                    <button class="btn btn-ghost btn-sm icon-btn" (click)="removeContent(c)" [disabled]="ro()" aria-label="Elimina">✕</button>
                  </td>
                </tr>
              } @empty { <tr><td colspan="6"><div class="empty"><strong>Nessun contenuto nel mese</strong>Pianifica post, reel e articoli.</div></td></tr> }
            </tbody>
          </table></div></section>
        }
        @case ('campagne') {
          <div class="row-between"><span></span><button class="btn btn-primary" (click)="openCampaign()" [disabled]="ro()">+ Campagna</button></div>
          <div class="grid">
            @for (c of campaigns(); track c.id) {
              @let st = campaignStatus(c.status);
              <section class="card stack-sm">
                <div class="row-between"><h3>{{ c.name }}</h3><cf-badge [label]="st.label" [tone]="st.tone" /></div>
                <p class="muted small">{{ platformName(c.platformId) }} · {{ c.startDate ? (c.startDate | date: 'd MMM') : '?' }} → {{ c.endDate ? (c.endDate | date: 'd MMM y') : '?' }}</p>
                <p>{{ c.objective }}</p>
                <div class="row-between small"><span>Speso {{ euro(c.spentCents) }} / {{ euro(c.budgetCents) }}</span><span class="mono">{{ ctr(c) }}</span></div>
                <div class="progress"><span [style.width.%]="c.budgetCents ? (c.spentCents / c.budgetCents) * 100 : 0"></span></div>
                <div class="row">
                  <button class="btn btn-sm" (click)="openCampaign(c)">Modifica</button>
                  @if (aiEnabled()) { <button class="btn btn-sm" (click)="postIdea(c)" [disabled]="aiBusy() || ro()">✦ Idea post organico</button> }
                  <button class="btn btn-ghost btn-sm btn-danger" (click)="removeCampaign(c)" [disabled]="ro()">Elimina</button>
                </div>
              </section>
            } @empty { <div class="card empty"><strong>Nessuna campagna</strong>Crea la prima campagna ADS.</div> }
          </div>
        }
        @case ('piattaforme') {
          <section class="card card-tight"><div class="table-wrap"><table class="table">
            <thead><tr><th>Piattaforma</th><th>Profilo</th><th>Frequenza settimanale</th><th>Attiva</th><th></th></tr></thead>
            <tbody>
              @for (p of platforms(); track p.id) {
                <tr>
                  <td><strong>{{ p.name }}</strong>&nbsp;<span class="muted small">{{ p.kind }}</span></td>
                  <td>@if (p.profileUrl) { <a [href]="p.profileUrl" target="_blank" rel="noopener noreferrer">apri ↗</a> } @else { — }</td>
                  <td class="small">{{ p.frequency.posts ?? 0 }} post · {{ p.frequency.stories ?? 0 }} storie · {{ p.frequency.reels ?? 0 }} reel</td>
                  <td><input type="checkbox" [checked]="p.enabled" (change)="togglePlatform(p)" [disabled]="ro()" aria-label="Attiva" /></td>
                  <td class="actions"><button class="btn btn-ghost btn-sm icon-btn" (click)="removePlatform(p)" [disabled]="ro()" aria-label="Elimina">✕</button></td>
                </tr>
              } @empty { <tr><td colspan="5"><div class="empty">Nessuna piattaforma configurata.</div></td></tr> }
            </tbody>
          </table></div>
          <form class="row add-row" [formGroup]="platformForm" (ngSubmit)="addPlatform()">
            <select class="select" style="width: auto" formControlName="kind" aria-label="Tipo">@for (k of platformKinds; track k) { <option [value]="k">{{ k }}</option> }</select>
            <input class="input grow" formControlName="name" placeholder="Nome (es. Instagram @pizzeriaalfa)" aria-label="Nome" />
            <input class="input grow" formControlName="profileUrl" placeholder="https://…" aria-label="URL profilo" />
            <input class="input num" type="number" min="0" formControlName="posts" title="Post/settimana" aria-label="Post a settimana" />
            <input class="input num" type="number" min="0" formControlName="stories" title="Storie/settimana" aria-label="Storie a settimana" />
            <input class="input num" type="number" min="0" formControlName="reels" title="Reel/settimana" aria-label="Reel a settimana" />
            <button class="btn btn-primary" [disabled]="platformForm.invalid || ro()">Aggiungi</button>
          </form></section>
        }
        @case ('analisi') {
          @if (aiEnabled()) {
            <div class="row">
              <button class="btn" (click)="analyse('swot')" [disabled]="aiBusy() || ro()">✦ Genera SWOT</button>
              <button class="btn" (click)="analyse('pestel')" [disabled]="aiBusy() || ro()">✦ Genera PESTEL</button>
              <button class="btn" (click)="analyse('suggestions')" [disabled]="aiBusy() || ro()">✦ Suggerimenti sulla documentazione</button>
              @if (aiBusy()) { <span class="muted small">Analisi in corso…</span> }
            </div>
          } @else { <div class="alert">AI non configurata sul server: imposta GEMINI_API_KEY per abilitare le analisi.</div> }
          @for (a of analyses(); track a.id) {
            <section class="card stack">
              <div class="row-between"><h3>{{ a.kind === 'suggerimenti' ? 'Suggerimenti' : a.kind.toUpperCase() }}</h3>
                <div class="row"><span class="muted small">{{ a.createdAt | date: 'd MMM y, HH:mm' }}</span>
                <button class="btn btn-ghost btn-sm icon-btn" (click)="removeAnalysis(a)" aria-label="Elimina">✕</button></div></div>
              <div class="analysis">
                @for (entry of entries(a); track entry.key) {
                  <div><h4>{{ entry.label }}</h4><ul>@for (i of entry.items; track $index) { <li>{{ i }}</li> }</ul></div>
                }
              </div>
            </section>
          } @empty { <div class="card empty">Nessuna analisi salvata.</div> }
        }
      }
    </div>

    <cf-modal [(open)]="contentOpen" [title]="editingContent() ? 'Modifica contenuto' : 'Nuovo contenuto'">
      <form id="content-form" class="form-grid" [formGroup]="contentForm" (ngSubmit)="saveContent()">
        <label class="field full"><span>Titolo *</span><input class="input" formControlName="title" /></label>
        <label class="field"><span>Data *</span><input class="input" type="date" formControlName="scheduledFor" /></label>
        <label class="field"><span>Tipo</span><select class="select" formControlName="contentType">@for (t of contentTypes; track t) { <option [value]="t">{{ t }}</option> }</select></label>
        <label class="field"><span>Piattaforma</span><select class="select" formControlName="platformId"><option value="">—</option>@for (p of platforms(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }</select></label>
        <label class="field"><span>Campagna collegata</span><select class="select" formControlName="campaignId"><option value="">—</option>@for (c of campaigns(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select></label>
        <label class="field full"><span>Testo / descrizione</span><textarea class="textarea" rows="4" formControlName="body"></textarea></label>
        <label class="field full"><span>Pubblico</span><input class="input" formControlName="audience" placeholder="Es. famiglie 30-45 anni in zona" /></label>
      </form>
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="contentOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="content-form" [disabled]="ro()">Salva</button>
      </div>
    </cf-modal>

    <cf-modal [(open)]="campaignOpen" [title]="editingCampaign() ? 'Modifica campagna' : 'Nuova campagna'" [wide]="true">
      <form id="campaign-form" class="form-grid" [formGroup]="campaignForm" (ngSubmit)="saveCampaign()">
        <label class="field full"><span>Nome *</span><input class="input" formControlName="name" /></label>
        <label class="field full"><span>Obiettivo *</span><textarea class="textarea" rows="2" formControlName="objective"></textarea></label>
        <label class="field"><span>Piattaforma</span><select class="select" formControlName="platformId"><option value="">—</option>@for (p of platforms(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }</select></label>
        <label class="field"><span>Stato</span><select class="select" formControlName="status">@for (s of campaignStatuses; track s) { <option [value]="s">{{ campaignStatus(s).label }}</option> }</select></label>
        <label class="field"><span>Inizio</span><input class="input" type="date" formControlName="startDate" /></label>
        <label class="field"><span>Fine</span><input class="input" type="date" formControlName="endDate" /></label>
        <label class="field"><span>Budget (€)</span><input class="input" type="number" min="0" formControlName="budget" /></label>
        <label class="field"><span>Speso (€)</span><input class="input" type="number" min="0" formControlName="spent" /></label>
        <label class="field"><span>Impression</span><input class="input" type="number" min="0" formControlName="impressions" /></label>
        <label class="field"><span>Click</span><input class="input" type="number" min="0" formControlName="clicks" /></label>
        <label class="field"><span>Conversioni</span><input class="input" type="number" min="0" formControlName="conversions" /></label>
        <label class="field"><span>KPI</span><input class="input" formControlName="kpi" placeholder="Es. CPA < 8 €" /></label>
        <label class="field full"><span>Pubblico</span><input class="input" formControlName="audience" /></label>
        <label class="field full"><span>Risultati / note</span><textarea class="textarea" rows="3" formControlName="results"></textarea></label>
      </form>
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="campaignOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="campaign-form" [disabled]="ro()">Salva</button>
      </div>
    </cf-modal>
  `,
  styles: `
    .danger { color: var(--cf-color-danger); }
    .sel-sm { width: auto; min-height: 30px; padding: 4px 8px; font-size: 13px; }
    .add-row { padding: 12px 16px; border-top: 1px solid var(--cf-color-border); }
    .num { width: 72px; }
    .analysis { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .analysis h4 { margin: 0 0 6px; font-size: 13px; color: var(--cf-color-violet-light); }
    .analysis ul { margin: 0; padding-left: 1.2em; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketingTab {
  private readonly store = inject(ProjectStore);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly ro = this.store.archived;
  protected readonly euro = euro;
  protected readonly campaignStatus = campaignStatus;
  protected readonly contentTypes = MARKETING_CONTENT_TYPES;
  protected readonly contentStatuses = MARKETING_CONTENT_STATUSES;
  protected readonly campaignStatuses = CAMPAIGN_STATUSES;
  protected readonly platformKinds = PLATFORM_KINDS;
  protected readonly sections: { id: Section; label: string }[] = [
    { id: 'calendario', label: 'Calendario editoriale' }, { id: 'campagne', label: 'Campagne ADS' },
    { id: 'piattaforme', label: 'Piattaforme' }, { id: 'analisi', label: 'Analisi' }
  ];
  protected readonly section = signal<Section>('calendario');
  protected readonly summary = signal<Summary | null>(null);
  protected readonly platforms = signal<PlatformDto[]>([]);
  protected readonly contents = signal<ContentDto[]>([]);
  protected readonly campaigns = signal<CampaignDto[]>([]);
  protected readonly analyses = signal<AnalysisDto[]>([]);
  protected readonly aiEnabled = signal(false);
  protected readonly aiBusy = signal(false);
  protected readonly contentOpen = signal(false);
  protected readonly campaignOpen = signal(false);
  protected readonly editingContent = signal<ContentDto | null>(null);
  protected readonly editingCampaign = signal<CampaignDto | null>(null);
  protected month = new Date().toISOString().slice(0, 7);
  protected readonly spentPct = computed(() => { const s = this.summary(); return s?.budgetCents ? Math.min(100, (s.spentCents / s.budgetCents) * 100) : 0; });

  protected readonly platformForm = this.fb.group({ kind: ['instagram' as PlatformKind], name: ['', Validators.required], profileUrl: [''], posts: [3], stories: [5], reels: [1] });
  protected readonly contentForm = this.fb.group({
    title: ['', Validators.required], scheduledFor: ['', Validators.required], contentType: ['post' as MarketingContentType],
    platformId: [''], campaignId: [''], body: [''], audience: [''], status: ['pianificato' as MarketingContentStatus]
  });
  protected readonly campaignForm = this.fb.group({
    name: ['', Validators.required], objective: ['', Validators.required], platformId: [''], status: ['pianificata' as CampaignStatus],
    startDate: [''], endDate: [''], budget: [0], spent: [0], impressions: [0], clicks: [0], conversions: [0], kpi: [''], audience: [''], results: ['']
  });

  private get base(): string { return `/projects/${this.store.id()}/marketing`; }

  constructor() {
    effect(() => { if (this.store.id()) void this.loadAll(); });
  }

  private async loadAll(): Promise<void> {
    try {
      const [summary, platforms, campaigns, analyses, ai] = await Promise.all([
        this.api.get<Summary>(`${this.base}/summary`),
        this.api.get<PlatformDto[]>(`${this.base}/platforms`),
        this.api.get<CampaignDto[]>(`${this.base}/campaigns`),
        this.api.get<AnalysisDto[]>(`${this.base}/analyses`),
        this.api.get<AiUsageDto>('/ai/usage')
      ]);
      this.summary.set(summary); this.platforms.set(platforms); this.campaigns.set(campaigns); this.analyses.set(analyses); this.aiEnabled.set(ai.enabled);
      await this.loadContents();
    } catch (err) { this.toast.error(err); }
  }

  protected async loadContents(): Promise<void> {
    const [y, m] = this.month.split('-').map(Number) as [number, number];
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    try { this.contents.set(await this.api.get<ContentDto[]>(`${this.base}/contents`, { from: `${this.month}-01`, to: `${this.month}-${String(last).padStart(2, '0')}` })); }
    catch (err) { this.toast.error(err); }
  }

  private async refreshSummary(): Promise<void> { this.summary.set(await this.api.get<Summary>(`${this.base}/summary`)); }

  protected platformName(id: string | null): string { return this.platforms().find((p) => p.id === id)?.name ?? '—'; }
  protected ctr(c: CampaignDto): string {
    const { impressions = 0, clicks = 0, conversions = 0 } = c.metrics;
    return impressions ? `CTR ${((clicks / impressions) * 100).toFixed(1)}% · ${conversions} conv.` : '';
  }
  protected entries(a: AnalysisDto) { return Object.entries(a.data).map(([key, items]) => ({ key, label: ANALYSIS_LABELS[key] ?? key, items })); }

  /* Piattaforme */
  protected async addPlatform(): Promise<void> {
    const v = this.platformForm.getRawValue();
    try {
      const p = await this.api.post<PlatformDto>(`${this.base}/platforms`, { kind: v.kind, name: v.name, profileUrl: v.profileUrl || null, frequency: { posts: +v.posts, stories: +v.stories, reels: +v.reels } });
      this.platforms.update((l) => [...l, p]);
      this.platformForm.reset();
    } catch (err) { this.toast.error(err); }
  }
  protected async togglePlatform(p: PlatformDto): Promise<void> {
    try { const u = await this.api.patch<PlatformDto>(`${this.base}/platforms/${p.id}`, { enabled: !p.enabled }); this.platforms.update((l) => l.map((x) => (x.id === u.id ? u : x))); }
    catch (err) { this.toast.error(err); }
  }
  protected async removePlatform(p: PlatformDto): Promise<void> {
    if (!(await this.confirm.ask(`Rimuovere ${p.name}? I contenuti collegati resteranno senza piattaforma.`, { danger: true, confirmLabel: 'Rimuovi' }))) return;
    try { await this.api.delete(`${this.base}/platforms/${p.id}`); this.platforms.update((l) => l.filter((x) => x.id !== p.id)); }
    catch (err) { this.toast.error(err); }
  }

  /* Contenuti */
  protected openContent(c?: ContentDto): void {
    this.editingContent.set(c ?? null);
    this.contentForm.reset({
      title: c?.title ?? '', scheduledFor: c?.scheduledFor ?? `${this.month}-${String(new Date().getDate()).padStart(2, '0')}`,
      contentType: c?.contentType ?? 'post', platformId: c?.platformId ?? '', campaignId: c?.campaignId ?? '', body: c?.body ?? '',
      audience: c?.target.audience ?? '', status: c?.status ?? 'pianificato'
    });
    this.contentOpen.set(true);
  }
  protected async saveContent(): Promise<void> {
    if (this.contentForm.invalid) { this.contentForm.markAllAsTouched(); return; }
    const v = this.contentForm.getRawValue();
    const body = { title: v.title, scheduledFor: v.scheduledFor, contentType: v.contentType, status: v.status, platformId: v.platformId || null, campaignId: v.campaignId || null, body: v.body || null, target: { audience: v.audience || null } };
    try {
      const editing = this.editingContent();
      if (editing) await this.api.patch(`${this.base}/contents/${editing.id}`, body);
      else await this.api.post(`${this.base}/contents`, body);
      this.contentOpen.set(false);
      this.month = v.scheduledFor.slice(0, 7);
      await this.loadContents();
    } catch (err) { this.toast.error(err); }
  }
  protected async patchContent(c: ContentDto, patch: Partial<ContentDto>): Promise<void> {
    try { const u = await this.api.patch<ContentDto>(`${this.base}/contents/${c.id}`, patch); this.contents.update((l) => l.map((x) => (x.id === u.id ? u : x))); }
    catch (err) { this.toast.error(err); }
  }
  protected async removeContent(c: ContentDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare "${c.title}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try { await this.api.delete(`${this.base}/contents/${c.id}`); this.contents.update((l) => l.filter((x) => x.id !== c.id)); }
    catch (err) { this.toast.error(err); }
  }

  /* Campagne */
  protected openCampaign(c?: CampaignDto): void {
    this.editingCampaign.set(c ?? null);
    this.campaignForm.reset({
      name: c?.name ?? '', objective: c?.objective ?? '', platformId: c?.platformId ?? '', status: c?.status ?? 'pianificata',
      startDate: c?.startDate ?? '', endDate: c?.endDate ?? '', budget: (c?.budgetCents ?? 0) / 100, spent: (c?.spentCents ?? 0) / 100,
      impressions: c?.metrics.impressions ?? 0, clicks: c?.metrics.clicks ?? 0, conversions: c?.metrics.conversions ?? 0,
      kpi: c?.kpi ?? '', audience: c?.target.audience ?? '', results: c?.results ?? ''
    });
    this.campaignOpen.set(true);
  }
  protected async saveCampaign(): Promise<void> {
    if (this.campaignForm.invalid) { this.campaignForm.markAllAsTouched(); this.toast.error('Nome e obiettivo sono obbligatori'); return; }
    const v = this.campaignForm.getRawValue();
    const body = {
      name: v.name, objective: v.objective, platformId: v.platformId || null, status: v.status, startDate: v.startDate || null, endDate: v.endDate || null,
      budgetCents: Math.round(+v.budget * 100), spentCents: Math.round(+v.spent * 100), kpi: v.kpi || null, results: v.results || null,
      target: { audience: v.audience || null }, metrics: { impressions: +v.impressions, clicks: +v.clicks, conversions: +v.conversions }
    };
    try {
      const editing = this.editingCampaign();
      const saved = editing ? await this.api.patch<CampaignDto>(`${this.base}/campaigns/${editing.id}`, body) : await this.api.post<CampaignDto>(`${this.base}/campaigns`, body);
      this.campaigns.update((l) => (editing ? l.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...l]));
      this.campaignOpen.set(false);
      await this.refreshSummary();
    } catch (err) { this.toast.error(err); }
  }
  protected async removeCampaign(c: CampaignDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare la campagna "${c.name}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try { await this.api.delete(`${this.base}/campaigns/${c.id}`); this.campaigns.update((l) => l.filter((x) => x.id !== c.id)); await this.refreshSummary(); }
    catch (err) { this.toast.error(err); }
  }
  protected async postIdea(c: CampaignDto): Promise<void> {
    this.aiBusy.set(true);
    try {
      const r = await this.api.post<{ text: string }>(`/projects/${this.store.id()}/ai/campaigns/${c.id}/post-idea`);
      this.openContent();
      this.contentForm.patchValue({ title: `Post per ${c.name}`, body: r.text, campaignId: c.id, platformId: c.platformId ?? '' });
      this.toast.info('Bozza post generata: rivedila e salva');
    } catch (err) { this.toast.error(err); } finally { this.aiBusy.set(false); }
  }

  /* Analisi */
  protected async analyse(kind: 'swot' | 'pestel' | 'suggestions'): Promise<void> {
    this.aiBusy.set(true);
    try { const a = await this.api.post<AnalysisDto>(`/projects/${this.store.id()}/ai/${kind}`); this.analyses.update((l) => [a, ...l]); }
    catch (err) { this.toast.error(err); } finally { this.aiBusy.set(false); }
  }
  protected async removeAnalysis(a: AnalysisDto): Promise<void> {
    try { await this.api.delete(`${this.base}/analyses/${a.id}`); this.analyses.update((l) => l.filter((x) => x.id !== a.id)); }
    catch (err) { this.toast.error(err); }
  }
}
