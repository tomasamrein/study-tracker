// Tipos centrales de Study Tracker

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

export interface StudySession {
  id: string;
  subjectId: string;
  /** ISO date-time de inicio de la sesión. */
  startedAt: string;
  /** Minutos efectivos de estudio (sólo foco, sin descansos). */
  minutes: number;
  /** Origen de la sesión. */
  source: "pomodoro" | "manual";
  note?: string;
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

export interface AppState {
  subjects: Subject[];
  sessions: StudySession[];
  settings: PomodoroSettings;
  /** Meta diaria de estudio en minutos. */
  dailyGoalMinutes: number;
  /** Link o URI de Spotify para el reproductor (playlist/álbum/track). */
  spotifyUri: string | null;
  /** Última fecha (yyyy-mm-dd) en que se festejó la meta cumplida. */
  lastGoalCelebrated: string | null;
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
  /** Color hex para gráficos/leyendas. */
  color: string;
  /** Cuenta como materia "terminada" (aprobada de algún modo). */
  done: boolean;
}

export const STATE_META: Record<SubjectState, StateMeta> = {
  pendiente: {
    label: "Pendiente",
    badge: "bg-muted text-muted-foreground border-border",
    color: "#94a3b8",
    done: false,
  },
  cursando: {
    label: "En curso",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    color: "#3b82f6",
    done: false,
  },
  regular: {
    label: "Regular (falta final)",
    badge:
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    color: "#f59e0b",
    done: false,
  },
  aprobada: {
    label: "Aprobada",
    badge:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    color: "#10b981",
    done: true,
  },
  promocionada: {
    label: "Promocionada",
    badge:
      "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    color: "#8b5cf6",
    done: true,
  },
  recursando: {
    label: "Recursando",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    color: "#ef4444",
    done: false,
  },
  libre: {
    label: "Libre",
    badge:
      "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    color: "#f97316",
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
