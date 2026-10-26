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

interface CredentialPreset {
  id: string;
  label: string;
  icon: string;
  defaultName: string;
  defaultUrl?: string;
  placeholderUrl?: string;
}

const PRESETS: CredentialPreset[] = [
  { id: 'domain', label: 'Dominio', icon: '🌐', defaultName: 'Dominio', placeholderUrl: 'https://aruba.it o registrar' },
  { id: 'hosting', label: 'Hosting', icon: '🖥️', defaultName: 'Hosting / Server', placeholderUrl: 'https://cpanel... o IP' },
  { id: 'database', label: 'Database', icon: '🗄️', defaultName: 'Database', placeholderUrl: 'https://...' },
  { id: 'subscription', label: 'Abbonamento', icon: '💳', defaultName: 'Abbonamento / Licenza', placeholderUrl: 'https://...' },
  { id: 'app_store', label: 'App Store', icon: '🍎', defaultName: 'Apple App Store', defaultUrl: 'https://appstoreconnect.apple.com' },
  { id: 'play_store', label: 'Play Store', icon: '🤖', defaultName: 'Google Play Store', defaultUrl: 'https://play.google.com/console' },
  { id: 'custom', label: 'Personalizzato', icon: '✨', defaultName: '', placeholderUrl: 'https://...' }
];

@Component({
  selector: 'cf-credentials-tab',
  imports: [DatePipe, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="stack">
      <!-- Toolbar senza riga descrittiva (rimossa su richiesta utente) -->
      <div class="header-actions">
        <button class="btn btn-primary" (click)="open()" [disabled]="store.archived()">+ Accesso</button>
      </div>

      <section class="card card-tight">
        <div class="table-wrap">
          <table class="table cred-table">
            <thead>
              <tr>
                <th>Servizio</th>
                <th>Email / Utente</th>
                <th>Password</th>
                <th>Aggiornato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td class="col-service">
                    <div class="service-title-wrap">
                      <span class="service-icon">{{ getServiceIcon(c.service) }}</span>
                      <div class="service-meta">
                        <strong class="service-name">{{ c.service }}</strong>
                        @if (c.url) {
                          <a class="service-link" [href]="c.url" target="_blank" rel="noopener noreferrer">{{ c.url }} ↗</a>
                        }
                        @if (c.notes) {
                          <span class="service-notes">{{ c.notes }}</span>
                        }
                      </div>
                    </div>
                  </td>

                  <td class="mono col-user">{{ c.username ?? '—' }}</td>

                  <td class="mono col-secret">
                    @if (revealed()[c.id]; as secret) {
                      <div class="revealed-wrap">
                        <span class="secret font-mono">{{ secret }}</span>
                        <button class="btn btn-ghost btn-sm btn-copy" (click)="copy(secret)" title="Copia password">Copia</button>
                      </div>
                    } @else if (c.hasSecret) {
                      <div class="hidden-pwd-wrap">
                        <span class="dots">••••••••</span>
                        @if (auth.isAdmin()) {
                          <button class="btn btn-ghost btn-sm" (click)="reveal(c)">Mostra</button>
                        }
                      </div>
                    } @else {
                      <span class="muted">—</span>
                    }
                  </td>

                  <td class="muted small nowrap">{{ c.updatedAt | date: 'd MMM y' }}</td>

                  <td class="actions">
                    <button class="btn btn-ghost btn-sm" (click)="open(c)" [disabled]="store.archived()">Modifica</button>
                    <button class="btn btn-ghost btn-sm icon-btn" (click)="remove(c)" [disabled]="store.archived()" aria-label="Elimina">✕</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="empty">
                      <strong>Nessun accesso salvato</strong>
                      <span>Dominio, hosting, database, store, abbonamenti o credenziali personalizzate.</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- MODAL DI CREAZIONE / MODIFICA ACCESSO -->
    <cf-modal [(open)]="formOpen" [title]="editing() ? 'Modifica accesso' : 'Nuovo accesso'">
      <div class="modal-body-stack">
        <!-- Scelta Rapida Categoria (Dominio, Hosting, Database, Abbonamento, App Store, Play Store, Custom) -->
        <div class="presets-section">
          <span class="preset-label">Scegli tipologia di accesso</span>
          <div class="preset-chips">
            @for (p of presets; track p.id) {
              <button
                type="button"
                class="preset-chip"
                [class.active]="selectedPreset() === p.id"
                (click)="selectPreset(p)">
                <span class="chip-icon">{{ p.icon }}</span>
                <span class="chip-title">{{ p.label }}</span>
              </button>
            }
          </div>
        </div>

        <form id="cred-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()" autocomplete="off">
          <label class="field full">
            <span>Nome Servizio *</span>
            <input class="input" formControlName="service" placeholder="Es. Aruba, AWS, PostgreSQL, Apple Developer..." />
          </label>

          <label class="field full">
            <span>Link / URL Accesso</span>
            <input class="input font-mono" formControlName="url" placeholder="https://" />
          </label>

          <label class="field">
            <span>Email / Utente</span>
            <input class="input font-mono" formControlName="username" placeholder="mario@email.com o username" autocomplete="off" />
          </label>

          <label class="field">
            <div class="field-label-row">
              <span>Password</span>
              <button type="button" class="btn-quick-gen" (click)="generatePassword()">🎲 Genera sicura</button>
            </div>
            <div class="pwd-input-wrap">
              <input
                class="input font-mono pwd-input"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="secret"
                autocomplete="new-password"
                [placeholder]="editing()?.hasSecret ? 'Lascia vuoto per non cambiarla' : 'Password'" />
              <button
                type="button"
                class="btn-eye"
                (click)="showPassword.set(!showPassword())"
                [title]="showPassword() ? 'Nascondi' : 'Mostra'">
                {{ showPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
          </label>

          <label class="field full">
            <span>Note aggiuntive</span>
            <textarea class="textarea" rows="2" formControlName="notes" placeholder="PIN, backup 2FA, note o scadenze..."></textarea>
          </label>
        </form>
      </div>

      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="formOpen.set(false)">Annulla</button>
        <button class="btn btn-primary" type="submit" form="cred-form">Salva accesso</button>
      </div>
    </cf-modal>
  `,
  styles: `
    .header-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 4px;
    }

    .service-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .service-icon {
      font-size: 1.15rem;
      line-height: 1.2;
      flex-shrink: 0;
    }

    .service-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .service-name {
      font-size: 0.88rem;
      color: #F8FAFC;
    }

    .service-link {
      font-size: 0.74rem;
      color: #A78BFA;
      text-decoration: none;
      word-break: break-all;
    }

    .service-link:hover {
      text-decoration: underline;
    }

    .service-notes {
      font-size: 0.72rem;
      color: rgba(248, 250, 252, 0.5);
    }

    .col-user {
      color: #E2E8F0;
      font-size: 0.82rem;
    }

    .revealed-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .secret {
      background: rgba(124, 58, 237, 0.25);
      border: 1px solid rgba(167, 139, 250, 0.4);
      color: #DDD6FE;
      padding: 2px 7px;
      border-radius: 4px;
      user-select: all;
      font-size: 0.82rem;
    }

    .hidden-pwd-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dots {
      letter-spacing: 0.15em;
      color: rgba(248, 250, 252, 0.4);
      font-size: 0.9rem;
    }

    /* Modal Presets & Form */
    .modal-body-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .presets-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .preset-label {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(248, 250, 252, 0.5);
    }

    .preset-chips {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 6px;
    }

    .preset-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: rgba(248, 250, 252, 0.75);
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 500;
      transition: all 0.12s ease;
      text-align: left;
    }

    .preset-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: #FFF;
    }

    .preset-chip.active {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(167, 139, 250, 0.6);
      color: #DDD6FE;
      font-weight: 600;
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
    }

    .chip-icon {
      font-size: 1rem;
      line-height: 1;
    }

    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-quick-gen {
      background: none;
      border: none;
      color: #A78BFA;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .btn-quick-gen:hover {
      text-decoration: underline;
      color: #C4B5FD;
    }

    .pwd-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .pwd-input {
      padding-right: 36px;
    }

    .btn-eye {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 4px;
      opacity: 0.7;
    }

    .btn-eye:hover {
      opacity: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CredentialsTab {
  protected readonly store = inject(ProjectStore);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly presets = PRESETS;
  protected readonly selectedPreset = signal<string>('domain');
  protected readonly showPassword = signal(false);

  protected readonly items = signal<CredentialDto[]>([]);
  protected readonly revealed = signal<Record<string, string>>({});
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<CredentialDto | null>(null);
  private readonly timers: ReturnType<typeof setTimeout>[] = [];
  protected readonly form = inject(FormBuilder).nonNullable.group({
    service: ['', Validators.required],
    url: [''],
    username: [''],
    secret: [''],
    notes: ['']
  });

  private get base(): string { return `/projects/${this.store.id()}/credentials`; }

  constructor() {
    effect(() => { if (this.store.id()) void this.load(); });
    inject(DestroyRef).onDestroy(() => { this.timers.forEach(clearTimeout); this.revealed.set({}); });
  }

  private async load(): Promise<void> {
    try { this.items.set(await this.api.get<CredentialDto[]>(this.base)); } catch (err) { this.toast.error(err); }
  }

  protected selectPreset(p: CredentialPreset): void {
    this.selectedPreset.set(p.id);
    if (p.id === 'custom') {
      this.form.patchValue({ service: '' });
      return;
    }
    const currService = this.form.controls.service.value;
    const isDefaultOrEmpty = !currService || PRESETS.some((x) => x.defaultName === currService);
    if (isDefaultOrEmpty && p.defaultName) {
      this.form.patchValue({ service: p.defaultName });
    }
    if (p.defaultUrl && !this.form.controls.url.value) {
      this.form.patchValue({ url: p.defaultUrl });
    }
  }

  protected open(c?: CredentialDto): void {
    this.editing.set(c ?? null);
    this.showPassword.set(false);
    if (c) {
      this.form.reset({
        service: c.service ?? '',
        url: c.url ?? '',
        username: c.username ?? '',
        secret: '',
        notes: c.notes ?? ''
      });
      // Riconosci il preset esistente o imposta custom
      const matched = PRESETS.find((p) => p.defaultName && c.service.toLowerCase().includes(p.defaultName.toLowerCase()));
      this.selectedPreset.set(matched ? matched.id : 'custom');
    } else {
      const defaultPreset = PRESETS[0];
      this.selectedPreset.set(defaultPreset.id);
      this.form.reset({
        service: defaultPreset.defaultName,
        url: '',
        username: '',
        secret: '',
        notes: ''
      });
    }
    this.formOpen.set(true);
  }

  protected generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) {
      pwd += chars[array[i] % chars.length];
    }
    this.form.patchValue({ secret: pwd });
    this.showPassword.set(true);
    this.toast.success('Password sicura generata');
  }

  protected getServiceIcon(service: string): string {
    const s = service.toLowerCase();
    if (s.includes('dominio') || s.includes('dns') || s.includes('registrar') || s.includes('namecheap')) return '🌐';
    if (s.includes('host') || s.includes('server') || s.includes('cpanel') || s.includes('vps') || s.includes('cloud')) return '🖥️';
    if (s.includes('database') || s.includes('sql') || s.includes('postgres') || s.includes('neon') || s.includes('mongo')) return '🗄️';
    if (s.includes('abbonament') || s.includes('licenz') || s.includes('stripe') || s.includes('canone') || s.includes('saas')) return '💳';
    if (s.includes('apple') || s.includes('app store') || s.includes('ios')) return '🍎';
    if (s.includes('google') || s.includes('play store') || s.includes('android')) return '🤖';
    return '🔑';
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const editing = this.editing();

    // Auto-aggiungi https:// se omesso dall'utente
    let url = v.url.trim() || null;
    if (url && !/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const body: Record<string, string | null> = {
      service: v.service.trim(),
      url,
      username: v.username.trim() || null,
      notes: v.notes.trim() || null
    };

    if (!editing || v.secret) {
      body['secret'] = v.secret || null;
    }

    try {
      const saved = editing
        ? await this.api.patch<CredentialDto>(`${this.base}/${editing.id}`, body)
        : await this.api.post<CredentialDto>(this.base, body);
      this.items.update((l) => (editing ? l.map((x) => (x.id === saved.id ? saved : x)) : [...l, saved]));
      this.formOpen.set(false);
      this.form.reset();
      this.toast.success('Accesso salvato con successo');
    } catch (err) {
      this.toast.error(err);
    }
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
