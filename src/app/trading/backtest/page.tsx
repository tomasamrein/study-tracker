"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronsRight,
  Minus,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Square,
  StepForward,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useTrading } from "@/lib/trading/store";
import { enrich, summarize } from "@/lib/trading/calc";
import { filterTrades } from "@/lib/trading/selectors";
import { money, pct, pnlClass, rMult } from "@/lib/trading/format";
import { aggregate, lastIndexAtOrBefore, parseCandleCsv, TIMEFRAMES, tfById } from "@/lib/backtest/candles";
import { fetchDays, marketSymbolFor } from "@/lib/backtest/data";
import { dailyLevels, ema, fvgZones, sessionZones, sma, vwap } from "@/lib/backtest/indicators";
import { backtestAccountId, BACKTEST_MODE, closedToTrade, ensureBacktestReady } from "@/lib/backtest/journal";
import { initialCore, replayReducer } from "@/lib/backtest/replay";
import {
  loadBtSettings,
  loadReplaySession,
  saveBtSettings,
  saveReplaySession,
  type BtSettings,
  type DataSource,
  type HLine,
  type Rect,
} from "@/lib/backtest/settings";
import { validateBracket } from "@/lib/backtest/sim";
import { addDays, fromLocalString, NY, toLocalString, utcDay } from "@/lib/backtest/time";
import { ReplayChart, type ChartMarker, type ChartPriceLine, type DrawResult, type DrawTool, type IndicatorLine } from "@/components/backtest/replay-chart";
import type { Box, Ray } from "@/components/backtest/zones-primitive";
import { OrderPanel, type OrderRequest } from "@/components/backtest/order-panel";
import { SettingsDialog } from "@/components/backtest/settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SourceChoice = "auto" | "futures" | "index";

const DAY = 86400;

function defaultStart(): string {
  // Ayer a las 08:00 NY (o el viernes si cae en fin de semana).
  const d = new Date(Date.now() - DAY * 1000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() - 1);
  return `${d.toISOString().slice(0, 10)}T08:00`;
}

export default function BacktestPage() {
  const trading = useTrading();
  const { state, update } = trading;
  const [settings, setSettingsState] = useState<BtSettings>(loadBtSettings);
  const saved = useMemo(() => loadReplaySession(), []);

  // ---- Configuración de la sesión ----
  const btInstruments = useMemo(() => state.instruments.filter((i) => marketSymbolFor(i.symbol)), [state.instruments]);
  const [instrumentId, setInstrumentId] = useState<string>(saved?.instrumentId ?? state.settings.defaultInstrumentId ?? "mnq");
  const [sourceChoice, setSourceChoice] = useState<SourceChoice>(saved && saved.source !== "csv" ? saved.source : "auto");
  const [start, setStart] = useState<string>(saved?.start ?? defaultStart());
  const [tf, setTf] = useState<string>(saved?.tf ?? "5m");
  const [setupId, setSetupId] = useState<string | null>(saved?.setupId ?? "ifvg");

  // ---- Datos y replay ----
  const [core, dispatch] = useReducer(replayReducer, initialCore);
  const [source, setSource] = useState<DataSource | null>(null);
  const [baseMin, setBaseMin] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hlines, setHlines] = useState<HLine[]>(saved?.hlines ?? []);
  const [rects, setRects] = useState<Rect[]>(saved?.rects ?? []);
  const savedIds = useRef<string[]>(saved?.saved ?? []);
  const [tool, setTool] = useState<DrawTool>("none");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [jumpTo, setJumpTo] = useState("09:30");
  const [nonce, setNonce] = useState(0);
  const loadedEnd = useRef<string | null>(null);
  const loadingMore = useRef(false);
  const sessionLabel = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);

  const instrument = state.instruments.find((i) => i.id === instrumentId) ?? btInstruments[0];
  const sym = instrument ? marketSymbolFor(instrument.symbol) : null;
  const tfDef = tfById(tf);
  const cur = state.settings.currency;

  const setSettings = (s: BtSettings) => {
    setSettingsState(s);
    saveBtSettings(s);
  };

  // Deja listos cuenta Backtest, ES/MES y setup iFVG (sin pisar nada).
  useEffect(() => {
    update((prev) => ensureBacktestReady(prev));
  }, [update]);

  const resolveSource = useCallback(
    (startTs: number): "futures" | "index" => {
      if (sourceChoice !== "auto") return sourceChoice;
      // El 1m de futuros solo existe para los últimos ~30 días.
      return Date.now() / 1000 - startTs < 26 * DAY ? "futures" : "index";
    },
    [sourceChoice],
  );

  // ---- Cargar sesión ----
  const load = useCallback(
    async (opts?: { resume?: boolean }) => {
      if (!sym) {
        setError("Elegí NQ/MNQ o ES/MES.");
        return;
      }
      const startTs = fromLocalString(NY, start);
      if (!Number.isFinite(startTs)) {
        setError("Fecha de inicio inválida.");
        return;
      }
      setPlaying(false);
      setLoading(true);
      setError(null);
      const src = resolveSource(startTs);
      const first = utcDay(startTs);
      const days = Array.from({ length: 9 }, (_, i) => addDays(first, i - 6));
      try {
        const m1 = await fetchDays(sym, days, src);
        if (!m1.length) {
          setError(
            src === "futures"
              ? "No hay velas de futuros para esa fecha (el 1m de futuros solo cubre los últimos ~30 días). Probá con fuente Índice."
              : "No hay datos para esa fecha. ¿Es fin de semana o feriado?",
          );
          return;
        }
        const resume = opts?.resume && saved && saved.cursor != null && saved.start === start && saved.instrumentId === instrumentId;
        let cursor = lastIndexAtOrBefore(m1, startTs - 60);
        if (resume) {
          const i = lastIndexAtOrBefore(m1, saved!.cursor!);
          if (i >= 0) cursor = i;
        }
        if (cursor < 0) cursor = 0;
        loadedEnd.current = days[days.length - 1];
        setSource(src);
        setBaseMin(1);
        sessionLabel.current = `${instrument?.symbol ?? ""} ${start.slice(0, 10)}`;
        dispatch({ type: "load", m1, cursor, sim: resume ? saved!.sim : undefined });
        if (!resume) savedIds.current = [];
        setLoadKey((k) => k + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude cargar los datos.");
      } finally {
        setLoading(false);
      }
    },
    [sym, start, resolveSource, saved, instrumentId, instrument],
  );

  // Retomar la última sesión al entrar.
  const didAutoLoad = useRef(false);
  useEffect(() => {
    if (didAutoLoad.current || !saved || saved.source === "csv") return;
    didAutoLoad.current = true;
    void load({ resume: true });
  }, [load, saved]);

  // ---- Cargar más días a medida que se avanza ----
  useEffect(() => {
    if (!sym || source === "csv" || source == null || loadingMore.current || !loadedEnd.current) return;
    if (core.cursor < core.m1.length - 240) return;
    const last = core.m1[core.m1.length - 1];
    if (last && last.time > Date.now() / 1000 - 3600) return;
    loadingMore.current = true;
    const from = loadedEnd.current;
    const days = [addDays(from, 1), addDays(from, 2), addDays(from, 3)];
    fetchDays(sym, days, source)
      .then((m) => {
        loadedEnd.current = days[days.length - 1];
        if (m.length) dispatch({ type: "append", m1: m });
      })
      .catch(() => toast.error("No pude cargar los días siguientes."))
      .finally(() => {
        loadingMore.current = false;
      });
  }, [core.cursor, core.m1, sym, source]);

  // ---- CSV propio (exportado de TradingView) ----
  const importCsv = async (file: File) => {
    const candles = parseCandleCsv(await file.text());
    if (candles.length < 10) {
      toast.error("No reconocí el CSV. Tiene que tener columnas time, open, high, low, close.");
      return;
    }
    let minGap = Infinity;
    for (let i = 1; i < Math.min(candles.length, 500); i++) minGap = Math.min(minGap, candles[i].time - candles[i - 1].time);
    const base = Math.max(1, Math.round(minGap / 60));
    const startTs = fromLocalString(NY, start);
    let cursor = lastIndexAtOrBefore(candles, startTs - 60);
    if (cursor < 0) cursor = Math.min(candles.length - 1, 100);
    loadedEnd.current = null;
    setPlaying(false);
    setSource("csv");
    setBaseMin(base);
    if (tfById(tf).minutes < base) setTf(TIMEFRAMES.find((t) => t.minutes >= base)?.id ?? "D");
    savedIds.current = [];
    sessionLabel.current = `${instrument?.symbol ?? ""} ${file.name}`;
    dispatch({ type: "load", m1: candles, cursor });
    setLoadKey((k) => k + 1);
    toast.success(`Cargué ${candles.length} velas de ${base}m.`);
  };

  // ---- Reproducción ----
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => dispatch({ type: "advance", n: 1 }), settings.speedMs);
    return () => clearInterval(id);
  }, [playing, settings.speedMs]);
  const atEnd = core.cursor >= core.m1.length - 1;
  useEffect(() => {
    if (playing && atEnd && (source === "csv" || !loadingMore.current)) {
      const t = setTimeout(() => {
        if (core.cursor >= core.m1.length - 1) setPlaying(false);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [playing, atEnd, source, core.cursor, core.m1.length]);

  const stepBase = () => dispatch({ type: "advance", n: 1 });
  const stepTf = () => dispatch({ type: "advanceBucket", minutes: Math.max(tfDef.minutes, baseMin) });
  const doJump = () => {
    const last = core.m1[core.cursor];
    if (!last) return;
    // Próxima ocurrencia de esa hora NY después del cursor.
    const today = toLocalString(NY, last.time).slice(0, 10);
    let target = fromLocalString(NY, `${today}T${jumpTo}`);
    if (target <= last.time) target = fromLocalString(NY, `${addDays(today, 1)}T${jumpTo}`);
    dispatch({ type: "advanceTo", time: target - 60 });
  };

  // ---- Atajos de teclado ----
  const keyRef = useRef({ stepBase, stepTf });
  useEffect(() => {
    keyRef.current = { stepBase, stepTf };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) keyRef.current.stepTf();
        else keyRef.current.stepBase();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Escape") setTool("none");
      else if (e.key.toLowerCase() === "h" && !e.metaKey && !e.ctrlKey) setTool((t) => (t === "hline" ? "none" : "hline"));
      else if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) setTool((t) => (t === "rect" ? "none" : "rect"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- Velas visibles e indicadores ----
  const effTfMin = Math.max(tfDef.minutes, baseMin);
  const bars = useMemo(() => (core.cursor < 0 ? [] : aggregate(core.m1, effTfMin, core.cursor + 1)), [core.m1, core.cursor, effTfMin]);
  const lastBase = core.m1[core.cursor] ?? null;
  const price = lastBase?.close ?? null;

  const lines: IndicatorLine[] = useMemo(() => {
    const out: IndicatorLine[] = [];
    for (const m of settings.mas) {
      if (!m.enabled) continue;
      out.push({ id: m.id, color: m.color, width: 1, points: m.type === "ema" ? ema(bars, m.length) : sma(bars, m.length) });
    }
    if (settings.vwap.enabled && effTfMin < 1440) out.push({ id: "vwap", color: settings.vwap.color, width: 2, points: vwap(bars) });
    return out;
  }, [bars, settings.mas, settings.vwap, effTfMin]);

  const boxes: Box[] = useMemo(() => {
    const out: Box[] = [];
    if (settings.sessionsEnabled && effTfMin <= 60) {
      for (const z of sessionZones(bars, settings.sessions)) {
        out.push({ id: z.id, from: z.from, to: z.to, top: z.top, bottom: z.bottom, fill: `${z.color}14`, border: `${z.color}66`, label: z.label, labelColor: z.color, dashed: true });
      }
    }
    if (settings.fvg.enabled) {
      const f = settings.fvg;
      for (const z of fvgZones(bars, f)) {
        const fill = z.kind === "fvg-bull" ? f.bull : z.kind === "fvg-bear" ? f.bear : z.kind === "ifvg-bull" ? f.ibull : f.ibear;
        const label = z.kind.startsWith("ifvg") ? "iFVG" : undefined;
        out.push({ id: z.id, from: z.from, to: z.to, top: z.top, bottom: z.bottom, fill, label, labelColor: "rgba(160,160,160,0.9)" });
      }
    }
    for (const r of rects) {
      out.push({ id: r.id, from: r.from, to: r.to, top: r.top, bottom: r.bottom, fill: `${r.color}22`, border: r.color });
    }
    return out;
  }, [bars, settings.sessionsEnabled, settings.sessions, settings.fvg, rects, effTfMin]);

  const rays: Ray[] = useMemo(() => {
    if (effTfMin >= 1440) return [];
    return dailyLevels(bars, settings.levels).map((l) => ({
      id: l.id,
      from: l.from,
      price: l.price,
      color: l.id === "mo" ? "#9598a1" : "#787b86",
      label: l.label,
      dashed: true,
    }));
  }, [bars, settings.levels, effTfMin]);

  // ---- Líneas de precio: posición, órdenes, dibujos ----
  const pos = core.sim.position;
  const priceLines: ChartPriceLine[] = useMemo(() => {
    const out: ChartPriceLine[] = [];
    if (pos) {
      out.push({ id: "pos", price: pos.entry, color: "#9598a1", title: `${pos.side === "long" ? "LONG" : "SHORT"} ${pos.qty}` });
      if (pos.sl != null) out.push({ id: "pos:sl", price: pos.sl, color: "#f23645", title: "SL", draggable: true });
      if (pos.tp != null) out.push({ id: "pos:tp", price: pos.tp, color: "#089981", title: "TP", draggable: true });
    }
    for (const o of core.sim.pending) {
      const label = `${o.side === "long" ? "BUY" : "SELL"} ${o.type === "limit" ? "LMT" : "STP"} ${o.qty}`;
      out.push({ id: `ord:${o.id}`, price: o.price, color: "#2962ff", title: label, draggable: true });
      if (o.sl != null) out.push({ id: `ord:${o.id}:sl`, price: o.sl, color: "#f23645", title: "SL", draggable: true, dashed: true });
      if (o.tp != null) out.push({ id: `ord:${o.id}:tp`, price: o.tp, color: "#089981", title: "TP", draggable: true, dashed: true });
    }
    for (const h of hlines) out.push({ id: `h:${h.id}`, price: h.price, color: h.color, title: "", draggable: true });
    return out;
    // `nonce` fuerza a reponer una línea si el arrastre fue inválido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, core.sim.pending, hlines, nonce]);

  const onLineDrag = (id: string, p: number) => {
    const reject = (msg: string) => {
      toast.error(msg);
      setNonce((n) => n + 1);
    };
    if (id === "pos:sl" || id === "pos:tp") {
      if (!pos) return;
      const sl = id === "pos:sl" ? p : pos.sl;
      const tp = id === "pos:tp" ? p : pos.tp;
      // El stop puede quedar del lado de la ganancia (trailing); solo el TP se valida contra el precio.
      if (id === "pos:tp" && price != null && (pos.side === "long" ? p <= price : p >= price)) return reject("El objetivo tiene que quedar a favor del precio actual.");
      if (id === "pos:sl" && price != null && (pos.side === "long" ? p >= price : p <= price)) return reject("El stop tiene que quedar del otro lado del precio actual.");
      dispatch({ type: "modifyPos", sl, tp });
      return;
    }
    if (id.startsWith("ord:")) {
      const [, oid, which] = id.split(":");
      const o = core.sim.pending.find((x) => x.id === oid);
      if (!o) return;
      const next = { price: o.price, sl: o.sl, tp: o.tp };
      if (which === "sl") next.sl = p;
      else if (which === "tp") next.tp = p;
      else {
        // Mover la orden arrastra el stop y el objetivo con ella.
        const d = p - o.price;
        next.price = p;
        next.sl = o.sl != null ? o.sl + d : null;
        next.tp = o.tp != null ? o.tp + d : null;
      }
      const err = validateBracket(o.side, next.price, next.sl, next.tp);
      if (err) return reject(err);
      dispatch({ type: "modifyPending", id: oid, ...next });
      return;
    }
    if (id.startsWith("h:")) {
      const hid = id.slice(2);
      setHlines((l) => l.map((h) => (h.id === hid ? { ...h, price: p } : h)));
    }
  };

  const onDraw = (d: DrawResult) => {
    const id = `${Date.now().toString(36)}`;
    if (d.kind === "hline") setHlines((l) => [...l, { id, price: d.price, color: "#f0b90b" }]);
    else if (d.time != null && d.time2 != null && d.price2 != null)
      setRects((l) => [...l, { id, from: d.time!, to: d.time2!, top: Math.max(d.price, d.price2!), bottom: Math.min(d.price, d.price2!), color: "#2962ff" }]);
    setTool("none");
  };

  // ---- Órdenes ----
  const onOrder = (o: OrderRequest): string | null => {
    if (!lastBase) return "Cargá una sesión primero.";
    if (o.type === "market") {
      if (pos && pos.side !== o.side) {
        dispatch({ type: "close" });
        return null;
      }
      dispatch({ type: "market", side: o.side, qty: o.qty, sl: o.sl, tp: o.tp });
      return null;
    }
    const p = o.price!;
    const cl = lastBase.close;
    if (o.type === "limit" && (o.side === "long" ? p >= cl : p <= cl)) return o.side === "long" ? "Un Buy Limit va por debajo del precio actual." : "Un Sell Limit va por encima del precio actual.";
    if (o.type === "stop" && (o.side === "long" ? p <= cl : p >= cl)) return o.side === "long" ? "Un Buy Stop va por encima del precio actual." : "Un Sell Stop va por debajo del precio actual.";
    dispatch({ type: "pending", order: { side: o.side, type: o.type, price: p, qty: o.qty, sl: o.sl, tp: o.tp } });
    return null;
  };

  // ---- Guardar trades cerrados en el diario (modo Backtest) ----
  const accountId = backtestAccountId(state);
  useEffect(() => {
    if (!accountId || !instrument) return;
    const fresh = core.sim.closed.filter((c) => !savedIds.current.includes(c.id));
    if (!fresh.length) return;
    const trades = fresh.map((c) =>
      closedToTrade(c, { state, accountId, instrumentId: instrument.id, setupId, tf, label: sessionLabel.current }),
    );
    update((prev) => ({ ...prev, trades: [...prev.trades.filter((t) => !trades.some((x) => x.id === t.id)), ...trades] }));
    savedIds.current = [...savedIds.current, ...fresh.map((c) => c.id)];
    for (const c of fresh) {
      const pnl = c.points * instrument.pointValue * c.qty - instrument.commission * c.qty;
      toast(`${c.reason === "tp" ? "Objetivo" : c.reason === "sl" ? "Stop" : c.reason === "be" ? "Breakeven" : "Cerrado"}: ${money(pnl, cur, true)}`, { description: "Guardado en el diario (Backtest)." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core.sim.closed, accountId]);

  // ---- Persistir la sesión para retomarla ----
  useEffect(() => {
    if (core.cursor < 0 || source === "csv") return;
    const t = setTimeout(() => {
      saveReplaySession({
        instrumentId,
        source: source ?? "index",
        start,
        cursor: core.m1[core.cursor]?.time ?? null,
        tf,
        hlines,
        rects,
        sim: core.sim,
        saved: savedIds.current,
        setupId,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [core.cursor, core.sim, core.m1, hlines, rects, tf, setupId, instrumentId, source, start]);

  // ---- Marcadores ----
  const markers: ChartMarker[] = useMemo(() => {
    if (!bars.length) return [];
    const snap = (t: number) => {
      const i = lastIndexAtOrBefore(bars, t);
      return i >= 0 ? bars[i].time : null;
    };
    const out: ChartMarker[] = [];
    for (const c of core.sim.closed) {
      const a = snap(c.entryAt);
      const b = snap(c.exitAt);
      const win = c.points > 0;
      if (a != null) out.push({ time: a, above: c.side === "short", color: c.side === "long" ? "#089981" : "#f23645", shape: c.side === "long" ? "arrowUp" : "arrowDown" });
      if (b != null) out.push({ time: b, above: c.side === "long", color: win ? "#089981" : "#f23645", shape: "circle", text: `${c.points > 0 ? "+" : ""}${c.points.toFixed(1)}` });
    }
    if (pos) {
      const a = snap(pos.entryAt);
      if (a != null) out.push({ time: a, above: pos.side === "short", color: "#9598a1", shape: pos.side === "long" ? "arrowUp" : "arrowDown" });
    }
    return out;
  }, [bars, core.sim.closed, pos]);

  // ---- Estadísticas ----
  const sessionTrades = useMemo(() => {
    if (!instrument || !accountId) return [];
    return enrich(
      core.sim.closed.map((c) => closedToTrade(c, { state, accountId, instrumentId: instrument.id, setupId, tf, label: "" })),
      state.instruments,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core.sim.closed, instrument, accountId, state.instruments]);
  const sess = summarize(sessionTrades);
  const allBt = useMemo(() => summarize(filterTrades(state, {}, BACKTEST_MODE)), [state]);

  const nowLabel = lastBase ? toLocalString(settings.displayTz, lastBase.time + 60).replace("T", " ") : "—";
  const tzShort = settings.displayTz === NY ? "NY" : settings.displayTz.split("/").pop()?.replace("_", " ");
  const resetKey = `${loadKey}|${effTfMin}`;

  const newSession = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setConfirmReset(false);
    setHlines([]);
    setRects([]);
    void load();
  };

  return (
    <div className="space-y-3">
      {/* ---- Barra de sesión ---- */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Instrumento</span>
          <select value={instrument?.id ?? ""} onChange={(e) => setInstrumentId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {btInstruments.map((i) => (
              <option key={i.id} value={i.id}>{i.symbol}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Inicio (hora NY)</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">Datos</span>
          <select value={sourceChoice} onChange={(e) => setSourceChoice(e.target.value as SourceChoice)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="auto">Automático</option>
            <option value="futures">Futuros (últimos 30 días)</option>
            <option value="index">Índice (historial completo)</option>
          </select>
        </label>
        <Button onClick={() => load()} disabled={loading} className="h-9">
          {loading ? "Cargando…" : core.cursor >= 0 ? "Recargar" : "Cargar sesión"}
        </Button>
        <Button variant="outline" className="h-9" onClick={() => fileRef.current?.click()} title="Cargar velas desde un CSV exportado de TradingView">
          <Upload className="h-4 w-4" /> CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importCsv(f);
            e.target.value = "";
          }}
        />
        {source && (
          <span className="ml-auto self-center rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground">
            {source === "futures" ? `${sym?.toUpperCase()}=F futuros` : source === "index" ? `${sym === "nq" ? "Nasdaq-100" : "S&P 500"} índice` : "CSV propio"}
          </span>
        )}
      </div>
      {error && <p className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-500">{error}</p>}

      {/* ---- Barra del gráfico ---- */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border p-1">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              disabled={t.minutes < baseMin}
              onClick={() => setTf(t.id)}
              className={cn(
                "rounded px-2 py-1 font-mono text-xs transition-colors disabled:opacity-30",
                tf === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolBtn active={tool === "none"} onClick={() => setTool("none")} title="Cursor (Esc)"><MousePointer2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "hline"} onClick={() => setTool("hline")} title="Línea horizontal (H)"><Minus className="h-4 w-4" /></ToolBtn>
        <ToolBtn active={tool === "rect"} onClick={() => setTool("rect")} title="Rectángulo (R): dos clics"><Square className="h-4 w-4" /></ToolBtn>
        <ToolBtn
          active={false}
          onClick={() => {
            setHlines([]);
            setRects([]);
          }}
          title="Borrar dibujos"
        >
          <Trash2 className="h-4 w-4" />
        </ToolBtn>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolBtn active={false} onClick={() => setSettingsOpen(true)} title="Indicadores y configuración"><Settings2 className="h-4 w-4" /></ToolBtn>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {nowLabel} {tzShort}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        {/* ---- Gráfico + controles de replay ---- */}
        <div className="space-y-2">
          <div className="relative h-[calc(100vh-290px)] min-h-[360px] overflow-hidden rounded-lg border" style={{ background: settings.colors.background }}>
            {core.cursor < 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <p>Elegí instrumento y fecha de inicio, y tocá <b>Cargar sesión</b>.</p>
                <p className="text-xs">Se cargan unos días de contexto antes del inicio; desde ahí avanzás vela por vela.</p>
              </div>
            ) : (
              <ReplayChart
                bars={bars}
                tfSec={effTfMin * 60}
                tz={settings.displayTz}
                colors={settings.colors}
                lines={lines}
                boxes={boxes}
                rays={rays}
                priceLines={priceLines}
                markers={markers}
                tool={tool}
                resetKey={resetKey}
                onLineDrag={onLineDrag}
                onDraw={onDraw}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => setPlaying((p) => !p)} disabled={core.cursor < 0}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "Pausa" : "Play"}
            </Button>
            <Button size="sm" variant="outline" onClick={stepBase} disabled={core.cursor < 0 || atEnd} title="Avanzar 1 vela de 1m (→)">
              <StepForward className="h-4 w-4" /> 1m
            </Button>
            <Button size="sm" variant="outline" onClick={stepTf} disabled={core.cursor < 0 || atEnd} title="Avanzar hasta el cierre de la vela actual (Shift + →)">
              <SkipForward className="h-4 w-4" /> {tfDef.label}
            </Button>
            <span className="flex items-center gap-1">
              <input type="time" value={jumpTo} onChange={(e) => setJumpTo(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs" />
              <Button size="sm" variant="outline" onClick={doJump} disabled={core.cursor < 0} title="Avanzar hasta esa hora de NY (el simulador procesa todo en el medio)">
                <ChevronsRight className="h-4 w-4" /> Ir
              </Button>
            </span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Velocidad
              <input
                type="range"
                min={30}
                max={1500}
                step={10}
                value={1530 - settings.speedMs}
                onChange={(e) => setSettings({ ...settings, speedMs: 1530 - Number(e.target.value) })}
                className="w-24 accent-foreground"
              />
            </label>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={newSession} disabled={core.cursor < 0}>
              <RotateCcw className="h-4 w-4" /> {confirmReset ? "¿Seguro? Tocá de nuevo" : "Reiniciar sesión"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Atajos: → avanza 1m · Shift + → cierra la vela del timeframe · Espacio play/pausa · H línea · R rectángulo · Esc cursor.
            Los fills se simulan sobre velas de 1m; si en la misma vela se tocan stop y objetivo, cuenta el stop.
          </p>
        </div>

        {/* ---- Panel derecho ---- */}
        <div className="space-y-4">
          <OrderPanel
            key={instrument?.id}
            price={price}
            pointValue={instrument?.pointValue ?? 0}
            commission={instrument?.commission ?? 0}
            riskUsd={settings.riskUsd}
            defaultSlPts={settings.defaultSlPts}
            defaultTpR={settings.defaultTpR}
            position={pos}
            pending={core.sim.pending}
            currency={cur}
            setups={state.setups.filter((s) => !s.hidden)}
            setupId={setupId}
            onSetup={setSetupId}
            onOrder={onOrder}
            onClose={() => dispatch({ type: "close" })}
            onBreakeven={() => pos && dispatch({ type: "modifyPos", sl: pos.entry })}
            onCancel={(id) => dispatch({ type: "cancel", id })}
          />

          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Esta sesión</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Stat label="Trades" value={String(sess.count)} />
              <Stat label="Winrate" value={pct(sess.winrate)} />
              <Stat label="PnL" value={money(sess.totalPnl, cur, true)} className={pnlClass(sess.totalPnl)} />
              <Stat label="Exp." value={rMult(sess.expectancyR)} />
              <Stat label="PF" value={sess.profitFactor != null ? sess.profitFactor.toFixed(2) : "—"} />
              <Stat label="Racha −" value={String(sess.maxLossStreak)} />
            </div>
            {sessionTrades.length > 0 && (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {[...sessionTrades].reverse().map((x) => (
                  <li key={x.trade.id} className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                    <span className={x.trade.direction === "long" ? "text-emerald-500" : "text-red-500"}>
                      {x.trade.direction === "long" ? "L" : "S"} {x.trade.entryAt.slice(11, 16)}
                    </span>
                    <span>{rMult(x.m.r)}</span>
                    <span className={pnlClass(x.m.pnl)}>{money(x.m.pnl, cur, true)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Backtest (diario)</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Stat label="Trades" value={String(allBt.count)} />
              <Stat label="Winrate" value={pct(allBt.winrate)} />
              <Stat label="Exp." value={rMult(allBt.expectancyR)} />
            </div>
            <Link
              href="/trading/estadisticas"
              onClick={() => trading.updateSettings({ selectedModeId: BACKTEST_MODE })}
              className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver estadísticas completas
            </Link>
          </div>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onChange={setSettings} />
    </div>
  );
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn("rounded p-1.5 transition-colors", active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className={cn("font-mono text-sm tabular-nums", className)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
