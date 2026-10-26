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
      <header class="page-header" style="justify-content: flex-end; margin-bottom: 12px;"><button class="btn btn-primary" (click)="openInvite()">+ Invita</button></header>
      <section class="card card-tight"><div class="table-wrap"><table class="table">
        <thead><tr><th>Utente</th><th>Ruolo</th><th>Cliente</th><th>Ultimo accesso</th><th>Attivo</th></tr></thead>
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
            </tr>
          }
        </tbody>
      </table></div></section>

      <section class="stack-sm">
        <h2>Inviti in sospeso</h2>
        <div class="card card-tight"><div class="table-wrap"><table class="table">
          <tbody>
            @for (i of pendingInvites(); track i.id) {
              <tr>
                <td>{{ i.email }}</td><td>{{ roleLabels[i.role] }}</td><td class="small">{{ clientName(i.clientId) }}</td>
                <td class="small" [class.muted]="!expired(i)" [class.danger]="expired(i)">{{ expired(i) ? 'Scaduto' : 'Scade ' + (i.expiresAt | date: 'd MMM HH:mm') }}</td>
                <td class="actions"><button class="btn btn-ghost btn-sm" (click)="revoke(i)">Revoca</button></td>
              </tr>
            } @empty { <tr><td><div class="empty">Nessun invito in sospeso.</div></td></tr> }
          </tbody>
        </table></div></div>
      </section>
    </div>

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

  protected async copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.toast.success('Link copiato'); } catch { this.toast.error('Copia non consentita'); }
  }
}
