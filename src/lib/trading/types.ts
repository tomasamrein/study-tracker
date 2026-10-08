/**
 * Modelo de datos de la sección Trading. Vive separado del estado de estudio
 * (`AppState`) para no tocarlo: tiene su propia clave local y sus propios
 * documentos en Firestore.
 */

/** Modo / fase del camino (Backtest, Paper, Eval, PA, Live…). */
export interface TradingMode {
  id: string;
  name: string;
  /** Oculto = no aparece en el selector, pero sus datos se conservan. */
  hidden: boolean;
  /** Cantidad de trades objetivo para la fase (opcional). */
  targetTrades?: number | null;
}

export type AccountStatus = "activa" | "aprobada" | "perdida" | "archivada";

export type DrawdownType = "eod" | "intradia" | "estatico";

/** Reglas por cuenta. Todo editable; los defaults son de Lucid 50K Flex EOD. */
export interface AccountRules {
  /** Max Loss Limit en USD (distancia del piso al pico). */
  maxLoss: number | null;
  drawdownType: DrawdownType;
  /**
   * Balance en el que el piso del MLL deja de subir (ej. balance inicial).
   * null = el piso nunca se congela. A verificar con la firm.
   */
  mllLockAt: number | null;
  /** Daily Loss Limit en USD. */
  dailyLoss: number | null;
  maxMinis: number | null;
  maxMicros: number | null;
  /** Consistencia: % máximo del mejor día sobre el total (null = sin regla). */
  consistencyPct: number | null;
  profitTarget: number | null;
  /** Días de profit requeridos para pedir retiro. */
  payoutDays: number | null;
  /** Ganancia mínima de un día para que cuente para el retiro. */
  payoutDayMin: number | null;
  /** Payouts necesarios para pasar a Live. */
  payoutsToLive: number | null;
  scalingNotes: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  modeId: string;
  firm: string;
  status: AccountStatus;
  size: number;
  /** yyyy-MM-dd */
  startDate: string;
  cost: number;
  recurring: boolean;
  rules: AccountRules;
  notes?: string;
  /** Marcada como dato de ejemplo (se borra con un clic). */
  seed?: boolean;
  createdAt: string;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  /** USD por punto por contrato. */
  pointValue: number;
  /** Comisión ida y vuelta por contrato (USD). */
  commission: number;
  /** Micro (true) o mini (false): para chequear el tamaño máximo. */
  micro: boolean;
}

export type Direction = "long" | "short";

export interface Trade {
  id: string;
  accountId: string;
  modeId: string;
  instrumentId: string;
  direction: Direction;
  /** ISO date-time */
  entryAt: string;
  exitAt?: string | null;
  entry: number;
  stop?: number | null;
  target?: number | null;
  exit: number;
  contracts: number;
  /** Comisión total del trade; null = usar la del instrumento. */
  commission?: number | null;
  setupId?: string | null;
  contextTf?: string;
  entryTf?: string;
  sessionId?: string | null;
  followedPlan: boolean;
  brokenRule?: string;
  emotionBefore?: number | null;
  emotionDuring?: number | null;
  emotionAfter?: number | null;
  emotionTags?: string[];
  notes?: string;
  lesson?: string;
  /** Links a capturas (TradingView, Imgur…). */
  shotBefore?: string;
  shotAfter?: string;
  tags?: string[];
  /** Nota de calidad del setup (A+, A, B, C). */
  grade?: TradeGrade | null;
  seed?: boolean;
  createdAt: string;
}

export const TRADE_GRADES = ["A+", "A", "B", "C"] as const;
export type TradeGrade = (typeof TRADE_GRADES)[number];

/** Ítem simple de lista editable (setups, sesiones, emociones, etiquetas). */
export interface ListItem {
  id: string;
  name: string;
  hidden?: boolean;
}

export interface PersonalLimits {
  maxTradesPerDay: number | null;
  maxDailyLossUsd: number | null;
  maxDailyLossR: number | null;
  maxContracts: number | null;
  /** Umbrales de alerta (% consumido del límite). */
  warnPct: number;
  dangerPct: number;
}

export interface TradingSettings {
  currency: string;
  timezone: string;
  dateFormat: string;
  /** Modo elegido en el toggle; "all" = Todos. */
  selectedModeId: string;
  defaultInstrumentId: string;
  defaultAccountId: string | null;
  timeframes: string[];
  limits: PersonalLimits;
}

/** Diario del día (checklists, emoción, notas). Clave: yyyy-MM-dd. */
export interface DayJournal {
  date: string;
  preChecks: string[];
  closeChecks: string[];
  followedPlan?: boolean | null;
  mistakes?: string;
  learned?: string;
  emotion?: number | null;
  notes?: string;
}

export interface Payout {
  id: string;
  accountId: string;
  date: string;
  amount: number;
  notes?: string;
  seed?: boolean;
}

/** Gasto extra (reactivación, suscripción, datos…) aparte del costo de la cuenta. */
export interface Expense {
  id: string;
  accountId?: string | null;
  date: string;
  amount: number;
  concept: string;
  seed?: boolean;
}

export interface TradingPlan {
  objective: string;
  instruments: string;
  schedule: string;
  allowedSetups: string;
  never: string;
  riskPerTrade: string;
  dailyStop: string;
  notes: string;
}

export type ReviewKind = "semana" | "mes";

export interface Review {
  id: string;
  kind: ReviewKind;
  /** yyyy-MM-dd del inicio del período. */
  period: string;
  best: string;
  worst: string;
  mistakes: string;
  improve: string;
  notes: string;
}

export type CriterionMetric =
  | "trades"
  | "expectancy"
  | "winrate"
  | "planPct"
  | "profitFactor"
  | "pnl"
  | "payoutDays";

export interface PhaseCriterion {
  id: string;
  metric: CriterionMetric;
  /** Valor mínimo a alcanzar. */
  target: number;
}

export interface PhaseGoal {
  id: string;
  title: string;
  /** Modo cuyos trades se miden. */
  modeId: string;
  /** Modo siguiente (solo descriptivo). */
  nextModeId?: string | null;
  criteria: PhaseCriterion[];
}

export interface TradingState {
  version: number;
  modes: TradingMode[];
  accounts: TradingAccount[];
  instruments: Instrument[];
  trades: Trade[];
  setups: ListItem[];
  sessions: ListItem[];
  emotions: ListItem[];
  tags: ListItem[];
  journal: Record<string, DayJournal>;
  payouts: Payout[];
  expenses: Expense[];
  plan: TradingPlan;
  preChecklist: ListItem[];
  closeChecklist: ListItem[];
  reviews: Review[];
  phaseGoals: PhaseGoal[];
  settings: TradingSettings;
}

export const ALL_MODES = "all";
