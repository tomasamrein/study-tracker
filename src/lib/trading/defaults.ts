import type {
  AccountRules,
  Instrument,
  ListItem,
  TradingMode,
  TradingSettings,
  TradingState,
} from "./types";

export const TRADING_STATE_VERSION = 1;

/** Reglas por defecto: Lucid 50K Flex EOD. VERIFICAR con la web oficial. */
export const LUCID_50K_FLEX_EOD: AccountRules = {
  maxLoss: 2000,
  drawdownType: "eod",
  mllLockAt: null,
  dailyLoss: 1200,
  maxMinis: 4,
  maxMicros: 40,
  consistencyPct: null,
  profitTarget: null,
  payoutDays: 5,
  payoutDayMin: 150,
  payoutsToLive: 5,
  scalingNotes: "",
};

export const EMPTY_RULES: AccountRules = {
  maxLoss: null,
  drawdownType: "eod",
  mllLockAt: null,
  dailyLoss: null,
  maxMinis: null,
  maxMicros: null,
  consistencyPct: null,
  profitTarget: null,
  payoutDays: null,
  payoutDayMin: null,
  payoutsToLive: null,
  scalingNotes: "",
};

export const DEFAULT_MODES: TradingMode[] = [
  { id: "backtest", name: "Backtest", hidden: false, targetTrades: 100 },
  { id: "paper", name: "Paper", hidden: false, targetTrades: 50 },
  { id: "eval", name: "Eval", hidden: false, targetTrades: null },
  { id: "pa", name: "PA", hidden: false, targetTrades: null },
  { id: "live", name: "Live", hidden: false, targetTrades: null },
];

export const DEFAULT_INSTRUMENTS: Instrument[] = [
  { id: "mnq", symbol: "MNQ", name: "Micro E-mini Nasdaq-100", pointValue: 2, commission: 0, micro: true },
  { id: "nq", symbol: "NQ", name: "E-mini Nasdaq-100", pointValue: 20, commission: 0, micro: false },
];

const items = (names: string[]): ListItem[] =>
  names.map((name) => ({
    id: name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
  }));

export const DEFAULT_SETUPS = items(["Sweep + FVG"]);
export const DEFAULT_SESSIONS = items(["Asia", "Londres", "Nueva York AM", "Nueva York PM"]);
export const DEFAULT_EMOTIONS = items(["Calma", "Ansiedad", "FOMO", "Revancha", "Confianza", "Miedo", "Aburrimiento"]);

export const DEFAULT_SETTINGS: TradingSettings = {
  currency: "USD",
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd/MM/yyyy",
  selectedModeId: "all",
  defaultInstrumentId: "mnq",
  defaultAccountId: null,
  timeframes: ["1m", "5m", "15m", "1h", "4h", "D"],
  limits: {
    maxTradesPerDay: null,
    maxDailyLossUsd: null,
    maxDailyLossR: null,
    maxContracts: null,
    warnPct: 50,
    dangerPct: 80,
  },
};

export const EMPTY_PLAN = {
  objective: "",
  instruments: "MNQ",
  schedule: "",
  allowedSetups: "",
  never: "",
  riskPerTrade: "",
  dailyStop: "",
  notes: "",
};

export const DEFAULT_PRE_CHECKLIST = items([
  "Revisé noticias del día",
  "Marqué niveles clave en el contexto",
  "Sé cuánto arriesgo por trade y mi corte diario",
  "Estoy descansado y sin revancha pendiente",
]);

export const DEFAULT_CLOSE_CHECKLIST = items([
  "Cargué todos los trades",
  "Revisé capturas y anoté errores",
  "Respeté el corte diario",
]);

export const DEFAULT_PHASE_GOALS = [
  {
    id: "goal-backtest",
    title: "De Backtest a Paper",
    modeId: "backtest",
    nextModeId: "paper",
    criteria: [
      { id: "c1", metric: "trades" as const, target: 100 },
      { id: "c2", metric: "expectancy" as const, target: 0.01 },
    ],
  },
  {
    id: "goal-paper",
    title: "De Paper a Eval",
    modeId: "paper",
    nextModeId: "eval",
    criteria: [
      { id: "c1", metric: "trades" as const, target: 50 },
      { id: "c2", metric: "expectancy" as const, target: 0.01 },
      { id: "c3", metric: "planPct" as const, target: 90 },
    ],
  },
];

export function freshTradingState(): TradingState {
  return {
    version: TRADING_STATE_VERSION,
    modes: DEFAULT_MODES.map((m) => ({ ...m })),
    accounts: [],
    instruments: DEFAULT_INSTRUMENTS.map((i) => ({ ...i })),
    trades: [],
    setups: DEFAULT_SETUPS.map((s) => ({ ...s })),
    sessions: DEFAULT_SESSIONS.map((s) => ({ ...s })),
    emotions: DEFAULT_EMOTIONS.map((s) => ({ ...s })),
    tags: [],
    journal: {},
    payouts: [],
    expenses: [],
    plan: { ...EMPTY_PLAN },
    preChecklist: DEFAULT_PRE_CHECKLIST.map((s) => ({ ...s })),
    closeChecklist: DEFAULT_CLOSE_CHECKLIST.map((s) => ({ ...s })),
    reviews: [],
    phaseGoals: structuredClone(DEFAULT_PHASE_GOALS),
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

/**
 * Normaliza un estado guardado (posiblemente viejo o incompleto) al modelo
 * actual. Acá van las migraciones entre versiones.
 */
export function migrateTradingState(saved: Partial<TradingState> | null | undefined): TradingState {
  const base = freshTradingState();
  if (!saved) return base;
  return {
    version: TRADING_STATE_VERSION,
    modes: saved.modes?.length ? saved.modes : base.modes,
    accounts: (saved.accounts ?? []).map((a) => ({
      ...a,
      rules: { ...EMPTY_RULES, ...(a.rules ?? {}) },
    })),
    instruments: saved.instruments?.length ? saved.instruments : base.instruments,
    trades: saved.trades ?? [],
    setups: saved.setups ?? base.setups,
    sessions: saved.sessions ?? base.sessions,
    emotions: saved.emotions ?? base.emotions,
    tags: saved.tags ?? [],
    journal: saved.journal ?? {},
    payouts: saved.payouts ?? [],
    expenses: saved.expenses ?? [],
    plan: { ...EMPTY_PLAN, ...(saved.plan ?? {}) },
    preChecklist: saved.preChecklist ?? base.preChecklist,
    closeChecklist: saved.closeChecklist ?? base.closeChecklist,
    reviews: saved.reviews ?? [],
    phaseGoals: saved.phaseGoals ?? base.phaseGoals,
    settings: {
      ...base.settings,
      ...(saved.settings ?? {}),
      limits: { ...base.settings.limits, ...(saved.settings?.limits ?? {}) },
    },
  };
}
