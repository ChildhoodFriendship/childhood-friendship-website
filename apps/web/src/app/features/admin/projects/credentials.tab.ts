import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { CredentialDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { ModalComponent } from '../../../shared/modal.component';
import { ProjectStore } from './project.store';

const REVEAL_MS = 30_000;

@Component({
  selector: 'cf-credentials-tab',
  imports: [DatePipe, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="stack">
      <div class="row-between">
        <p class="muted small">Le password sono cifrate (AES-256-GCM) e non sono mai visibili al cliente. Ogni visualizzazione viene registrata.</p>
        <button class="btn btn-primary" (click)="open()" [disabled]="store.archived()">+ Accesso</button>
      </div>
      <section class="card card-tight"><div class="table-wrap"><table class="table">
        <thead><tr><th>Servizio</th><th>Utente</th><th>Password</th><th>Aggiornato</th><th></th></tr></thead>
        <tbody>
          @for (c of items(); track c.id) {
            <tr>
              <td><strong>{{ c.service }}</strong>@if (c.url) { <br /><a class="small" [href]="c.url" target="_blank" rel="noopener noreferrer">{{ c.url }}</a> }
                @if (c.notes) { <br /><span class="muted small">{{ c.notes }}</span> }</td>
              <td class="mono">{{ c.username ?? '—' }}</td>
              <td class="mono">
                @if (revealed()[c.id]; as secret) {
                  <span class="secret">{{ secret }}</span>
                  <button class="btn btn-ghost btn-sm" (click)="copy(secret)">Copia</button>
                } @else if (c.hasSecret) {
                  ••••••••
                  @if (auth.isAdmin()) { <button class="btn btn-ghost btn-sm" (click)="reveal(c)">Mostra</button> }
                } @else { — }
              </td>
              <td class="muted small nowrap">{{ c.updatedAt | date: 'd MMM y' }}</td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" (click)="open(c)" [disabled]="store.archived()">Modifica</button>
                <button class="btn btn-ghost btn-sm icon-btn" (click)="remove(c)" [disabled]="store.archived()" aria-label="Elimina">✕</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="5"><div class="empty"><strong>Nessun accesso salvato</strong>Hosting, CMS, social, registrar…</div></td></tr> }
        </tbody>
      </table></div></section>
    </div>

    <cf-modal [(open)]="formOpen" [title]="editing() ? 'Modifica accesso' : 'Nuovo accesso'">
      <form id="cred-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()" autocomplete="off">
        <label class="field full"><span>Servizio *</span><input class="input" formControlName="service" placeholder="Es. WordPress, Aruba, Instagram" /></label>
        <label class="field full"><span>URL</span><input class="input" formControlName="url" placeholder="https://" /></label>
        <label class="field"><span>Utente</span><input class="input" formControlName="username" autocomplete="off" /></label>
        <label class="field"><span>Password</span><input class="input" type="password" formControlName="secret" autocomplete="new-password"
          [placeholder]="editing()?.hasSecret ? 'Lascia vuoto per non cambiarla' : ''" /></label>
        <label class="field full"><span>Note</span><textarea class="textarea" rows="2" formControlName="notes"></textarea></label>
      </form>
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="formOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="cred-form">Salva</button>
      </div>
    </cf-modal>
  `,
  styles: `.secret { background: var(--cf-violet-soft); padding: 2px 6px; border-radius: 4px; user-select: all; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredentialsTab {
  protected readonly store = inject(ProjectStore);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly items = signal<CredentialDto[]>([]);
  protected readonly revealed = signal<Record<string, string>>({});
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CredentialDto | null>(null);
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  protected readonly form = inject(FormBuilder).nonNullable.group({
    service: ['', Validators.required], url: [''], username: [''], secret: [''], notes: ['']
  });

  private get base(): string { return `/projects/${this.store.id()}/credentials`; }

  constructor() {
    effect(() => { if (this.store.id()) void this.load(); });
    inject(DestroyRef).onDestroy(() => { this.timers.forEach(clearTimeout); this.revealed.set({}); });
  }

  private async load(): Promise<void> {
    try { this.items.set(await this.api.get<CredentialDto[]>(this.base)); } catch (err) { this.toast.error(err); }
  }

  protected open(c?: CredentialDto): void {
    this.editing.set(c ?? null);
    this.form.reset({ service: c?.service ?? '', url: c?.url ?? '', username: c?.username ?? '', secret: '', notes: c?.notes ?? '' });
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const editing = this.editing();
    const body: Record<string, string | null> = { service: v.service, url: v.url || null, username: v.username || null, notes: v.notes || null };
    if (!editing || v.secret) body['secret'] = v.secret || null;
    try {
      const saved = editing ? await this.api.patch<CredentialDto>(`${this.base}/${editing.id}`, body) : await this.api.post<CredentialDto>(this.base, body);
      this.items.update((l) => (editing ? l.map((x) => (x.id === saved.id ? saved : x)) : [...l, saved]));
      this.formOpen.set(false);
      this.form.reset();
    } catch (err) { this.toast.error(err); }
  }

  protected async reveal(c: CredentialDto): Promise<void> {
    try {
      const { secret } = await this.api.post<{ secret: string | null }>(`${this.base}/${c.id}/reveal`);
      if (!secret) return;
      this.revealed.update((r) => ({ ...r, [c.id]: secret }));
      this.timers.push(setTimeout(() => this.revealed.update((r) => { const { [c.id]: _, ...rest } = r; return rest; }), REVEAL_MS));
    } catch (err) { this.toast.error(err); }
  }

  protected async copy(secret: string): Promise<void> {
    try { await navigator.clipboard.writeText(secret); this.toast.success('Copiata negli appunti'); }
    catch { this.toast.error('Copia non consentita dal browser'); }
  }

  protected async remove(c: CredentialDto): Promise<void> {
    if (!(await this.confirm.ask(`Eliminare l'accesso "${c.service}"?`, { danger: true, confirmLabel: 'Elimina' }))) return;
    try { await this.api.delete(`${this.base}/${c.id}`); this.items.update((l) => l.filter((x) => x.id !== c.id)); }
    catch (err) { this.toast.error(err); }
  }
}
