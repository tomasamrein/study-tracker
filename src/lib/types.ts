// Tipos centrales de Foco — tracker de éxito personal

export type SubjectState =
  | "pendiente"
  | "cursando"
  | "regular"
  | "aprobada"
  | "promocionada"
  | "recursando"
  | "libre";

export type SubjectCategory =
  | "ingreso"
  | "obligatoria"
  | "idioma"
  | "tramo-final"
  | "optativa"
  | "electiva";

export interface Subject {
  id: string;
  code: string;
  name: string;
  state: SubjectState;
  grade: number | null;
  /** Fecha de aprobación/promoción en formato ISO (yyyy-mm-dd) o null. */
  date: string | null;
  year: number | null;
  term: 1 | 2 | null;
  category: SubjectCategory;
  /** Etiqueta de agrupación para la UI, ej. "Año 1 · 1er Cuatrimestre". */
  group: string;
  /** true si la materia fue agregada por el usuario (no viene del plan). */
  custom?: boolean;
}

/** Área de enfoque: a qué dedicás el tiempo (carrera, agencia, etc.). */
export interface FocusArea {
  id: string;
  name: string;
  kind: "carrera" | "agencia" | "custom";
  /** Descripción corta opcional (ej. "Axtar Studio"). */
  hint?: string;
}

export const DEFAULT_AREAS: FocusArea[] = [
  { id: "carrera", name: "Carrera", kind: "carrera", hint: "Materias de la facultad" },
  { id: "trading", name: "Trading", kind: "custom", hint: "Estudio, backtest y revisión de trades" },
  { id: "agencia", name: "Agencia", kind: "agencia", hint: "Sistemas, clientes y proyectos" },
];

/** Sesión de enfoque (antes: sesión de estudio). */
export interface StudySession {
  id: string;
  /** Área a la que se imputa el tiempo. Sesiones viejas → "carrera". */
  areaId?: string;
  /** Materia (sólo para el área carrera). */
  subjectId?: string | null;
  /** Proyecto / cliente / tema libre (ej. para la agencia). */
  label?: string;
  /** Método de estudio usado durante el foco. */
  methodId?: string;
  /** Autoevaluación de la calidad del foco (1–5). */
  quality?: number;
  /** ISO date-time de inicio de la sesión. */
  startedAt: string;
  /** Minutos efectivos de estudio (sólo foco, sin descansos). */
  minutes: number;
  /** Origen de la sesión. */
  source: "pomodoro" | "manual";
  note?: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  /** Día al que pertenece la tarea, en formato ISO (yyyy-mm-dd). */
  day: string;
  /** Materia opcional asociada a la tarea. */
  subjectId?: string | null;
  /** Área opcional asociada a la tarea. */
  areaId?: string | null;
  /** true si es una de las 3 prioridades del día. */
  priority?: boolean;
  /** ISO date-time de creación, para ordenar dentro del día. */
  createdAt: string;
}

export type GoalHorizon = "semana" | "mes" | "trimestre";
export type GoalMetric = "check" | "minutes" | "count";

export interface Goal {
  id: string;
  title: string;
  /** Área asociada; para metas de minutos, "all" o null suma todas. */
  areaId?: string | null;
  horizon: GoalHorizon;
  metric: GoalMetric;
  /** Objetivo numérico (minutos o cantidad). */
  target?: number | null;
  /** Progreso manual para metas de cantidad. */
  progress?: number;
  done: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  /** build: hábito a construir · avoid: algo que evitás (detox). */
  kind: "build" | "avoid";
  createdAt: string;
  archived?: boolean;
}

/** Contador de días limpio de una fuente de dopamina barata. */
export interface Vice {
  id: string;
  name: string;
  /** ISO date-time desde el que estás limpio. */
  since: string;
  /** Historial de recaídas (ISO date-time). */
  relapses: string[];
  /** Mejor racha limpia histórica en días. */
  best: number;
}

export interface DailyEntry {
  intention?: string;
  reviewNote?: string;
  /** Puntaje del día (1–5). */
  score?: number;
  /** Journaling libre del día. */
  journal?: string;
  /** Tres cosas por las que estoy agradecido. */
  gratitude?: string;
  /** Ánimo y energía (1–5). */
  mood?: number;
  energy?: number;
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** Cantidad de focos antes de un descanso largo. */
  roundsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

/** Datos descriptivos del plan de estudios (carrera, universidad). */
export interface PlanMeta {
  career: string;
  university?: string;
  /** Línea secundaria libre, ej. "Plan 2018" o "Legajo 12345". */
  subtitle?: string;
}

export interface AppState {
  subjects: Subject[];
  sessions: StudySession[];
  /** Tareas (ToDo) organizadas por día. */
  todos: TodoItem[];
  settings: PomodoroSettings;
  /** Meta diaria de estudio en minutos. */
  dailyGoalMinutes: number;
  /** Link o URI de Spotify para el reproductor (playlist/álbum/track). */
  spotifyUri: string | null;
  /** Última fecha (yyyy-mm-dd) en que se festejó la meta cumplida. */
  lastGoalCelebrated: string | null;
  /**
   * true si el usuario cargó su propio plan de estudios. En ese caso no se
   * vuelve a sembrar el plan por defecto al cargar/mergear el estado.
   */
  customPlan?: boolean;
  /** Metadatos del plan cargado por el usuario; null usa el plan por defecto. */
  planMeta?: PlanMeta | null;
  areas: FocusArea[];
  goals: Goal[];
  habits: Habit[];
  /** Día (yyyy-mm-dd) → ids de hábitos cumplidos ese día. */
  habitLog: Record<string, string[]>;
  vices: Vice[];
  /** Día (yyyy-mm-dd) → intención / cierre del día. */
  daily: Record<string, DailyEntry>;
  /** Versión del esquema de datos, por si hay migraciones futuras. */
  version: number;
}

export const DEFAULT_DAILY_GOAL_MINUTES = 120;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true,
};

export interface StateMeta {
  label: string;
  /** Clase de color para badges (tailwind). */
  badge: string;
  /** Color CSS (monocromo) para gráficos/leyendas. */
  color: string;
  /** Cuenta como materia "terminada" (aprobada de algún modo). */
  done: boolean;
}

export const STATE_META: Record<SubjectState, StateMeta> = {
  pendiente: {
    label: "Pendiente",
    badge: "border-border text-muted-foreground",
    color: "color-mix(in oklch, var(--foreground) 12%, transparent)",
    done: false,
  },
  cursando: {
    label: "En curso",
    badge: "border-foreground/40 text-foreground",
    color: "color-mix(in oklch, var(--foreground) 55%, transparent)",
    done: false,
  },
  regular: {
    label: "Regular (falta final)",
    badge: "border-foreground/40 border-dashed text-foreground",
    color: "color-mix(in oklch, var(--foreground) 35%, transparent)",
    done: false,
  },
  aprobada: {
    label: "Aprobada",
    badge: "border-foreground bg-foreground text-background",
    color: "var(--foreground)",
    done: true,
  },
  promocionada: {
    label: "Promocionada",
    badge: "border-foreground bg-foreground text-background",
    color: "color-mix(in oklch, var(--foreground) 80%, transparent)",
    done: true,
  },
  recursando: {
    label: "Recursando",
    badge: "border-foreground/30 text-muted-foreground line-through decoration-1",
    color: "color-mix(in oklch, var(--foreground) 22%, transparent)",
    done: false,
  },
  libre: {
    label: "Libre",
    badge: "border-border border-dashed text-muted-foreground",
    color: "color-mix(in oklch, var(--foreground) 18%, transparent)",
    done: false,
  },
};

export const SUBJECT_STATES: SubjectState[] = [
  "pendiente",
  "cursando",
  "regular",
  "aprobada",
  "promocionada",
  "recursando",
  "libre",
];

export const CATEGORY_LABELS: Record<SubjectCategory, string> = {
  ingreso: "Cursos de Ingreso",
  obligatoria: "Materias Obligatorias",
  idioma: "Idiomas",
  "tramo-final": "Tramo Final",
  optativa: "Asignaturas Optativas",
  electiva: "Asignaturas Electivas",
};
