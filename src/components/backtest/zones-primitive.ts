import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

/** Caja a dibujar. Los tiempos son los del eje del gráfico (ya desplazados a la zona horaria). */
export interface Box {
  id: string;
  from: number;
  /** null = se extiende hasta el borde derecho. */
  to: number | null;
  top: number;
  bottom: number;
  fill: string;
  border?: string;
  label?: string;
  labelColor?: string;
  dashed?: boolean;
}

/** Línea horizontal desde un tiempo hacia la derecha (PDH, apertura de medianoche…). */
export interface Ray {
  id: string;
  from: number;
  price: number;
  color: string;
  label?: string;
  dashed?: boolean;
}

interface Ctx {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  times: number[];
  tfSec: number;
}

/** x de un tiempo usando índices lógicos (funciona aunque el tiempo no sea una vela exacta). */
function xOf(ctx: Ctx, t: number): number | null {
  const { times, chart, tfSec } = ctx;
  if (!times.length) return null;
  let lo = 0, hi = times.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  let logical: number;
  if (idx < 0) logical = (t - times[0]) / tfSec;
  else if (idx === times.length - 1) logical = idx + (t - times[idx]) / tfSec;
  else logical = idx + (t - times[idx]) / Math.max(1, times[idx + 1] - times[idx]);
  const x = chart.timeScale().logicalToCoordinate(logical as never);
  return x == null ? null : (x as number);
}

class Renderer implements IPrimitivePaneRenderer {
  constructor(private ctx: Ctx | null, private boxes: Box[], private rays: Ray[]) {}
  draw(target: CanvasRenderingTarget2D) {
    const ctx = this.ctx;
    if (!ctx) return;
    target.useMediaCoordinateSpace(({ context: g, mediaSize }) => {
      const w = mediaSize.width;
      g.font = "10px Geist Mono, ui-monospace, monospace";
      for (const b of this.boxes) {
        const x1 = xOf(ctx, b.from);
        const x2 = b.to == null ? w : xOf(ctx, b.to);
        const y1 = ctx.series.priceToCoordinate(b.top);
        const y2 = ctx.series.priceToCoordinate(b.bottom);
        if (x1 == null || x2 == null || y1 == null || y2 == null) continue;
        const left = Math.min(x1, x2);
        const right = b.to == null ? w : Math.max(x1, x2);
        if (right < 0 || left > w) continue;
        const top = Math.min(y1, y2);
        const h = Math.max(1, Math.abs(y2 - y1));
        g.fillStyle = b.fill;
        g.fillRect(left, top, right - left, h);
        if (b.border) {
          g.strokeStyle = b.border;
          g.lineWidth = 1;
          g.setLineDash(b.dashed ? [4, 3] : []);
          g.strokeRect(left + 0.5, top + 0.5, right - left - 1, h - 1);
          g.setLineDash([]);
        }
        if (b.label) {
          g.fillStyle = b.labelColor ?? b.border ?? "#888";
          g.fillText(b.label, Math.max(left, 0) + 4, top + 11);
        }
      }
      for (const r of this.rays) {
        const x = xOf(ctx, r.from);
        const y = ctx.series.priceToCoordinate(r.price);
        if (x == null || y == null) continue;
        g.strokeStyle = r.color;
        g.lineWidth = 1;
        g.setLineDash(r.dashed ? [5, 4] : []);
        g.beginPath();
        g.moveTo(Math.max(0, x), Math.round(y) + 0.5);
        g.lineTo(w, Math.round(y) + 0.5);
        g.stroke();
        g.setLineDash([]);
        if (r.label) {
          g.fillStyle = r.color;
          g.fillText(r.label, Math.max(0, x) + 4, y - 3);
        }
      }
    });
  }
}

class View implements IPrimitivePaneView {
  constructor(private owner: ZonesPrimitive) {}
  zOrder() {
    return "bottom" as const;
  }
  renderer() {
    return new Renderer(this.owner.ctx, this.owner.boxes, this.owner.rays);
  }
}

export class ZonesPrimitive implements ISeriesPrimitive<Time> {
  ctx: Ctx | null = null;
  boxes: Box[] = [];
  rays: Ray[] = [];
  private requestUpdate: (() => void) | null = null;
  private views = [new View(this)];

  attached(p: SeriesAttachedParameter<Time>) {
    this.ctx = { chart: p.chart as IChartApi, series: p.series as ISeriesApi<SeriesType>, times: [], tfSec: 60 };
    this.requestUpdate = p.requestUpdate;
  }
  detached() {
    this.ctx = null;
    this.requestUpdate = null;
  }
  paneViews() {
    return this.views;
  }
  updateAllViews() {}
  set(times: number[], tfSec: number, boxes: Box[], rays: Ray[]) {
    if (this.ctx) {
      this.ctx.times = times;
      this.ctx.tfSec = tfSec;
    }
    this.boxes = boxes;
    this.rays = rays;
    this.requestUpdate?.();
  }
}
