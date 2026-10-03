import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export interface PointerPos { x: number; y: number; }

/** Posizione del puntatore condivisa dalla landing (un solo listener, aggiornata una volta per frame). */
@Injectable()
export class PointerService {
  readonly pos = signal<PointerPos>({ x: typeof window === 'undefined' ? 0 : window.innerWidth / 2, y: typeof window === 'undefined' ? 0 : window.innerHeight / 3 });
  readonly reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  private frame = 0;
  private next: PointerPos | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      this.next = { x: e.clientX, y: e.clientY };
      this.frame ||= requestAnimationFrame(() => {
        this.frame = 0;
        if (this.next) this.pos.set(this.next);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(this.frame);
    });
  }
}
