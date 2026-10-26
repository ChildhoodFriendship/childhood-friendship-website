import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ROLES, type Role } from '@cf/shared/catalog';
import type { ClientDto, InviteCreatedDto, InviteDto, UserDto } from '@cf/shared/types';
import { Api } from '../../../core/api';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmService } from '../../../shared/confirm.service';
import { ROLE_LABELS } from '../../../shared/labels';
import { ModalComponent } from '../../../shared/modal.component';

@Component({
  selector: 'cf-users-page',
  imports: [DatePipe, FormsModule, ModalComponent],
  template: `
    <div class="page">
      <header class="page-header" style="justify-content: flex-end; margin-bottom: 12px;">
        <button class="btn btn-primary" (click)="openInvite()">+ Invita</button>
      </header>

      <section class="card card-tight">
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Utente</th>
                <th>Ruolo</th>
                <th>Cliente</th>
                <th>Ultimo accesso</th>
                <th>Attivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr [class.inactive]="!u.isActive">
                  <td><strong>{{ u.name }}</strong><br /><span class="muted small">{{ u.email }}</span></td>
                  <td>
                    <select class="select sel-sm" [ngModel]="u.role" (ngModelChange)="update(u, { role: $event })" [disabled]="u.id === me()?.id || u.role === 'client'" aria-label="Ruolo">
                      @for (r of roles; track r) { <option [value]="r" [disabled]="r === 'client'">{{ roleLabels[r] }}</option> }
                    </select>
                  </td>
                  <td class="small">{{ clientName(u.clientId) }}</td>
                  <td class="muted small">{{ u.lastLoginAt ? (u.lastLoginAt | date: 'd MMM y, HH:mm') : 'mai' }}</td>
                  <td><input type="checkbox" [checked]="u.isActive" (change)="toggleActive(u)" [disabled]="u.id === me()?.id" aria-label="Attivo" /></td>
                  <td class="actions">
                    <button class="btn btn-ghost btn-sm" (click)="openPasswordModal(u)" title="Reimposta password utente o cliente">
                      🔑 Password
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="stack-sm">
        <h2>Inviti in sospeso</h2>
        <div class="card card-tight">
          <div class="table-wrap">
            <table class="table">
              <tbody>
                @for (i of pendingInvites(); track i.id) {
                  <tr>
                    <td>{{ i.email }}</td>
                    <td>{{ roleLabels[i.role] }}</td>
                    <td class="small">{{ clientName(i.clientId) }}</td>
                    <td class="small" [class.muted]="!expired(i)" [class.danger]="expired(i)">{{ expired(i) ? 'Scaduto' : 'Scade ' + (i.expiresAt | date: 'd MMM HH:mm') }}</td>
                    <td class="actions"><button class="btn btn-ghost btn-sm" (click)="revoke(i)">Revoca</button></td>
                  </tr>
                } @empty {
                  <tr><td><div class="empty">Nessun invito in sospeso.</div></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- MODALE GESTIONE PASSWORD UTENTE / CLIENTE -->
    <cf-modal [(open)]="pwModalOpen" [title]="'Gestione Password: ' + (selectedUser()?.name ?? '')">
      @if (selectedUser(); as u) {
        <div class="stack" style="gap: 20px;">
          <p class="muted small" style="margin: 0;">
            Account associato: <strong>{{ u.email }}</strong> (Ruolo: {{ roleLabels[u.role] }})
          </p>

          <!-- BLOCCO 1: GENERAZIONE LINK DI RESET -->
          <div style="background: rgba(124, 58, 237, 0.08); border: 1px solid rgba(124, 58, 237, 0.25); border-radius: 14px; padding: 18px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #c084fc;">Opzione 1: Invia link di reimpostazione</h4>
            <p class="small muted" style="margin: 0 0 14px 0;">
              Genera un link sicuro (valido 24h) e invialo via email al cliente, oppure copialo per mandarglielo su WhatsApp.
            </p>

            @if (generatedResetUrl()) {
              <div class="stack-sm" style="margin-bottom: 12px;">
                @if (resetEmailSent()) {
                  <p class="alert alert-success" style="font-size: 13px; margin: 0;">
                    ✓ Email con il link di reset inviata a <strong>{{ u.email }}</strong>.
                  </p>
                }
                <div class="row">
                  <input class="input grow mono" [value]="generatedResetUrl()" readonly aria-label="Link reset password" />
                  <button class="btn btn-primary" (click)="copy(generatedResetUrl()!)">Copia link</button>
                </div>
              </div>
            } @else {
              <button class="btn btn-ghost btn-sm" [disabled]="pwLoading()" (click)="requestUserResetLink(u)">
                {{ pwLoading() ? 'Generazione…' : '🔗 Genera link e invia email' }}
              </button>
            }
          </div>

          <!-- BLOCCO 2: IMPOSTAZIONE MANUALE IMMEDIATA -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #ffffff;">Opzione 2: Imposta subito una nuova password</h4>
            <p class="small muted" style="margin: 0 0 14px 0;">
              Per supporto telefonico immediato o clienti che hanno urgenza: imposta una password direttamente nel database.
            </p>

            <div class="row" style="margin-bottom: 12px;">
              <input class="input grow" type="text" [(ngModel)]="manualPassword" placeholder="Min. 8 caratteri…" aria-label="Nuova password" />
              <button class="btn btn-ghost" type="button" (click)="generateRandomPw()" title="Genera password sicura casuale">🎲 Casuale</button>
            </div>

            <button class="btn btn-primary btn-sm" [disabled]="manualPassword.length < 8 || pwLoading()" (click)="saveManualPassword(u)">
              {{ pwLoading() ? 'Salvataggio…' : 'Salva nuova password' }}
            </button>
          </div>
        </div>
      }
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="pwModalOpen.set(false)">Chiudi</button>
      </div>
    </cf-modal>

    <!-- MODALE INVITO -->
    <cf-modal [(open)]="inviteOpen" title="Nuovo invito">
      @if (link(); as l) {
        <div class="stack">
          @if (emailSent()) { <p class="alert alert-success">Email di invito inviata. Il link resta copiabile qui sotto, ma <strong>non verrà più mostrato</strong>.</p> }
          @else { <p>Invia questo link: valido 72 ore, monouso. <strong>Non verrà più mostrato.</strong></p> }
          <div class="row"><input class="input grow mono" [value]="l" readonly aria-label="Link invito" /><button class="btn" (click)="copy(l)">Copia</button></div>
        </div>
      } @else {
        <form id="inv" class="stack" (ngSubmit)="invite()">
          <label class="field"><span>Email</span><input class="input" type="email" name="email" [(ngModel)]="email" required /></label>
          <label class="field"><span>Ruolo</span>
            <select class="select" name="role" [(ngModel)]="role">@for (r of roles; track r) { <option [value]="r">{{ roleLabels[r] }}</option> }</select>
          </label>
          @if (role === 'client') {
            <label class="field"><span>Cliente</span>
              <select class="select" name="clientId" [(ngModel)]="clientId"><option value="">Seleziona…</option>@for (c of clients(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
            </label>
          }
        </form>
      }
      <div modal-footer class="modal-foot">
        <button class="btn btn-ghost" (click)="inviteOpen.set(false)">Chiudi</button>
        @if (!link()) { <button class="btn btn-primary" type="submit" form="inv">Crea invito</button> }
      </div>
    </cf-modal>
  `,
  styles: `.inactive { opacity: .5; } .danger { color: var(--cf-color-danger); }
    .sel-sm { width: auto; min-height: 30px; padding: 4px 8px; font-size: 13px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly me = inject(AuthService).user;
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly users = signal<UserDto[]>([]);
  protected readonly invites = signal<InviteDto[]>([]);
  protected readonly clients = signal<ClientDto[]>([]);
  protected readonly pendingInvites = computed(() => this.invites().filter((i) => !i.acceptedAt));
  protected readonly inviteOpen = signal(false);
  protected readonly link = signal<string | null>(null);
  protected readonly emailSent = signal(false);
  protected email = '';
  protected role: Role = 'staff';
  protected clientId = '';

  // Password reset state
  protected readonly pwModalOpen = signal(false);
  protected readonly selectedUser = signal<UserDto | null>(null);
  protected readonly generatedResetUrl = signal<string | null>(null);
  protected readonly resetEmailSent = signal(false);
  protected readonly pwLoading = signal(false);
  protected manualPassword = '';

  async ngOnInit(): Promise<void> {
    try {
      const [users, invites, clients] = await Promise.all([
        this.api.get<UserDto[]>('/users'), this.api.get<InviteDto[]>('/users/invites'), this.api.get<ClientDto[]>('/clients')
      ]);
      this.users.set(users); this.invites.set(invites); this.clients.set(clients);
    } catch (err) { this.toast.error(err); }
  }

  protected clientName(id: string | null): string { return id ? this.clients().find((c) => c.id === id)?.name ?? '—' : '—'; }
  protected expired(i: InviteDto): boolean { return new Date(i.expiresAt) < new Date(); }

  protected async update(u: UserDto, patch: { role?: Role; isActive?: boolean }): Promise<void> {
    try {
      const updated = await this.api.patch<UserDto>(`/users/${u.id}`, patch);
      this.users.update((l) => l.map((x) => (x.id === u.id ? updated : x)));
      this.toast.success('Utente aggiornato: le sue sessioni sono state chiuse');
    } catch (err) { this.toast.error(err); }
  }

  protected async toggleActive(u: UserDto): Promise<void> {
    if (u.isActive && !(await this.confirm.ask(`Disattivare ${u.name}? Perderà subito l'accesso.`, { danger: true, confirmLabel: 'Disattiva' }))) {
      this.users.update((l) => [...l]);
      return;
    }
    await this.update(u, { isActive: !u.isActive });
  }

  protected openInvite(): void { this.email = ''; this.role = 'staff'; this.clientId = ''; this.link.set(null); this.inviteOpen.set(true); }

  protected async invite(): Promise<void> {
    try {
      const r = await this.api.post<InviteCreatedDto>('/users/invites', { email: this.email.trim(), role: this.role, clientId: this.role === 'client' ? this.clientId || null : null });
      this.link.set(r.acceptUrl);
      this.emailSent.set(r.emailSent);
      this.invites.update((l) => [r, ...l]);
    } catch (err) { this.toast.error(err); }
  }

  protected async revoke(i: InviteDto): Promise<void> {
    try { await this.api.delete(`/users/invites/${i.id}`); this.invites.update((l) => l.filter((x) => x.id !== i.id)); } catch (err) { this.toast.error(err); }
  }

  protected openPasswordModal(u: UserDto): void {
    this.selectedUser.set(u);
    this.generatedResetUrl.set(null);
    this.resetEmailSent.set(false);
    this.manualPassword = '';
    this.pwModalOpen.set(true);
  }

  protected async requestUserResetLink(u: UserDto): Promise<void> {
    this.pwLoading.set(true);
    try {
      const res = await this.api.post<{ ok: boolean; resetUrl: string; emailSent: boolean }>(`/users/${u.id}/reset-password`, {});
      this.generatedResetUrl.set(res.resetUrl);
      this.resetEmailSent.set(res.emailSent);
      if (res.emailSent) {
        this.toast.success(`Email di reset inviata a ${u.email}`);
      } else {
        this.toast.success('Link di reset generato con successo!');
      }
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.pwLoading.set(false);
    }
  }

  protected generateRandomPw(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.manualPassword = res;
  }

  protected async saveManualPassword(u: UserDto): Promise<void> {
    if (this.manualPassword.length < 8) return;
    this.pwLoading.set(true);
    try {
      await this.api.post(`/users/${u.id}/set-password`, { password: this.manualPassword });
      this.toast.success(`Nuova password impostata per ${u.name}! Le sue sessioni attive sono state chiuse.`);
      await this.copy(this.manualPassword);
      this.pwModalOpen.set(false);
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.pwLoading.set(false);
    }
  }

  protected async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.toast.success('Copiato negli appunti'); } catch { this.toast.error('Copia non consentita'); }
  }
}
