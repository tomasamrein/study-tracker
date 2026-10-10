import type { ChartColors } from "@/components/backtest/replay-chart";
import { DEFAULT_FVG, DEFAULT_SESSIONS, type FvgOptions, type SessionDef } from "./indicators";
import type { SimState } from "./sim";

/** Configuración del backtesting (por dispositivo). */
export interface MaLine {
  id: string;
  type: "ema" | "sma";
  length: number;
  color: string;
  enabled: boolean;
}

export interface BtSettings {
  displayTz: string;
  colors: ChartColors;
  mas: MaLine[];
  vwap: { enabled: boolean; color: string };
  fvg: FvgOptions & { enabled: boolean; bull: string; bear: string; ibull: string; ibear: string };
  sessions: SessionDef[];
  sessionsEnabled: boolean;
  levels: { pdhl: boolean; midnight: boolean };
  /** Milisegundos entre velas en reproducción. */
  speedMs: number;
  riskUsd: number;
  /** Stop por defecto en puntos y objetivo en R al abrir a mercado. */
  defaultSlPts: number;
  defaultTpR: number;
}

export const DARK_COLORS: ChartColors = {
  up: "#089981",
  down: "#f23645",
  wickUp: "#089981",
  wickDown: "#f23645",
  background: "#0b0b0c",
  text: "#b2b5be",
  grid: true,
  gridColor: "rgba(255,255,255,0.05)",
};

export const LIGHT_COLORS: ChartColors = {
  ...DARK_COLORS,
  background: "#ffffff",
  text: "#131722",
  gridColor: "rgba(0,0,0,0.06)",
};

export const DEFAULT_BT_SETTINGS: BtSettings = {
  displayTz: "America/New_York",
  colors: DARK_COLORS,
  mas: [
    { id: "ma1", type: "ema", length: 9, color: "#2962ff", enabled: false },
    { id: "ma2", type: "ema", length: 21, color: "#ff9800", enabled: false },
    { id: "ma3", type: "sma", length: 200, color: "#9c27b0", enabled: false },
  ],
  vwap: { enabled: false, color: "#e91e63" },
  fvg: { ...DEFAULT_FVG, enabled: true, bull: "rgba(8,153,129,0.18)", bear: "rgba(242,54,69,0.18)", ibull: "rgba(41,98,255,0.22)", ibear: "rgba(255,152,0,0.22)" },
  sessions: DEFAULT_SESSIONS,
  sessionsEnabled: true,
  levels: { pdhl: true, midnight: true },
  speedMs: 400,
  riskUsd: 200,
  defaultSlPts: 20,
  defaultTpR: 2,
};

export interface HLine {
  id: string;
  price: number;
  color: string;
}

export interface Rect {
  id: string;
  from: number;
  to: number;
  top: number;
  bottom: number;
  color: string;
}

export type DataSource = "futures" | "index" | "csv";

/** Sesión de replay guardada para retomarla. */
export interface ReplaySession {
  instrumentId: string;
  source: DataSource;
  /** Inicio elegido, "yyyy-MM-ddTHH:mm" hora de NY. */
  start: string;
  /** Hasta dónde se avanzó (segundos UTC, apertura de la última vela base visible). */
  cursor: number | null;
  tf: string;
  hlines: HLine[];
  rects: Rect[];
  sim: SimState;
  /** Ids de trades cerrados ya guardados en el diario. */
  saved: string[];
  setupId: string | null;
}

const SETTINGS_KEY = "study-tracker:backtest-settings";
const SESSION_KEY = "study-tracker:backtest-session";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

export function loadBtSettings(): BtSettings {
  const s = read<Partial<BtSettings>>(SETTINGS_KEY);
  if (!s) return DEFAULT_BT_SETTINGS;
  const d = DEFAULT_BT_SETTINGS;
  return {
    ...d,
    ...s,
    colors: { ...d.colors, ...(s.colors ?? {}) },
    vwap: { ...d.vwap, ...(s.vwap ?? {}) },
    fvg: { ...d.fvg, ...(s.fvg ?? {}) },
    levels: { ...d.levels, ...(s.levels ?? {}) },
    mas: s.mas?.length ? s.mas : d.mas,
    sessions: s.sessions?.length ? s.sessions : d.sessions,
  };
}

export const saveBtSettings = (s: BtSettings) => write(SETTINGS_KEY, s);
export const loadReplaySession = () => read<ReplaySession>(SESSION_KEY);
export const saveReplaySession = (s: ReplaySession) => write(SESSION_KEY, s);
