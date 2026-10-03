import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { MessageDto } from '@cf/shared/types';
import { Api } from '../core/api';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { ROLE_LABELS } from './labels';

const POLL_MS = 20_000;

@Component({
  selector: 'cf-messages-thread',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="thread card card-tight">
      <div #list class="thread-list" role="log" aria-live="polite" aria-label="Messaggi del progetto">
        @if (loading() && !messages().length) {
          <div class="skeleton" style="height: 48px; margin: 16px"></div>
        } @else if (!messages().length) {
          <div class="empty"><strong>Nessun messaggio</strong>Scrivi il primo messaggio per avviare la conversazione.</div>
        }
        @for (m of messages(); track m.id) {
          <div class="msg" [class.mine]="m.authorId === me()?.id">
            <div class="msg-meta small">
              <strong>{{ m.authorName }}</strong>
              <span class="muted">· {{ roleLabels[m.authorRole] }} · {{ m.createdAt | date: 'd MMM, HH:mm' }}</span>
            </div>
            <div class="msg-body">{{ m.body }}</div>
          </div>
        }
      </div>
      <form class="composer" (ngSubmit)="send()">
        <label class="sr-only" for="msg-input">Nuovo messaggio</label>
        <textarea id="msg-input" class="textarea" name="body" rows="2" maxlength="4000" [(ngModel)]="draft"
          placeholder="Scrivi un messaggio… (Ctrl+Invio per inviare)" (keydown.control.enter)="send()" (keydown.meta.enter)="send()"></textarea>
        <button class="btn btn-primary" type="submit" [disabled]="sending() || !draft.trim()">Invia</button>
      </form>
    </div>
  `,
  styles: `
    .thread { display: flex; flex-direction: column; }
    .thread-list { max-height: 520px; min-height: 200px; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .msg-meta span { margin-left: 6px; }
    .msg { max-width: 78%; align-self: flex-start; }
    .msg.mine { align-self: flex-end; text-align: right; }
    .msg-body { margin-top: 4px; padding: 10px 14px; border-radius: 12px; background: var(--cf-color-surface-raised); white-space: pre-wrap; text-align: left; overflow-wrap: anywhere; }
    .msg.mine .msg-body { background: var(--cf-violet-soft); border: 1px solid rgba(139, 92, 246, .35); }
    .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--cf-color-border); align-items: flex-end; }
    .composer .textarea { min-height: 44px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesThreadComponent {
  readonly projectId = input.required<string>();
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly me = inject(AuthService).user;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly messages = signal<MessageDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected draft = '';
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  constructor() {
    effect(() => { void this.load(this.projectId()); });
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void this.load(this.projectId(), true); }, POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private async load(projectId: string, silent = false): Promise<void> {
    if (!silent) this.loading.set(true);
    try {
      const rows = await this.api.get<MessageDto[]>(`/projects/${projectId}/messages`, { limit: 100 });
      const changed = rows.length !== this.messages().length || rows.at(-1)?.id !== this.messages().at(-1)?.id;
      this.messages.set(rows);
      if (changed) this.scrollToEnd();
    } catch (err) {
      if (!silent) this.toast.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  protected async send(): Promise<void> {
    const body = this.draft.trim();
    if (!body || this.sending()) return;
    this.sending.set(true);
    try {
      const msg = await this.api.post<MessageDto>(`/projects/${this.projectId()}/messages`, { body });
      this.messages.update((m) => [...m, msg]);
      this.draft = '';
      this.scrollToEnd();
    } catch (err) {
      this.toast.error(err);
    } finally {
      this.sending.set(false);
    }
  }

  private scrollToEnd(): void {
    queueMicrotask(() => setTimeout(() => {
      const el = this.list()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }));
  }
}
