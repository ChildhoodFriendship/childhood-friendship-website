import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
  afterNextRender
} from '@angular/core';
import { LogoComponent } from '../../shared/logo.component';

interface Brick {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  startY: number;
  currentY: number;
  currentAlpha: number;
  startTime: number;
  duration: number;
  landed: boolean;
  impactFlash: number;
}

/**
 * Preloader "Virtual Brick Wall" ultra-rapido e fluido:
 * I mattoni virtuali semitrasparenti cadono velocemente dal cielo
 * assemblando lo sfondo in meno di 0.8s.
 * Appena completato il muro, il sipario si apre istantaneamente con massima fluidità.
 */
@Component({
  selector: 'cf-preloader',
  imports: [LogoComponent],
  template: `
    @if (!dismissed()) {
      <aside
        class="curtain"
        [class.exit]="exiting()"
        role="status"
        aria-live="polite"
        aria-label="Caricamento"
      >
        <!-- Canvas dei mattoni virtuali -->
        <canvas #canvas class="brick-canvas" aria-hidden="true"></canvas>

        <!-- Bagliore centrale dietro il logo -->
        <div class="ambient-glow" aria-hidden="true"></div>

        <!-- Solo Logo e Brand essenziali (senza claim) -->
        <div class="brand">
          <cf-logo class="logo" tone="dark" />
          <span class="name">Childhood <strong>Friendship</strong></span>
        </div>
      </aside>
    }
  `,
  styles: `
    :host { display: contents; }

    .curtain {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #0A0414;
      color: #F6F1FF;
      display: grid;
      place-items: center;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      contain: strict;
      transition: transform 0.55s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.4s ease;
      will-change: transform, opacity;
    }

    .curtain.exit {
      transform: translateY(-100%);
      opacity: 0.96;
    }

    .brick-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      display: block;
      transform: translateZ(0);
      will-change: contents;
    }

    .ambient-glow {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(10, 4, 20, 0) 70%);
      filter: blur(50px);
      pointer-events: none;
      transform: translateZ(0);
      animation: pulse 2.2s ease-in-out infinite alternate;
    }

    .brand {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      pointer-events: none;
      text-align: center;
      padding: 1.5rem;
      transform: translateZ(0);
    }

    .logo {
      width: 4.5rem;
      height: 4.5rem;
      filter: drop-shadow(0 0 28px rgba(167, 139, 250, 0.85));
      animation: breathe 2.4s ease-in-out infinite;
    }

    .name {
      font-family: var(--cf-display, sans-serif);
      font-size: 1.45rem;
      letter-spacing: -0.01em;
      color: rgba(246, 241, 255, 0.98);
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.85);
    }
    .name strong {
      color: #C4B5FD;
      font-weight: 700;
    }

    @keyframes breathe {
      0%, 100% { transform: scale(0.97); }
      50% { transform: scale(1.04); }
    }

    @keyframes pulse {
      0% { transform: scale(0.88); opacity: 0.55; }
      100% { transform: scale(1.12); opacity: 0.85; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PreloaderComponent {
  readonly done = output<void>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  protected readonly exiting = signal(false);
  protected readonly dismissed = signal(false);

  private readySignaled = false;
  private wallComplete = false;
  private exitStarted = false;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      let animId: number;
      let width = window.innerWidth;
      let height = window.innerHeight;
      // Per massima fluidità (60/120fps su mobile), limitiamo il dpr a max 1.5
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      // Dimensioni reattive dei mattoni
      const isMobile = width < 768;
      const targetW = isMobile ? 65 : 105;
      const targetH = isMobile ? 32 : 44;
      const gap = 3;

      const cols = Math.ceil(width / targetW) + 1;
      const rows = Math.ceil(height / targetH) + 1;
      const brickW = (width + targetW) / cols - gap;
      const brickH = height / rows - gap;

      const bricks: Brick[] = [];
      const startTimeApp = performance.now();
      // Velocità potenziata: il muro si costruisce in soli 750ms
      const buildDuration = 750;

      // Costruzione matrice dal basso verso l'alto
      for (let r = 0; r < rows; r++) {
        const rowFromBottom = rows - 1 - r;
        const rowOffset = (r % 2 === 0) ? 0 : -brickW / 2;

        for (let c = 0; c < cols; c++) {
          const finalX = c * (brickW + gap) + rowOffset;
          const finalY = r * (brickH + gap);

          const rowNorm = rowFromBottom / Math.max(1, rows - 1);
          const jitter = (Math.random() - 0.5) * 80;
          const brickStartTime = 50 + rowNorm * (buildDuration - 200) + jitter;

          bricks.push({
            col: c,
            row: r,
            x: finalX,
            y: finalY,
            width: brickW,
            height: brickH,
            startY: -80 - Math.random() * (height * 0.6),
            currentY: -100,
            currentAlpha: 0,
            startTime: Math.max(20, brickStartTime),
            duration: 170 + Math.random() * 60, // Caduta rapida
            landed: false,
            impactFlash: 0
          });
        }
      }

      // Easing rapido e scattante
      const easeOutQuad = (x: number): number => 1 - (1 - x) * (1 - x);

      let completionTime = 0;

      const render = (time: number) => {
        const elapsed = time - startTimeApp;

        // Pulizia rapida sfondo scuro
        ctx.fillStyle = '#0A0414';
        ctx.fillRect(0, 0, width, height);

        let unlandedCount = 0;

        for (let i = 0; i < bricks.length; i++) {
          const b = bricks[i];

          if (elapsed < b.startTime) {
            unlandedCount++;
            continue;
          }

          const progress = Math.min(1, (elapsed - b.startTime) / b.duration);

          if (progress < 1) {
            unlandedCount++;
            const eased = easeOutQuad(progress);
            b.currentY = b.startY + (b.y - b.startY) * eased;
            b.currentAlpha = Math.min(0.35, progress * 0.4);
          } else {
            b.currentY = b.y;
            if (!b.landed) {
              b.landed = true;
              b.impactFlash = 1.0;
            }
            if (b.impactFlash > 0) {
              b.impactFlash -= 0.08;
              if (b.impactFlash < 0) b.impactFlash = 0;
            }
            b.currentAlpha = 0.26;
          }

          // Disegno ottimizzato senza save/restore ripetuti
          // 1. Corpo del mattone semitrasparente
          ctx.fillStyle = `rgba(32, 14, 68, ${b.currentAlpha * 0.85})`;
          ctx.fillRect(b.x, b.currentY, b.width, b.height);

          // 2. Bordo neon
          if (b.impactFlash > 0.05) {
            ctx.strokeStyle = `rgba(225, 200, 255, ${b.impactFlash * 0.95})`;
            ctx.lineWidth = 1.6;
          } else {
            ctx.strokeStyle = `rgba(167, 139, 250, ${b.currentAlpha * 0.85})`;
            ctx.lineWidth = 1;
          }
          ctx.strokeRect(b.x, b.currentY, b.width, b.height);

          // 3. Linea riflesso superiore per effetto vetro
          ctx.strokeStyle = `rgba(255, 255, 255, ${b.currentAlpha * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(b.x + 2, b.currentY + 1);
          ctx.lineTo(b.x + b.width - 2, b.currentY + 1);
          ctx.stroke();
        }

        // Parete completata
        if (unlandedCount === 0 && !this.wallComplete) {
          this.wallComplete = true;
          completionTime = time;
          this.checkAndFinish();
        }

        // Lampo neon finale rapido (180ms)
        if (this.wallComplete && completionTime > 0) {
          const compElapsed = time - completionTime;
          if (compElapsed < 220) {
            const wave = Math.sin((compElapsed / 220) * Math.PI);
            ctx.fillStyle = `rgba(139, 92, 246, ${wave * 0.22})`;
            ctx.fillRect(0, 0, width, height);
          }
        }

        if (!this.dismissed()) {
          animId = requestAnimationFrame(render);
        }
      };

      animId = requestAnimationFrame(render);

      // Timeout di sicurezza ridotto a 1.6 secondi
      const safety = setTimeout(() => {
        this.markReady();
      }, 1600);

      destroyRef.onDestroy(() => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animId);
        clearTimeout(safety);
      });
    });
  }

  markReady(): void {
    this.readySignaled = true;
    this.checkAndFinish();
  }

  private checkAndFinish(): void {
    if (this.exitStarted) return;
    if (this.wallComplete && (this.readySignaled || true)) {
      this.exitStarted = true;
      // Pausa brevissima (appena 100ms) dopo il completamento per scatto immediato
      setTimeout(() => {
        this.exiting.set(true);
        setTimeout(() => {
          this.dismissed.set(true);
          this.done.emit();
        }, 560);
      }, 110);
    }
  }
}
