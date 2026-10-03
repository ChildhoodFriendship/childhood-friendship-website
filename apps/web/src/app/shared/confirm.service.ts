import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest { title: string; message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void; }

/** Conferme non bloccanti (niente window.confirm). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(message: string, opts: { title?: string; confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    this.current()?.resolve(false);
    return new Promise((resolve) => this.current.set({
      title: opts.title ?? 'Conferma', message, confirmLabel: opts.confirmLabel ?? 'Conferma', danger: opts.danger ?? false, resolve
    }));
  }

  answer(ok: boolean): void {
    this.current()?.resolve(ok);
    this.current.set(null);
  }
}
