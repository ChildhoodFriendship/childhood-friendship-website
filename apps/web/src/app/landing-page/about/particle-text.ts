/**
 * Testo a particelle: rasterizza le righe di un titolo, le fa "materializzare" quando entra in vista
 * e le sparpaglia sotto il puntatore; a riposo le particelle cedono il posto al testo vero (nitido e accessibile).
 */
export class ParticleText {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pad = 90;
  private hx = new Float32Array(0); private hy = new Float32Array(0);
  private px = new Float32Array(0); private py = new Float32Array(0);
  private vx = new Float32Array(0); private vy = new Float32Array(0);
  private delay = new Float32Array(0);
  private col = new Uint8Array(0);
  private colors: string[] = [];
  private size = 3;
  private n = 0;
  private raf = 0;
  private bornAt = -1;
  private last = 0;
  private solid = 0;
  private readonly mouse = { x: -1e4, y: -1e4, in: false };
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  private visible = false;
  private disposed = false;

  constructor(private readonly title: HTMLElement, private readonly canvas: HTMLCanvasElement, private readonly area: HTMLElement) {
    this.ctx = canvas.getContext('2d')!;
    title.classList.add('fx-on');
    let t: ReturnType<typeof setTimeout> | undefined;
    this.ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => this.build(), 120); });
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible && this.bornAt < 0 && e.intersectionRatio > 0.35) this.bornAt = performance.now();
      if (this.visible) this.wake();
    }, { threshold: [0, 0.35, 0.6] });
    area.addEventListener('pointermove', this.onMove);
    area.addEventListener('pointerleave', this.onLeave);
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (this.disposed) return;
      this.build();
      this.ro.observe(title);
      this.io.observe(title);
    });
  }

  private readonly onMove = (e: PointerEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.in = this.mouse.x > this.pad * 0.5 && this.mouse.y > this.pad * 0.5 && this.mouse.x < r.width - this.pad * 0.5 && this.mouse.y < r.height - this.pad * 0.5;
    if (this.mouse.in) this.wake();
  };
  private readonly onLeave = (): void => { this.mouse.in = false; this.mouse.x = this.mouse.y = -1e4; };

  /** Campiona le righe del titolo (posizione, colore e metrica presi dal DOM). */
  private build(): void {
    const rect = this.title.getBoundingClientRect();
    if (rect.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.ceil(rect.width + this.pad * 2), H = Math.ceil(rect.height + this.pad * 2);
    Object.assign(this.canvas.style, { left: `${-this.pad}px`, top: `${-this.pad}px`, width: `${W}px`, height: `${H}px` });
    this.canvas.width = W * dpr; this.canvas.height = H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    const lines = Array.from(this.title.querySelectorAll<HTMLElement>('.ln > span'));
    const colors: string[] = [];
    const lineCol: number[] = [];
    let fs = 60;
    for (const sp of lines) {
      const cs = getComputedStyle(sp);
      const r = sp.getBoundingClientRect();
      fs = parseFloat(cs.fontSize);
      o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      (o as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'condensed';
      o.textBaseline = 'alphabetic';
      const text = sp.textContent ?? '';
      const m = o.measureText(text);
      const asc = m.fontBoundingBoxAscent ?? fs * 0.8, desc = m.fontBoundingBoxDescent ?? fs * 0.2;
      const lh = parseFloat(cs.lineHeight) || fs * 0.9;
      // baseline come la calcola il CSS: metà dell'interlinea sopra il box del font
      const top = r.top - rect.top + this.pad;
      const base = top + (lh - (asc + desc)) / 2 + asc;
      let ci = colors.indexOf(cs.color);
      if (ci < 0) { colors.push(cs.color); ci = colors.length - 1; }
      lineCol.push(ci);
      o.save();
      o.translate(r.left - rect.left + this.pad, 0);
      o.scale(m.width ? r.width / m.width : 1, 1);
      o.fillStyle = `rgb(${ci + 1}, 0, 0)`; // il canale rosso porta l'indice del colore
      o.fillText(text, 0, base);
      o.restore();
    }
    this.colors = colors;
    const step = Math.max(3, Math.round(fs / 24));
    this.size = step * 0.82;
    const data = o.getImageData(0, 0, W, H).data;
    const hx: number[] = [], hy: number[] = [], col: number[] = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4;
        if (data[i + 3] > 140) { hx.push(x); hy.push(y); col.push(Math.max(0, data[i] - 1)); }
      }
    }
    const reborn = this.n > 0;
    this.n = hx.length;
    this.hx = Float32Array.from(hx); this.hy = Float32Array.from(hy);
    this.col = Uint8Array.from(col.map((c) => Math.min(c, colors.length - 1)));
    this.px = new Float32Array(this.n); this.py = new Float32Array(this.n);
    this.vx = new Float32Array(this.n); this.vy = new Float32Array(this.n);
    this.delay = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      if (reborn) { this.px[i] = this.hx[i]; this.py[i] = this.hy[i]; continue; }
      // partenza: nuvola sparsa attorno alla riga, ritardo che corre da sinistra a destra
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 380;
      this.px[i] = this.hx[i] + Math.cos(a) * d;
      this.py[i] = this.hy[i] + Math.sin(a) * d * 0.6;
      this.delay[i] = (this.hx[i] / W) * 650 + Math.random() * 450;
    }
    if (reborn) this.solid = 1;
    this.wake();
  }

  private wake(): void {
    if (this.raf || this.disposed || !this.n) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    this.raf = 0;
    const dt = Math.min(2.5, (now - this.last) / 16.67); // in frame da 60 Hz
    this.last = now;
    const born = this.bornAt >= 0 ? now - this.bornAt : -1;
    const { hx, hy, px, py, vx, vy, delay } = this;
    const mx = this.mouse.x, my = this.mouse.y, R = 140, R2 = R * R;
    const spring = 0.045 * dt, damp = Math.pow(0.84, dt);
    let moving = 0;
    for (let i = 0; i < this.n; i++) {
      if (born < delay[i]) { moving++; continue; }
      let ax = (hx[i] - px[i]) * spring, ay = (hy[i] - py[i]) * spring;
      if (this.mouse.in) {
        const dx = px[i] - mx, dy = py[i] - my, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / R);
          const k = f * f * 12 * dt;
          ax += (dx / d) * k + (Math.random() - 0.5) * k * 1.2;
          ay += (dy / d) * k + (Math.random() - 0.5) * k * 1.2;
        }
      }
      vx[i] = (vx[i] + ax) * damp; vy[i] = (vy[i] + ay) * damp;
      px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      if (Math.abs(hx[i] - px[i]) + Math.abs(hy[i] - py[i]) > 0.6 || Math.abs(vx[i]) + Math.abs(vy[i]) > 0.05) moving++;
    }
    // a riposo il testo vero prende il posto delle particelle (nitido); appena si muovono, torna la polvere
    const target = born >= 0 && moving < this.n * 0.004 ? 1 : 0;
    this.solid += (target - this.solid) * (target ? 0.08 : 0.35) * dt;
    if (target && this.solid > 0.995) this.solid = 1;
    this.title.style.setProperty('--solid', this.solid.toFixed(3));
    this.draw(born);
    const busy = born < 0 ? this.visible && this.bornAt < 0 : moving > 0 || this.solid < 1 || this.mouse.in;
    if (busy && this.visible) this.raf = requestAnimationFrame(this.frame);
  };

  private draw(born: number): void {
    const c = this.ctx, s = this.size;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (born < 0) return;
    c.globalAlpha = 1 - this.solid;
    for (let ci = 0; ci < this.colors.length; ci++) {
      c.fillStyle = this.colors[ci];
      for (let i = 0; i < this.n; i++) {
        if (this.col[i] !== ci || born < this.delay[i]) continue;
        c.fillRect(this.px[i] - s / 2, this.py[i] - s / 2, s, s);
      }
    }
    c.globalAlpha = 1;
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.area.removeEventListener('pointermove', this.onMove);
    this.area.removeEventListener('pointerleave', this.onLeave);
    this.title.classList.remove('fx-on');
  }
}
