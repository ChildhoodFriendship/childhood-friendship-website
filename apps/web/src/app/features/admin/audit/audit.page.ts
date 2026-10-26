import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { AuditDto, Paginated } from '@cf/shared/types';
import type { Role } from '@cf/shared';
import { Api } from '../../../core/api';
import { ToastService } from '../../../core/toast.service';

interface ActionMeta {
  label: string;
  icon: string;
  color: 'violet' | 'green' | 'amber' | 'red' | 'blue' | 'slate';
}

const ACTION_MAP: Record<string, ActionMeta> = {
  'auth.login': { label: 'Accesso', icon: '🔑', color: 'green' },
  'auth.logout': { label: 'Disconnessione', icon: '🚪', color: 'slate' },
  'auth.password_changed': { label: 'Password cambiata', icon: '🛡️', color: 'amber' },
  'auth.invite_accepted': { label: 'Invito accettato', icon: '✨', color: 'green' },
  'file.uploaded': { label: 'Asset caricato', icon: '📎', color: 'violet' },
  'file.deleted': { label: 'Asset eliminato', icon: '🗑️', color: 'red' },
  'credential.revealed': { label: 'Chiave visualizzata', icon: '👁️', color: 'amber' },
  'credential.created': { label: 'Chiave aggiunta', icon: '🔐', color: 'violet' },
  'credential.updated': { label: 'Chiave modificata', icon: '✏️', color: 'blue' },
  'credential.deleted': { label: 'Chiave rimossa', icon: '🗑️', color: 'red' },
  'project.created': { label: 'Nuovo progetto', icon: '📁', color: 'violet' },
  'project.updated': { label: 'Progetto aggiornato', icon: '✏️', color: 'blue' },
  'project.archived': { label: 'Progetto archiviato', icon: '📦', color: 'amber' },
  'project.restored': { label: 'Progetto ripristinato', icon: '♻️', color: 'green' },
  'project.deleted': { label: 'Progetto eliminato', icon: '🗑️', color: 'red' },
  'project.health_checked': { label: 'Health check', icon: '🩺', color: 'blue' },
  'document.created': { label: 'Bozza creata', icon: '📄', color: 'violet' },
  'document.updated': { label: 'Documento modificato', icon: '✏️', color: 'blue' },
  'document.submitted': { label: 'Inviato in revisione', icon: '📤', color: 'amber' },
  'document.approved': { label: 'Documento approvato', icon: '✅', color: 'green' },
  'document.rejected': { label: 'Documento rifiutato', icon: '❌', color: 'red' },
  'document.deleted': { label: 'Documento eliminato', icon: '🗑️', color: 'red' },
  'client.created': { label: 'Nuovo cliente', icon: '🏢', color: 'violet' },
  'client.updated': { label: 'Cliente modificato', icon: '✏️', color: 'blue' },
  'client.deleted': { label: 'Cliente rimosso', icon: '🗑️', color: 'red' },
  'lead.updated': { label: 'Lead aggiornato', icon: '✏️', color: 'blue' },
  'lead.converted': { label: 'Lead convertito', icon: '🎯', color: 'green' },
  'lead.deleted': { label: 'Lead eliminato', icon: '🗑️', color: 'red' },
  'task.created': { label: 'Task creata', icon: '📋', color: 'violet' },
  'task.updated': { label: 'Task aggiornata', icon: '✏️', color: 'blue' },
  'task.completed': { label: 'Task completata', icon: '✅', color: 'green' },
  'task.reopened': { label: 'Task riaperta', icon: '🔄', color: 'amber' },
  'task.deleted': { label: 'Task eliminata', icon: '🗑️', color: 'red' },
  'invite.created': { label: 'Invito inviato', icon: '✉️', color: 'violet' },
  'invite.revoked': { label: 'Invito revocato', icon: '🚫', color: 'red' }
};

const CATEGORIES = [
  { id: '', label: 'Tutti i log' },
  { id: 'file', label: 'Asset & File' },
  { id: 'credential', label: 'Caveau & Chiavi' },
  { id: 'user', label: 'Accessi & Utenti' },
  { id: 'project', label: 'Progetti' },
  { id: 'document', label: 'Documenti' },
  { id: 'client', label: 'Clienti' },
  { id: 'lead', label: 'Lead' }
];

@Component({
  selector: 'cf-audit-page',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="audit-page">
      <!-- Toolbar compatta e filtri -->
      <div class="audit-header">
        <div class="title-block">
          <div class="title-row">
            <h1>Registro attività</h1>
            <div class="compliance-badges">
              <span class="badge-audit badge-immutable" title="Audit immutabile append-only: nessun log può essere modificato o eliminato">
                🛡️ WORM Permanente
              </span>
              <span class="badge-audit badge-gdpr" title="Indirizzi IP pseudonimizzati con HMAC-SHA256 non reversibile (GDPR Art. 4.5 e 25)">
                🔒 GDPR Conforme
              </span>
            </div>
          </div>
          <p class="audit-sub">Tracciamento legale e immutabile di accessi, modifiche e visualizzazione credenziali sensibili.</p>
        </div>

        <div class="controls-row">
          <div class="category-tabs" role="tablist">
            @for (cat of categories; track cat.id) {
              <button
                type="button"
                class="cat-tab"
                [class.active]="entity() === cat.id"
                (click)="setEntity(cat.id)">
                {{ cat.label }}
              </button>
            }
          </div>

          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              [(ngModel)]="query"
              placeholder="Cerca utente o risorsa..."
              aria-label="Cerca nel registro attività" />
            @if (query()) {
              <button type="button" class="clear-search" (click)="query.set('')">✕</button>
            }
          </div>
        </div>
      </div>

      <!-- Tabella compatta e scannabile -->
      <div class="audit-card">
        <div class="table-container">
          <table class="audit-table">
            <thead>
              <tr>
                <th class="col-time">Orario</th>
                <th class="col-actor">Operatore</th>
                <th class="col-action">Evento</th>
                <th class="col-details">Dettaglio risorsa</th>
                <th class="col-security">Sicurezza IP</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr class="log-row">
                  <!-- Orario compatto con tooltip data completa -->
                  <td class="col-time" [title]="item.createdAt | date: 'd MMMM y, HH:mm:ss'">
                    <span class="time-main">{{ formatRelativeTime(item.createdAt) }}</span>
                    <span class="time-sub">{{ item.createdAt | date: 'dd/MM HH:mm' }}</span>
                  </td>

                  <!-- Operatore con avatar e ruolo -->
                  <td class="col-actor">
                    <div class="actor-cell">
                      <div class="actor-avatar" [class]="'role-' + (item.actorRole ?? 'system')">
                        {{ getInitials(item.actorName) }}
                      </div>
                      <div class="actor-info">
                        <span class="actor-name" [title]="item.actorName ?? 'Sistema automatico'">
                          {{ item.actorName ?? 'Sistema' }}
                        </span>
                        <span class="actor-role-badge" [class]="'role-' + (item.actorRole ?? 'system')">
                          {{ roleLabel(item.actorRole) }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Azione con badge semantico -->
                  <td class="col-action">
                    @let meta = getActionMeta(item.action);
                    <span class="action-badge" [class]="'color-' + meta.color">
                      <span class="action-icon">{{ meta.icon }}</span>
                      <span class="action-text">{{ meta.label }}</span>
                    </span>
                  </td>

                  <!-- Dettaglio leggibile (risorsa, file, chiavi) -->
                  <td class="col-details">
                    <div class="details-content">
                      @if (formatDetail(item); as detail) {
                        <span class="detail-pill" [class.has-json]="detail.isJson">
                          @if (detail.icon) { <span class="detail-icon">{{ detail.icon }}</span> }
                          <span class="detail-label">{{ detail.text }}</span>
                        </span>
                      } @else {
                        <span class="detail-empty">—</span>
                      }
                    </div>
                  </td>

                  <!-- Sicurezza: IP pseudonimizzato GDPR -->
                  <td class="col-security">
                    <div class="security-cell">
                      @if (item.ipHash) {
                        <span class="ip-hash-chip" title="Indirizzo IP pseudonimizzato con chiave segreta (GDPR Art. 25)">
                          <span class="lock-icon">🔒</span>
                          <span class="mono">{{ item.ipHash.slice(0, 8) }}…</span>
                        </span>
                      } @else {
                        <span class="ip-hash-chip internal" title="Operazione interna di sistema">Interno</span>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-cell">
                    <div class="empty-state">
                      <span class="empty-icon">🛡️</span>
                      <p>Nessun evento registrato corrispondente ai filtri.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Footer paginazione compatto -->
        <div class="audit-footer">
          <div class="footer-stats">
            <span class="total-count"><strong>{{ total() }}</strong> eventi registrati nel caveau</span>
            <span class="page-indicator">Pagina {{ page() }} di {{ maxPages() }}</span>
          </div>
          <div class="footer-actions">
            <button
              type="button"
              class="btn-page"
              [disabled]="page() <= 1"
              (click)="go(page() - 1)">
              ← Più recenti
            </button>
            <button
              type="button"
              class="btn-page"
              [disabled]="page() >= maxPages()"
              (click)="go(page() + 1)">
              Meno recenti →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .audit-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1400px;
      margin: 0 auto;
      padding-bottom: 32px;
    }

    /* Header compatto */
    .audit-header {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .title-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .title-row h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0;
      color: #F8FAFC;
    }

    .compliance-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-audit {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }

    .badge-immutable {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #6EE7B7;
    }

    .badge-gdpr {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #A5B4FC;
    }

    .audit-sub {
      margin: 0;
      font-size: 0.84rem;
      color: rgba(248, 250, 252, 0.55);
    }

    /* Controls: tab filtri + ricerca rapida */
    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .category-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .cat-tab {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(248, 250, 252, 0.7);
      padding: 6px 13px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .cat-tab:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .cat-tab.active {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(167, 139, 250, 0.5);
      color: #DDD6FE;
      font-weight: 600;
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 240px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      font-size: 0.78rem;
      pointer-events: none;
      opacity: 0.6;
    }

    .search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 6px 28px 6px 30px;
      color: #F8FAFC;
      font-size: 0.82rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: rgba(167, 139, 250, 0.6);
      background: rgba(255, 255, 255, 0.06);
    }

    .clear-search {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 2px 4px;
    }

    /* Container Tabella */
    .audit-card {
      background: rgba(18, 16, 28, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.84rem;
    }

    .audit-table thead th {
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 11px 16px;
      font-weight: 600;
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(248, 250, 252, 0.5);
      white-space: nowrap;
    }

    .audit-table tbody tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.12s ease;
    }

    .audit-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.035);
    }

    .audit-table td {
      padding: 10px 16px;
      vertical-align: middle;
    }

    /* Colonne */
    .col-time {
      white-space: nowrap;
      width: 130px;
    }

    .time-main {
      display: block;
      font-weight: 600;
      color: #F8FAFC;
      font-size: 0.82rem;
    }

    .time-sub {
      display: block;
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      color: rgba(248, 250, 252, 0.4);
    }

    .col-actor {
      width: 220px;
    }

    .actor-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .actor-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .actor-avatar.role-admin {
      background: linear-gradient(135deg, #7C3AED, #4F46E5);
      color: #FFFFFF;
    }

    .actor-avatar.role-staff {
      background: linear-gradient(135deg, #2563EB, #0284C7);
      color: #FFFFFF;
    }

    .actor-avatar.role-client {
      background: linear-gradient(135deg, #059669, #10B981);
      color: #FFFFFF;
    }

    .actor-avatar.role-system {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(248, 250, 252, 0.7);
    }

    .actor-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .actor-name {
      font-weight: 600;
      color: #F8FAFC;
      font-size: 0.82rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .actor-role-badge {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .actor-role-badge.role-admin { color: #C4B5FD; }
    .actor-role-badge.role-staff { color: #93C5FD; }
    .actor-role-badge.role-client { color: #6EE7B7; }
    .actor-role-badge.role-system { color: rgba(248, 250, 252, 0.45); }

    .col-action {
      width: 190px;
      white-space: nowrap;
    }

    .action-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .action-badge.color-green {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6EE7B7;
    }

    .action-badge.color-violet {
      background: rgba(124, 58, 237, 0.14);
      border: 1px solid rgba(167, 139, 250, 0.35);
      color: #DDD6FE;
    }

    .action-badge.color-blue {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(96, 165, 250, 0.3);
      color: #93C5FD;
    }

    .action-badge.color-amber {
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(251, 191, 36, 0.35);
      color: #FCD34D;
    }

    .action-badge.color-red {
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(248, 113, 113, 0.35);
      color: #FCA5A5;
    }

    .action-badge.color-slate {
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: #CBD5E1;
    }

    .action-icon {
      font-size: 0.88rem;
    }

    .col-details {
      min-width: 220px;
    }

    .details-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .detail-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 0.78rem;
      color: rgba(248, 250, 252, 0.85);
      max-width: 480px;
    }

    .detail-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .detail-empty {
      color: rgba(255, 255, 255, 0.25);
    }

    .col-security {
      width: 140px;
      white-space: nowrap;
    }

    .security-cell {
      display: flex;
      align-items: center;
    }

    .ip-hash-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.72rem;
      color: rgba(248, 250, 252, 0.55);
    }

    .ip-hash-chip.internal {
      color: rgba(248, 250, 252, 0.35);
      border-style: dashed;
    }

    .lock-icon {
      font-size: 0.68rem;
      opacity: 0.7;
    }

    /* Empty state */
    .empty-cell {
      padding: 48px 16px;
      text-align: center;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: rgba(248, 250, 252, 0.5);
    }

    .empty-icon {
      font-size: 2rem;
      opacity: 0.5;
    }

    /* Footer paginazione */
    .audit-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(0, 0, 0, 0.15);
      font-size: 0.8rem;
    }

    .footer-stats {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(248, 250, 252, 0.6);
    }

    .footer-stats strong {
      color: #DDD6FE;
    }

    .page-indicator {
      font-family: 'DM Mono', monospace;
      font-size: 0.75rem;
      color: rgba(248, 250, 252, 0.4);
    }

    .footer-actions {
      display: flex;
      gap: 8px;
    }

    .btn-page {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .btn-page:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-page:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    @media (max-width: 900px) {
      .col-security { display: none; }
      .audit-header { gap: 10px; }
      .controls-row { flex-direction: column; align-items: stretch; }
      .search-box { min-width: 100%; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditPage implements OnInit {
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);

  protected readonly categories = CATEGORIES;
  protected readonly items = signal<AuditDto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly pageSize = 50;
  protected readonly entity = signal('');
  protected readonly query = signal('');

  protected readonly maxPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  protected readonly filteredItems = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.items();
    if (!q) return list;
    return list.filter((item) => {
      const actor = (item.actorName ?? '').toLowerCase();
      const action = item.action.toLowerCase();
      const metaStr = JSON.stringify(item.meta).toLowerCase();
      return actor.includes(q) || action.includes(q) || metaStr.includes(q);
    });
  });

  ngOnInit(): void {
    void this.go(1);
  }

  protected setEntity(e: string): void {
    this.entity.set(e);
    void this.go(1);
  }

  protected async go(p: number): Promise<void> {
    this.page.set(p);
    try {
      const r = await this.api.get<Paginated<AuditDto>>('/audit', {
        entity: this.entity() || undefined,
        page: p,
        pageSize: this.pageSize
      });
      this.items.set(r.items);
      this.total.set(r.total);
    } catch (err) {
      this.toast.error(err);
    }
  }

  protected getActionMeta(action: string): ActionMeta {
    if (ACTION_MAP[action]) return ACTION_MAP[action];
    const parts = action.split('.');
    const label = parts.length > 1
      ? parts[1].replace(/_/g, ' ')
      : action;
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      icon: '⚡',
      color: 'slate'
    };
  }

  protected roleLabel(role?: Role | null): string {
    switch (role) {
      case 'admin': return 'Admin';
      case 'staff': return 'Staff';
      case 'client': return 'Cliente';
      default: return 'Sistema';
    }
  }

  protected getInitials(name?: string | null): string {
    if (!name) return '⚙️';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  protected formatRelativeTime(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Proprio ora';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m fa`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h fa`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days}g fa`;
    return new Date(isoDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  }

  protected formatDetail(item: AuditDto): { text: string; icon?: string; isJson?: boolean } | null {
    const m = item.meta as Record<string, unknown>;
    if (!m || Object.keys(m).length === 0) return null;

    if (m['name']) {
      const sizeStr = m['size'] ? ` (${this.formatBytes(Number(m['size']))})` : '';
      return { text: `${m['name']}${sizeStr}`, icon: '📄' };
    }
    if (m['service']) {
      return { text: `Servizio: ${m['service']}`, icon: '🔑' };
    }
    if (m['title']) {
      return { text: `"${m['title']}"`, icon: '📝' };
    }
    if (m['email']) {
      return { text: `${m['email']} (${m['role'] ?? 'invito'})`, icon: '✉️' };
    }
    if (m['fields']) {
      const f = Array.isArray(m['fields']) ? m['fields'].join(', ') : String(m['fields']);
      return { text: `Campi: ${f}`, icon: '✏️' };
    }
    if (m['siteOnline'] !== undefined) {
      return {
        text: `Sito ${m['siteOnline'] ? 'Online' : 'Offline'} (${m['siteLatencyMs']}ms) • DB ${m['dbConnected'] ? 'OK' : 'ERR'}`,
        icon: '🩺'
      };
    }
    // Fallback: pulisci JSON compatto
    const entries = Object.entries(m)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' • ');
    return { text: entries, isJson: true };
  }

  private formatBytes(b: number): string {
    if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(b / 1024))} KB`;
  }
}
