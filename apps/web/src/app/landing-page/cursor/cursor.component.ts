import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal, viewChild, afterNextRender } from '@angular/core';
import { PointerService } from '../pointer.service';

/** Cursore "gessetto": segue il puntatore con un leggero ritardo e mostra un'etichetta sugli elementi con [data-cursor]. */
@Component({
  selector: 'cf-cursor',
  template: `<div #dot class="dot" [class.big]="label()" [class.down]="down()"><span>{{ label() }}</span></div>`,
  styles: `
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 100; }
    .dot { position: absolute; left: 0; top: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%; background: var(--cf-chalk);
      mix-blend-mode: difference; display: grid; place-items: center; transition: width .25s, height .25s, margin .25s; will-change: transform; }
    .dot span { font-family: var(--cf-hand); font-size: 1.15rem; color: var(--cf-ink); opacity: 0; transition: opacity .2s; white-space: nowrap; }
    .big { width: 84px; height: 84px; margin: -42px 0 0 -42px; mix-blend-mode: normal; background: var(--cf-sun); }
    .big span { opacity: 1; }
    .down { width: 10px; height: 10px; margin: -5px 0 0 -5px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CursorComponent {
  private readonly pointer = inject(PointerService);
  private readonly dot = viewChild.required<ElementRef<HTMLElement>>('dot');
  protected readonly label = signal('');
  protected readonly down = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      let x = this.pointer.pos().x, y = this.pointer.pos().y, raf = 0;
      const loop = () => {
        const p = this.pointer.pos();
        x += (p.x - x) * 0.22;
        y += (p.y - y) * 0.22;
        this.dot().nativeElement.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const over = (e: PointerEvent) => {
        const el = (e.target as Element | null)?.closest<HTMLElement>('[data-cursor]');
        this.label.set(el?.dataset['cursor'] ?? '');
      };
      const press = () => this.down.set(true);
      const release = () => this.down.set(false);
      document.addEventListener('pointerover', over);
      document.addEventListener('pointerdown', press);
      document.addEventListener('pointerup', release);
      destroyRef.onDestroy(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener('pointerover', over);
        document.removeEventListener('pointerdown', press);
        document.removeEventListener('pointerup', release);
      });
    });
  }
}
