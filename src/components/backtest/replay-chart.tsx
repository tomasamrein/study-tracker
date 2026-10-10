"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/backtest/candles";
import type { LinePoint } from "@/lib/backtest/indicators";
import { toLocal } from "@/lib/backtest/time";
import { ZonesPrimitive, type Box, type Ray } from "./zones-primitive";

export interface ChartColors {
  up: string;
  down: string;
  wickUp: string;
  wickDown: string;
  background: string;
  text: string;
  grid: boolean;
  gridColor: string;
}

export interface IndicatorLine {
  id: string;
  color: string;
  width: number;
  points: LinePoint[];
}

export interface ChartPriceLine {
  id: string;
  price: number;
  color: string;
  title: string;
  draggable?: boolean;
  dashed?: boolean;
}

export interface ChartMarker {
  time: number;
  above: boolean;
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle";
  text?: string;
}

export type DrawTool = "none" | "hline" | "rect";

export interface DrawResult {
  kind: "hline" | "rect";
  price: number;
  price2?: number;
  time?: number;
  time2?: number;
}

interface Props {
  bars: Candle[];
  tfSec: number;
  tz: string;
  colors: ChartColors;
  lines: IndicatorLine[];
  boxes: Box[];
  rays: Ray[];
  priceLines: ChartPriceLine[];
  markers: ChartMarker[];
  tool: DrawTool;
  /** Cambia cuando se cargan datos nuevos o se cambia de timeframe: re-encuadra. */
  resetKey: string;
  onLineDrag: (id: string, price: number) => void;
  onDraw: (d: DrawResult) => void;
}

const ts = (t: number) => t as UTCTimestamp;
/** Redondea al tick de NQ/ES (0,25). */
const tick = (p: number) => Math.round(p * 4) / 4;

/** Pasa cajas y rayos (en tiempo real) al primitive, convertidos a la zona del gráfico. */
function renderZones(z: ZonesPrimitive | null, cur: Props, times: number[], preview: Box | null) {
  if (!z) return;
  const boxes = cur.boxes.map((b) => ({ ...b, from: toLocal(cur.tz, b.from), to: b.to == null ? null : toLocal(cur.tz, b.to) }));
  if (preview) boxes.push(preview);
  const rays = cur.rays.map((r) => ({ ...r, from: toLocal(cur.tz, r.from) }));
  z.set(times, cur.tfSec, boxes, rays);
}

export function ReplayChart(p: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const zonesRef = useRef<ZonesPrimitive | null>(null);
  const lineSeries = useRef(new Map<string, { s: ISeriesApi<"Line">; len: number; first: number; key: string }>());
  const priceLineRefs = useRef(new Map<string, { line: IPriceLine; def: ChartPriceLine }>());
  const prev = useRef({ key: "", len: 0, first: 0 });
  const localTimes = useRef<number[]>([]);
  const realTimes = useRef<number[]>([]);
  const props = useRef(p);
  useEffect(() => {
    props.current = p;
  });
  const drag = useRef<{ id: string } | null>(null);
  const anchor = useRef<{ time: number; price: number } | null>(null);
  const preview = useRef<Box | null>(null);

  // ---- Crear el gráfico una vez ----
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: p.colors.background }, textColor: p.colors.text, fontFamily: "Geist Mono, ui-monospace, monospace", attributionLogo: true },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 12, shiftVisibleRangeOnNewBar: true },
      grid: { vertLines: { visible: p.colors.grid, color: p.colors.gridColor }, horzLines: { visible: p.colors.grid, color: p.colors.gridColor } },
      localization: { locale: "es-AR" },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: p.colors.up,
      downColor: p.colors.down,
      borderUpColor: p.colors.up,
      borderDownColor: p.colors.down,
      wickUpColor: p.colors.wickUp,
      wickDownColor: p.colors.wickDown,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: true,
    });
    const zones = new ZonesPrimitive();
    series.attachPrimitive(zones);
    chartRef.current = chart;
    seriesRef.current = series;
    zonesRef.current = zones;
    markersRef.current = createSeriesMarkers(series, []);

    // Tiempo real (UTC) a partir de una coordenada x.
    const timeAtX = (x: number): number | null => {
      const logical = chart.timeScale().coordinateToLogical(x);
      const times = realTimes.current;
      if (logical == null || !times.length) return null;
      const i = Math.round(logical as number);
      const tf = props.current.tfSec;
      if (i < 0) return times[0] + i * tf;
      if (i >= times.length) return times[times.length - 1] + (i - times.length + 1) * tf;
      return times[i];
    };

    // ---- Arrastre de líneas (stop, objetivo, órdenes, líneas horizontales) ----
    const hit = (y: number) => {
      for (const [id, { def }] of priceLineRefs.current) {
        if (!def.draggable) continue;
        const ly = series.priceToCoordinate(def.price);
        if (ly != null && Math.abs(ly - y) <= 6) return id;
      }
      return null;
    };
    const rectY = (e: PointerEvent) => e.clientY - el.getBoundingClientRect().top;
    const onDown = (e: PointerEvent) => {
      if (props.current.tool !== "none") return;
      const id = hit(rectY(e));
      if (!id) return;
      e.stopPropagation();
      e.preventDefault();
      drag.current = { id };
      chart.applyOptions({ handleScroll: false, handleScale: false });
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const y = rectY(e);
      if (drag.current) {
        const price = series.coordinateToPrice(y);
        const ref = priceLineRefs.current.get(drag.current.id);
        if (price != null && ref) {
          ref.def = { ...ref.def, price: price as number };
          ref.line.applyOptions({ price: price as number });
        }
        return;
      }
      if (props.current.tool === "none") el.style.cursor = hit(y) ? "ns-resize" : "";
    };
    const onUp = (e: PointerEvent) => {
      if (!drag.current) return;
      const id = drag.current.id;
      drag.current = null;
      chart.applyOptions({ handleScroll: true, handleScale: true });
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
      const ref = priceLineRefs.current.get(id);
      if (ref) props.current.onLineDrag(id, tick(ref.def.price));
    };
    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);

    // ---- Herramientas de dibujo ----
    const onClick = (param: { point?: { x: number; y: number } }) => {
      const tool = props.current.tool;
      if (tool === "none" || !param.point) return;
      const price = series.coordinateToPrice(param.point.y) as number | null;
      if (price == null) return;
      const rounded = tick(price);
      if (tool === "hline") {
        props.current.onDraw({ kind: "hline", price: rounded });
        return;
      }
      const t = timeAtX(param.point.x);
      if (t == null) return;
      if (!anchor.current) {
        anchor.current = { time: t, price: rounded };
        return;
      }
      const a = anchor.current;
      anchor.current = null;
      preview.current = null;
      props.current.onDraw({ kind: "rect", price: a.price, price2: rounded, time: Math.min(a.time, t), time2: Math.max(a.time, t) });
    };
    const onCross = (param: { point?: { x: number; y: number } }) => {
      if (!anchor.current || !param.point || props.current.tool !== "rect") return;
      const price = series.coordinateToPrice(param.point.y) as number | null;
      const t = timeAtX(param.point.x);
      if (price == null || t == null) return;
      const a = anchor.current;
      const tz = props.current.tz;
      preview.current = {
        id: "preview",
        from: toLocal(tz, Math.min(a.time, t)),
        to: toLocal(tz, Math.max(a.time, t)),
        top: Math.max(a.price, price),
        bottom: Math.min(a.price, price),
        fill: "rgba(120,120,120,0.15)",
        border: "rgba(120,120,120,0.8)",
        dashed: true,
      };
      renderZones(zones, props.current, localTimes.current, preview.current);
    };
    chart.subscribeClick(onClick);
    chart.subscribeCrosshairMove(onCross);

    const lineMap = lineSeries.current;
    const priceMap = priceLineRefs.current;
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      chart.unsubscribeClick(onClick);
      chart.unsubscribeCrosshairMove(onCross);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lineMap.clear();
      priceMap.clear();
      prev.current = { key: "", len: 0, first: 0 };
    };
    // Se crea una sola vez; los cambios de opciones van en otros efectos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Colores / opciones visuales ----
  useEffect(() => {
    const c = p.colors;
    chartRef.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: c.background }, textColor: c.text },
      grid: { vertLines: { visible: c.grid, color: c.gridColor }, horzLines: { visible: c.grid, color: c.gridColor } },
    });
    seriesRef.current?.applyOptions({
      upColor: c.up,
      downColor: c.down,
      borderUpColor: c.up,
      borderDownColor: c.down,
      wickUpColor: c.wickUp,
      wickDownColor: c.wickDown,
    });
  }, [p.colors]);

  // ---- Velas ----
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    const bars = p.bars;
    const key = `${p.resetKey}|${p.tz}`;
    const pv = prev.current;
    const first = bars[0]?.time ?? 0;
    const mk = (b: Candle) => ({ time: ts(toLocal(p.tz, b.time)), open: b.open, high: b.high, low: b.low, close: b.close });
    const incremental = pv.key === key && pv.first === first && bars.length >= pv.len && bars.length - pv.len <= 1 && pv.len > 0;
    if (incremental) {
      if (bars.length) series.update(mk(bars[bars.length - 1]));
      if (bars.length > pv.len) {
        localTimes.current.push(toLocal(p.tz, bars[bars.length - 1].time));
        realTimes.current.push(bars[bars.length - 1].time);
      }
    } else {
      series.setData(bars.map(mk));
      localTimes.current = bars.map((b) => toLocal(p.tz, b.time));
      realTimes.current = bars.map((b) => b.time);
      if (pv.key !== key) {
        // Encuadre tipo TradingView: ~120 velas visibles, con aire a la derecha.
        const n = bars.length;
        if (n) chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 120), to: n + 12 });
      }
    }
    prev.current = { key, len: bars.length, first };
  }, [p.bars, p.resetKey, p.tz]);

  // ---- Indicadores de línea ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const map = lineSeries.current;
    const wanted = new Set(p.lines.map((l) => l.id));
    for (const [id, v] of map) {
      if (!wanted.has(id)) {
        chart.removeSeries(v.s);
        map.delete(id);
      }
    }
    for (const l of p.lines) {
      let entry = map.get(l.id);
      if (!entry) {
        const s = chart.addSeries(LineSeries, { color: l.color, lineWidth: l.width as 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        entry = { s, len: 0, first: -1, key: "" };
        map.set(l.id, entry);
      } else {
        entry.s.applyOptions({ color: l.color, lineWidth: l.width as 1 });
      }
      const pts = l.points;
      const first = pts[0]?.time ?? 0;
      const mk = (x: LinePoint) => ({ time: ts(toLocal(p.tz, x.time)), value: x.value });
      const key = `${p.resetKey}|${p.tz}`;
      if (entry.key === key && entry.first === first && pts.length >= entry.len && pts.length - entry.len <= 1 && entry.len > 0) {
        if (pts.length) entry.s.update(mk(pts[pts.length - 1]));
      } else {
        entry.s.setData(pts.map(mk));
      }
      entry.len = pts.length;
      entry.first = first;
      entry.key = key;
    }
  }, [p.lines, p.tz, p.resetKey]);

  // ---- Cajas y rayos ----
  useEffect(() => {
    renderZones(zonesRef.current, p, localTimes.current, preview.current);
  }, [p]);

  // Al cambiar de herramienta se descarta un rectángulo a medias.
  useEffect(() => {
    anchor.current = null;
    preview.current = null;
    if (wrap.current) wrap.current.style.cursor = p.tool === "none" ? "" : "crosshair";
  }, [p.tool]);

  // ---- Líneas de precio (posición, órdenes, dibujos) ----
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const map = priceLineRefs.current;
    const wanted = new Map(p.priceLines.map((l) => [l.id, l]));
    for (const [id, v] of map) {
      if (!wanted.has(id)) {
        series.removePriceLine(v.line);
        map.delete(id);
      }
    }
    for (const def of p.priceLines) {
      if (drag.current?.id === def.id) continue;
      const opts = {
        price: def.price,
        color: def.color,
        title: def.title,
        lineWidth: 1 as const,
        lineStyle: def.dashed ? LineStyle.Dashed : LineStyle.Solid,
        axisLabelVisible: true,
      };
      const ex = map.get(def.id);
      if (ex) {
        ex.line.applyOptions(opts);
        ex.def = def;
      } else {
        map.set(def.id, { line: series.createPriceLine(opts), def });
      }
    }
  }, [p.priceLines]);

  // ---- Marcadores de entradas y salidas ----
  useEffect(() => {
    const m: SeriesMarker<Time>[] = p.markers
      .map((x) => ({
        time: ts(toLocal(p.tz, x.time)),
        position: x.above ? ("aboveBar" as const) : ("belowBar" as const),
        color: x.color,
        shape: x.shape,
        text: x.text,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
    markersRef.current?.setMarkers(m);
  }, [p.markers, p.tz]);

  return <div ref={wrap} className="h-full w-full touch-none select-none" />;
}
