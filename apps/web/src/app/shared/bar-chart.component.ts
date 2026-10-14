import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartSeries { name: string; color: string; values: number[]; }

const W = 600;
const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

/** Istogramma SVG (singolo o impilato), senza librerie: compatibile con la CSP e leggero. */
@Component({
  selector: 'cf-bar-chart',
  template: `
    @if (series().length > 1) {
      <ul class="legend" aria-hidden="true">
        @for (s of series(); track s.name) { <li><span class="sw" [style.background]="s.color"></span>{{ s.name }}</li> }
      </ul>
    }
    <div class="wrap">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + height()" role="img" [attr.aria-label]="label()">
        @for (t of ticks(); track t) {
          <line class="grid" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="y(t)" [attr.y2]="y(t)" />
          <text class="tick" [attr.x]="PAD.left - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ format()(t) }}</text>
        }
        @for (b of bars(); track b.i) {
          @for (seg of b.segs; track seg.name) { <path [attr.d]="seg.d" [attr.fill]="seg.color" /> }
          @if (showLabels() && b.total > 0) {
            <text class="val" [attr.x]="b.cx" [attr.y]="y(b.total) - 6" text-anchor="middle">{{ format()(b.total) }}</text>
          }
          @if (b.showX) { <text class="tick" [attr.x]="b.cx" [attr.y]="height() - 8" text-anchor="middle">{{ labels()[b.i] }}</text> }
          <rect class="hit" [attr.x]="b.x0" [attr.y]="PAD.top" [attr.width]="b.band" [attr.height]="plotH()"
                (mouseenter)="hover.set(b.i)" (mouseleave)="hover.set(null)" />
        }
        <line class="axis" [attr.x1]="PAD.left" [attr.x2]="W - PAD.right" [attr.y1]="y(0)" [attr.y2]="y(0)" />
      </svg>
      @if (hover() !== null) {
        @let i = hover()!;
        <div class="tip" [style.left.%]="tipX(i)">
          <strong>{{ labels()[i] }}</strong>
          @for (s of series(); track s.name) {
            <span><i class="sw" [style.background]="s.color"></i>{{ s.name }} <b>{{ format()(s.values[i] ?? 0) }}</b></span>
          }
        </div>
      }
    </div>
    <table class="sr-only">
      <caption>{{ label() }}</caption>
      <tr><th>Periodo</th>@for (s of series(); track s.name) { <th>{{ s.name }}</th> }</tr>
      @for (l of labels(); track $index) {
        <tr><td>{{ l }}</td>@for (s of series(); track s.name) { <td>{{ format()(s.values[$index] ?? 0) }}</td> }</tr>
      }
    </table>
  `,
  styles: `
    :host { display: block; }
    .wrap { position: relative; }
    svg { width: 100%; height: auto; display: block; overflow: visible; }
    .grid { stroke: var(--cf-color-border); stroke-width: 1; opacity: .45; }
    .axis { stroke: var(--cf-color-border); stroke-width: 1; }
    .tick { fill: var(--cf-color-text-muted); font-size: 11px; }
    .val { fill: var(--cf-color-text); font-size: 11px; font-weight: 600; }
    .hit { fill: transparent; cursor: default; }
    .hit:hover { fill: rgba(255, 255, 255, .04); }
    .legend { display: flex; gap: 16px; list-style: none; margin: 0 0 8px; padding: 0; font-size: .8rem; color: var(--cf-color-text-muted); }
    .legend li { display: flex; align-items: center; gap: 6px; }
    .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
    .legend .sw { margin-right: 0; }
    .tip { position: absolute; top: 0; transform: translateX(-50%); pointer-events: none; background: var(--cf-color-surface-raised);
      border: 1px solid var(--cf-color-border); border-radius: 8px; padding: 8px 10px; font-size: .78rem; display: grid; gap: 3px;
      white-space: nowrap; box-shadow: 0 6px 20px rgba(0, 0, 0, .35); z-index: 2; }
    .tip span { color: var(--cf-color-text-muted); } .tip b { color: var(--cf-color-text); margin-left: 4px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarChartComponent {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly label = input<string>('Grafico');
  readonly height = input<number>(200);
  readonly showLabels = input<boolean>(false);
  readonly format = input<(v: number) => string>((v) => String(Math.round(v)));

  protected readonly W = W;
  protected readonly PAD = PAD;
  protected readonly hover = signal<number | null>(null);

  protected readonly plotH = computed(() => this.height() - PAD.top - PAD.bottom);
  private readonly totals = computed(() => this.labels().map((_, i) => this.series().reduce((a, s) => a + (s.values[i] ?? 0), 0)));
  private readonly max = computed(() => niceMax(Math.max(0, ...this.totals())));
  protected readonly ticks = computed(() => { const m = this.max(); return [0, m / 2, m]; });

  protected y(v: number): number { return PAD.top + this.plotH() - (v / this.max()) * this.plotH(); }

  protected readonly bars = computed(() => {
    const n = this.labels().length;
    const band = (W - PAD.left - PAD.right) / Math.max(n, 1);
    const bw = Math.min(band * 0.62, 44);
    const step = n > 8 ? 2 : 1;
    return this.labels().map((_, i) => {
      const x0 = PAD.left + i * band;
      const x = x0 + (band - bw) / 2;
      let acc = 0;
      const active = this.series().filter((s) => (s.values[i] ?? 0) > 0);
      const segs = active.map((s, k) => {
        const v = s.values[i] ?? 0;
        const yBottom = this.y(acc) - (k > 0 ? 2 : 0); // 2px di stacco tra segmenti
        acc += v;
        const yTop = this.y(acc);
        return { name: s.name, color: s.color, d: barPath(x, yTop, bw, Math.max(yBottom - yTop, 1), k === active.length - 1) };
      });
      return { i, x0, band, cx: x + bw / 2, segs, total: this.totals()[i] ?? 0, showX: (n - 1 - i) % step === 0 };
    });
  });

  protected tipX(i: number): number {
    const b = this.bars()[i];
    const pct = b ? (b.cx / W) * 100 : 50;
    return Math.min(85, Math.max(15, pct));
  }
}

/** Barra con angoli superiori arrotondati (4px) e base piatta sull'asse. */
function barPath(x: number, y: number, w: number, h: number, roundTop: boolean): string {
  const r = roundTop ? Math.min(4, w / 2, h) : 0;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function niceMax(v: number): number {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : 10;
  return Math.max(nice * p, v <= 4 ? 4 : 0);
}
