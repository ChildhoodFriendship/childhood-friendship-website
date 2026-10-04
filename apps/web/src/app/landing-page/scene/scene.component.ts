import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, output, viewChild } from '@angular/core';
import { BuilderScene } from './builder-scene';

/** Tela 3D fissa dietro le sezioni scure della landing. Caricata in differita (@defer). */
@Component({
  selector: 'cf-scene',
  template: `<canvas #canvas class="scene" aria-hidden="true"></canvas>`,
  styles: `
    :host { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    .scene { width: 100%; height: 100%; display: block; opacity: 0; transition: opacity 1.2s ease; }
    :host(.ready) .scene { opacity: 1; }
  `,
  host: { '[class.ready]': 'ready' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SceneComponent {
  readonly started = output<void>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected ready = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const mobile = window.matchMedia('(max-width: 899px), (pointer: coarse)').matches;
      let scene: BuilderScene;
      try {
        scene = new BuilderScene(this.canvas().nativeElement, {
          reducedMotion, mobile,
          ids: { hero: 'top', stage: 'hero-stage', manifesto: 'manifesto', services: 'servizi', method: 'metodo', contact: 'finale' },
          onReady: () => { host.classList.add('ready'); }
        });
      } catch (err) {
        console.warn('[cf-scene] WebGL non disponibile', err);
        return;
      }
      this.started.emit();
      const norm = (e: PointerEvent) => [(e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1] as const;
      const move = (e: PointerEvent) => { const [x, y] = norm(e); scene.setPointer(x, y); };
      const click = (e: PointerEvent) => {
        // i click su link, bottoni e form non devono far saltare il personaggio
        if ((e.target as Element).closest('a, button, input, textarea, select, label')) return;
        const [x, y] = norm(e);
        scene.poke(x, y);
      };
      const resize = () => scene.resize();
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerdown', click);
      window.addEventListener('resize', resize);
      // le sezioni sono già nel DOM: collega lo scroll dopo il primo layout
      requestAnimationFrame(() => scene.bindScroll());
      scene.start();
      destroyRef.onDestroy(() => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerdown', click);
        window.removeEventListener('resize', resize);
        scene.dispose();
      });
    });
  }
}
