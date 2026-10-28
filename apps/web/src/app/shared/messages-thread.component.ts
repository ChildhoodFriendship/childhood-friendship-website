import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { MessageDto } from '@cf/shared/types';
import { Api } from '../core/api';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { ROLE_LABELS } from './labels';

const POLL_MS = 15_000;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB

interface PendingMedia {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  name: string;
}

interface ParsedMessage {
  text: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
}

@Component({
  selector: 'cf-messages-thread',
  imports: [DatePipe, FormsModule],
  template: `
    @if (floating()) {
      <!-- FLOATING ACTION BUTTON FISSO IN BASSO A DESTRA (se non nascosto) -->
      @if (!hideFab()) {
        <button
          type="button"
          class="floating-chat-fab"
          [class.is-open]="isOpen()"
          (click)="toggleOpen()"
          aria-label="Apri o chiudi chat con lo studio"
          title="Chat con lo studio">
          @if (!isOpen()) {
            <span class="fab-icon">💬</span>
            @if (unreadCount() > 0) {
              <span class="unread-pill">{{ unreadCount() }}</span>
            }
          } @else {
            <span class="fab-icon-close">✕</span>
          }
        </button>
      }

      <!-- FINESTRA FLUTTUANTE CHAT A COMPARSA -->
      @if (isOpen()) {
        <aside class="floating-chat-window animate-popup" role="dialog" aria-label="Finestra Messaggi con lo studio">
          <!-- Header chat fluttuante -->
          <header class="chat-header">
            <div class="chat-header-info">
              <div class="avatar-cf">CF</div>
              <div>
                <h4 class="chat-title">Messaggi con lo studio</h4>
                <div class="chat-status-line">
                  <span class="pulse-online" aria-hidden="true"></span>
                  <span class="chat-status-text">Team Childhood Friendship · Attivo</span>
                </div>
              </div>
            </div>
            <button type="button" class="btn-close-chat" (click)="toggleOpen()" aria-label="Chiudi chat">✕</button>
          </header>

          <!-- Corpo messaggi -->
          <div #list class="chat-body" role="log" aria-live="polite">
            @if (loading() && !messages().length) {
              <div class="skeleton-wrap">
                <div class="skeleton" style="height: 38px; border-radius: 14px"></div>
                <div class="skeleton" style="height: 52px; border-radius: 14px; margin-left: 30%"></div>
              </div>
            } @else if (!messages().length) {
              <div class="empty-chat">
                <div class="empty-icon">💬</div>
                <strong>Nessun messaggio ancora</strong>
                <p>Scrivi qui sotto o invia foto e video per concordare i dettagli del tuo progetto.</p>
              </div>
            }

            @for (m of messages(); track m.id) {
              @let isMine = m.authorId === me()?.id;
              @let parsed = parseMessage(m.body);
              <div class="msg-row" [class.mine]="isMine">
                <div class="msg-bubble" [class.mine]="isMine">
                  @if (!isMine) {
                    <div class="msg-author-meta">
                      <strong>{{ m.authorName }}</strong>
                      <span class="author-role">{{ roleLabels[m.authorRole] }}</span>
                    </div>
                  }

                  <!-- Media se presente (Foto o Video) -->
                  @if (parsed.mediaUrl) {
                    <div class="media-container">
                      @if (parsed.mediaType === 'image') {
                        <a [href]="parsed.mediaUrl" target="_blank" rel="noopener noreferrer" class="img-link" title="Clicca per ingrandire">
                          <img [src]="parsed.mediaUrl" alt="Foto allegata" loading="lazy" class="chat-img-thumb" />
                        </a>
                      } @else if (parsed.mediaType === 'video') {
                        <video [src]="parsed.mediaUrl" controls class="chat-video-player" preload="metadata"></video>
                      }
                    </div>
                  }

                  <!-- Testo messaggio -->
                  @if (parsed.text) {
                    <div class="msg-text">{{ parsed.text }}</div>
                  }

                  <div class="msg-time">{{ m.createdAt | date: 'HH:mm' }}</div>
                </div>
              </div>
            }
          </div>

          <!-- Anteprima media in caricamento prima dell'invio -->
          @if (pendingMedia(); as pm) {
            <div class="pending-media-bar">
              <div class="media-thumb-preview">
                @if (pm.type === 'image') {
                  <img [src]="pm.previewUrl" alt="Anteprima foto" class="thumb-mini" />
                } @else {
                  <span class="video-ico">🎥</span>
                }
                <div class="media-details">
                  <span class="media-type-tag">{{ pm.type === 'image' ? 'FOTO' : 'VIDEO' }}</span>
                  <span class="media-name truncate">{{ pm.name }}</span>
                </div>
              </div>
              <button type="button" class="btn-remove-media" (click)="clearPendingMedia()" title="Rimuovi allegato" [disabled]="uploadingMedia()">✕</button>
            </div>
          }

          @if (uploadingMedia()) {
            <div class="upload-progress-wrap">
              <span class="small mono muted">Caricamento media in corso... {{ uploadProgress() }}%</span>
              <div class="progress"><span [style.width.%]="uploadProgress()"></span></div>
            </div>
          }

          <!-- Form di composizione -->
          <form class="chat-composer" (ngSubmit)="send()">
            <input #fileInput type="file" accept="image/*,video/*" style="display: none" (change)="onFilePicked($event)" />
            <button
              type="button"
              class="btn-attach"
              (click)="fileInput.click()"
              [disabled]="sending() || uploadingMedia()"
              title="Allega foto o video">
              📎
            </button>
            <input
              type="text"
              class="composer-input"
              [(ngModel)]="draft"
              name="body"
              placeholder="Scrivi un messaggio…"
              maxlength="3000"
              [disabled]="sending() || uploadingMedia()" />
            <button
              type="submit"
              class="btn-send"
              [disabled]="(!draft.trim() && !pendingMedia()) || sending() || uploadingMedia()"
              aria-label="Invia messaggio">
              ➤
            </button>
          </form>
        </aside>
      }
    } @else {
      <!-- MODALITÀ EMBEDDED / VISTA DEDICATA CON HEADER COMPLETO -->
      <div class="embedded-chat-card">
        <header class="chat-header">
          <div class="chat-header-info">
            <div class="avatar-cf">CF</div>
            <div>
              <h4 class="chat-title">Messaggi con lo studio</h4>
              <div class="chat-status-line">
                <span class="pulse-online" aria-hidden="true"></span>
                <span class="chat-status-text">Team Childhood Friendship · Supporto Diretto</span>
              </div>
            </div>
          </div>
        </header>

        <div #list class="chat-body embedded-body" role="log" aria-live="polite">
          @if (loading() && !messages().length) {
            <div class="skeleton" style="height: 60px; border-radius: 12px"></div>
          } @else if (!messages().length) {
            <div class="empty-chat">
              <strong>Nessun messaggio</strong>
              <p>Invia il primo messaggio o allega foto e video.</p>
            </div>
          }

          @for (m of messages(); track m.id) {
            @let isMine = m.authorId === me()?.id;
            @let parsed = parseMessage(m.body);
            <div class="msg-row" [class.mine]="isMine">
              <div class="msg-bubble" [class.mine]="isMine">
                <div class="msg-author-meta">
                  <strong>{{ m.authorName }}</strong>
                  <span class="author-role">{{ roleLabels[m.authorRole] }} · {{ m.createdAt | date: 'd MMM, HH:mm' }}</span>
                </div>

                @if (parsed.mediaUrl) {
                  <div class="media-container">
                    @if (parsed.mediaType === 'image') {
                      <a [href]="parsed.mediaUrl" target="_blank" rel="noopener noreferrer" class="img-link">
                        <img [src]="parsed.mediaUrl" alt="Foto" loading="lazy" class="chat-img-thumb" />
                      </a>
                    } @else if (parsed.mediaType === 'video') {
                      <video [src]="parsed.mediaUrl" controls class="chat-video-player" preload="metadata"></video>
                    }
                  </div>
                }

                @if (parsed.text) {
                  <div class="msg-text">{{ parsed.text }}</div>
                }
              </div>
            </div>
          }
        </div>

        @if (pendingMedia(); as pm) {
          <div class="pending-media-bar">
            <div class="media-thumb-preview">
              @if (pm.type === 'image') {
                <img [src]="pm.previewUrl" alt="Anteprima foto" class="thumb-mini" />
              } @else {
                <span class="video-ico">🎥</span>
              }
              <div class="media-details">
                <span class="media-type-tag">{{ pm.type === 'image' ? 'FOTO' : 'VIDEO' }}</span>
                <span class="media-name truncate">{{ pm.name }}</span>
              </div>
            </div>
            <button type="button" class="btn-remove-media" (click)="clearPendingMedia()" [disabled]="uploadingMedia()">✕</button>
          </div>
        }

        <form class="chat-composer embedded-composer" (ngSubmit)="send()">
          <input #fileInputEmbedded type="file" accept="image/*,video/*" style="display: none" (change)="onFilePicked($event)" />
          <button type="button" class="btn-attach" (click)="fileInputEmbedded.click()" title="Allega foto o video">📎</button>
          <input type="text" class="composer-input" [(ngModel)]="draft" name="body" placeholder="Scrivi un messaggio…" />
          <button type="submit" class="btn-send" [disabled]="(!draft.trim() && !pendingMedia()) || sending() || uploadingMedia()" aria-label="Invia messaggio">➤</button>
        </form>
      </div>
    }
  `,
  styles: `
    /* ========================================================
       FLOATING ACTION BUTTON FISSO IN BASSO A DESTRA
       ======================================================== */
    .floating-chat-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      padding: 0;
      justify-content: center;
      background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%);
      color: #FFFFFF;
      border: 1.5px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 12px 36px rgba(124, 58, 237, 0.5), 0 4px 12px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      cursor: pointer;
      z-index: 1050;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .floating-chat-fab:hover {
      transform: translateY(-3px) scale(1.06);
      box-shadow: 0 16px 42px rgba(124, 58, 237, 0.65), 0 6px 16px rgba(0, 0, 0, 0.5);
    }
    .floating-chat-fab.is-open {
      background: #242033;
      border-color: rgba(167, 139, 250, 0.5);
    }
    .fab-icon {
      font-size: 1.35rem;
      line-height: 1;
    }
    .fab-icon-close {
      font-size: 1.25rem;
      font-weight: 700;
      color: #DDD6FE;
    }
    .fab-badge {
      font-family: var(--cf-display, sans-serif);
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .unread-pill {
      background: #EF4444;
      color: #FFF;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 999px;
    }

    /* ========================================================
       FINESTRA CHAT FLUTTUANTE A COMPARSA (BORDI ARROTONDATI)
       ======================================================== */
    .floating-chat-window {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: min(410px, calc(100vw - 32px));
      height: min(580px, calc(100vh - 120px));
      background: #12101C;
      border: 1px solid rgba(167, 139, 250, 0.3);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(124, 58, 237, 0.2);
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      z-index: 1040;
      backdrop-filter: blur(20px);
    }

    .animate-popup {
      animation: popupIn 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popupIn {
      0% { opacity: 0; transform: translateY(16px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header Chat */
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: rgba(30, 27, 46, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-cf {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED, #A78BFA);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
    }
    .chat-title {
      font-size: 0.96rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.01em;
      color: #F6F1FF;
    }
    .chat-status-line {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }
    .pulse-online {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 8px #10B981;
    }
    .chat-status-text {
      font-size: 0.74rem;
      color: rgba(246, 241, 255, 0.65);
    }
    .btn-close-chat {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(246, 241, 255, 0.8);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s ease;
    }
    .btn-close-chat:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #FFF;
    }

    /* Corpo Messaggi */
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: radial-gradient(circle at bottom, rgba(20, 16, 32, 0.9) 0%, rgba(13, 11, 21, 0.98) 100%);
    }

    .empty-chat {
      margin: auto 0;
      text-align: center;
      padding: 24px 16px;
      color: rgba(246, 241, 255, 0.6);
    }
    .empty-icon {
      font-size: 2.2rem;
      margin-bottom: 8px;
    }
    .empty-chat strong {
      display: block;
      color: #F6F1FF;
      font-size: 0.95rem;
      margin-bottom: 4px;
    }
    .empty-chat p {
      font-size: 0.82rem;
      margin: 0;
      line-height: 1.4;
    }

    .msg-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 82%;
    }
    .msg-row.mine {
      align-items: flex-end;
      align-self: flex-end;
    }

    /* Bolle Messaggio Arrotondate */
    .msg-bubble {
      padding: 10px 14px;
      border-radius: 18px 18px 18px 4px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #F6F1FF;
      display: flex;
      flex-direction: column;
      gap: 4px;
      word-break: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    .msg-bubble.mine {
      border-radius: 18px 18px 4px 18px;
      background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
      border: 1px solid rgba(167, 139, 250, 0.4);
      color: #FFFFFF;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
    }

    .msg-author-meta {
      font-size: 0.74rem;
      display: flex;
      gap: 6px;
      align-items: baseline;
      color: rgba(246, 241, 255, 0.75);
      margin-bottom: 2px;
    }
    .author-role {
      font-size: 0.68rem;
      opacity: 0.8;
      text-transform: capitalize;
    }

    .msg-text {
      font-size: 0.9rem;
      line-height: 1.38;
      white-space: pre-wrap;
    }

    .msg-time {
      font-family: 'DM Mono', monospace;
      font-size: 0.68rem;
      opacity: 0.65;
      align-self: flex-end;
      margin-top: 2px;
    }

    /* FOTO E VIDEO NEI MESSAGGI */
    .media-container {
      margin: 4px 0 6px;
      border-radius: 14px;
      overflow: hidden;
      max-width: 100%;
    }
    .img-link {
      display: block;
      border-radius: 14px;
      overflow: hidden;
    }
    .chat-img-thumb {
      max-width: 100%;
      max-height: 240px;
      object-fit: cover;
      display: block;
      border-radius: 14px;
      transition: transform 0.2s ease;
    }
    .chat-img-thumb:hover {
      transform: scale(1.02);
    }
    .chat-video-player {
      max-width: 100%;
      max-height: 240px;
      border-radius: 14px;
      display: block;
      background: #000;
    }

    /* Anteprima media prima dell'invio */
    .pending-media-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(30, 25, 45, 0.9);
      border-top: 1px solid rgba(167, 139, 250, 0.25);
    }
    .media-thumb-preview {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .thumb-mini {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .video-ico {
      font-size: 1.6rem;
      line-height: 1;
    }
    .media-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }
    .media-type-tag {
      font-family: 'DM Mono', monospace;
      font-size: 0.66rem;
      font-weight: 700;
      color: #DDD6FE;
    }
    .media-name {
      font-size: 0.75rem;
      color: rgba(246, 241, 255, 0.85);
      max-width: 220px;
    }
    .btn-remove-media {
      background: transparent;
      border: 0;
      color: #EF4444;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      padding: 4px 8px;
    }

    .upload-progress-wrap {
      padding: 6px 14px;
      background: rgba(15, 12, 25, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Composer */
    .chat-composer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #181524;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-attach {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #DDD6FE;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .btn-attach:hover:not(:disabled) {
      background: rgba(124, 58, 237, 0.3);
      border-color: #A78BFA;
      transform: scale(1.05);
    }
    .composer-input {
      flex: 1;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.04);
      color: #F6F1FF;
      padding: 0 16px;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .composer-input:focus {
      border-color: #A78BFA;
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7C3AED, #9333EA);
      border: 0;
      color: #FFFFFF;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .btn-send:hover:not(:disabled) {
      transform: scale(1.08);
    }
    .btn-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Embedded Styles */
    .embedded-chat-card {
      border-radius: 18px;
      overflow: hidden;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .embedded-chat-card .chat-header {
      background: transparent;
      border-bottom: none;
      padding: 12px 14px 4px;
    }
    .embedded-header {
      padding: 12px 16px;
      border-bottom: none;
    }
    .embedded-body {
      min-height: 380px;
      max-height: min(620px, calc(100vh - 340px));
      height: 480px;
    }
    .embedded-composer {
      border-radius: 0 0 16px 16px;
    }

    @media (max-width: 480px) {
      .floating-chat-window {
        bottom: 84px;
        right: 12px;
        left: 12px;
        width: calc(100vw - 24px);
        height: min(520px, calc(100vh - 110px));
        border-radius: 20px;
      }
      .floating-chat-fab {
        bottom: 18px;
        right: 18px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessagesThreadComponent {
  readonly projectId = input.required<string>();
  readonly floating = input(false);
  readonly hideFab = input(false);
  private readonly api = inject(Api);
  private readonly toast = inject(ToastService);
  protected readonly me = inject(AuthService).user;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly messages = signal<MessageDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly uploadingMedia = signal(false);
  protected readonly uploadProgress = signal(0);
  protected readonly isOpen = signal(false);
  protected readonly unreadCount = signal(0);
  protected readonly pendingMedia = signal<PendingMedia | null>(null);
  protected draft = '';
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  constructor() {
    effect(() => { void this.load(this.projectId()); });
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.load(this.projectId(), true);
    }, POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected toggleOpen(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.unreadCount.set(0);
      setTimeout(() => this.scrollToEnd(), 100);
    }
  }

  public openChat(): void {
    this.isOpen.set(true);
    this.unreadCount.set(0);
    setTimeout(() => this.scrollToEnd(), 100);
  }

  public toggleChat(): void {
    this.toggleOpen();
  }

  public isChatOpen(): boolean {
    return this.isOpen();
  }

  private async load(projectId: string, silent = false): Promise<void> {
    if (!silent) this.loading.set(true);
    try {
      const rows = await this.api.get<MessageDto[]>(`/projects/${projectId}/messages`, { limit: 100 });
      const prevLength = this.messages().length;
      const changed = rows.length !== prevLength || rows.at(-1)?.id !== this.messages().at(-1)?.id;
      this.messages.set(rows);
      if (changed) {
        if (!this.isOpen() && prevLength > 0 && rows.length > prevLength) {
          const newOnes = rows.slice(prevLength).filter((m) => m.authorId !== this.me()?.id);
          this.unreadCount.update((c) => c + newOnes.length);
        }
        this.scrollToEnd();
      }
    } catch (err) {
      if (!silent) this.toast.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  protected onFilePicked(e: Event): void {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name);

    if (!isImg && !isVideo) {
      this.toast.error('Puoi allegare solo foto o video.');
      inputEl.value = '';
      return;
    }

    if (file.size > MAX_MEDIA_BYTES) {
      this.toast.error(`${file.name}: troppo grande (max 25 MB)`);
      inputEl.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this.pendingMedia.set({
      file,
      previewUrl,
      type: isVideo ? 'video' : 'image',
      name: file.name
    });
    inputEl.value = '';
  }

  protected clearPendingMedia(): void {
    const pm = this.pendingMedia();
    if (pm?.previewUrl) {
      URL.revokeObjectURL(pm.previewUrl);
    }
    this.pendingMedia.set(null);
  }

  protected async send(): Promise<void> {
    const text = this.draft.trim();
    const media = this.pendingMedia();
    if ((!text && !media) || this.sending() || this.uploadingMedia()) return;

    this.sending.set(true);
    try {
      let finalBody = text;

      if (media) {
        this.uploadingMedia.set(true);
        const pid = this.projectId();
        const contentType = media.file.type || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');

        const { pathname, clientToken } = await this.api.post<{ pathname: string; clientToken: string }>(
          `/projects/${pid}/files/upload-token`,
          { name: media.file.name, contentType, size: media.file.size }
        );

        const { put } = await import('@vercel/blob/client');
        const blobRes = await put(pathname, media.file, {
          access: 'public',
          token: clientToken,
          contentType,
          onUploadProgress: (p) => this.uploadProgress.set(Math.round(p.percentage))
        });

        const mediaTag = `[media:${blobRes.url}|${media.type}]`;
        finalBody = finalBody ? `${finalBody}\n\n${mediaTag}` : mediaTag;

        // Registra opzionalmente il file tra i materiali del progetto
        void this.api.post(`/projects/${pid}/files`, { pathname, name: media.file.name }).catch(() => {});
      }

      const msg = await this.api.post<MessageDto>(`/projects/${this.projectId()}/messages`, { body: finalBody });
      this.messages.update((m) => [...m, msg]);
      this.draft = '';
      this.clearPendingMedia();
      this.scrollToEnd();
      this.toast.success(media ? 'Messaggio e file inviati' : 'Messaggio inviato');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : err);
    } finally {
      this.sending.set(false);
      this.uploadingMedia.set(false);
      this.uploadProgress.set(0);
    }
  }

  protected parseMessage(rawBody: string): ParsedMessage {
    const body = rawBody || '';

    // 1. Controlla tag esplicito [media:URL|type]
    const tagMatch = body.match(/\[media:([^|]+)\|(image|video)\]/);
    if (tagMatch) {
      const mediaUrl = tagMatch[1];
      const mediaType = tagMatch[2] as 'image' | 'video';
      const cleanText = body.replace(tagMatch[0], '').trim();
      return { text: cleanText, mediaUrl, mediaType };
    }

    // 2. Cerca URL generico foto/video nel messaggio
    const urlMatches = body.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) {
      for (const u of urlMatches) {
        if (/\.(png|jpe?g|webp|gif|svg|avif)($|\?)/i.test(u) || u.includes('/blob/image') || u.includes('image')) {
          return { text: body.replace(u, '').trim(), mediaUrl: u, mediaType: 'image' };
        }
        if (/\.(mp4|webm|mov|quicktime)($|\?)/i.test(u) || u.includes('video')) {
          return { text: body.replace(u, '').trim(), mediaUrl: u, mediaType: 'video' };
        }
      }
    }

    return { text: body, mediaUrl: null, mediaType: null };
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.list()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
