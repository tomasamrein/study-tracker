import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import type { StudySession, Subject } from "./types";

const DAY_KEY = "yyyy-MM-dd";

export function formatMinutes(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatHours(min: number): string {
  return (min / 60).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function totalMinutes(sessions: StudySession[]): number {
  return sessions.reduce((acc, s) => acc + s.minutes, 0);
}

/** Minutos estudiados en un día concreto (por defecto hoy). */
export function todayMinutes(
  sessions: StudySession[],
  now: Date = new Date(),
): number {
  const key = format(now, DAY_KEY);
  return sessions.reduce(
    (acc, s) => (format(parseISO(s.startedAt), DAY_KEY) === key ? acc + s.minutes : acc),
    0,
  );
}

export interface SubjectHours {
  subjectId: string;
  name: string;
  code: string;
  color: string;
  minutes: number;
}

export function minutesBySubject(
  sessions: StudySession[],
  subjects: Subject[],
  palette: string[],
): SubjectHours[] {
  const byId = new Map<string, number>();
  for (const s of sessions) {
    byId.set(s.subjectId, (byId.get(s.subjectId) ?? 0) + s.minutes);
  }
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const result: SubjectHours[] = [];
  let i = 0;
  for (const [subjectId, minutes] of byId.entries()) {
    const subj = subjectMap.get(subjectId);
    result.push({
      subjectId,
      name: subj?.name ?? "Materia eliminada",
      code: subj?.code ?? "—",
      color: palette[i % palette.length],
      minutes,
    });
    i++;
  }
  return result.sort((a, b) => b.minutes - a.minutes);
}

/** Conjunto de días (yyyy-MM-dd) en los que hubo al menos una sesión. */
function studyDaySet(sessions: StudySession[]): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) {
    set.add(format(parseISO(s.startedAt), DAY_KEY));
  }
  return set;
}

export interface StreakInfo {
  current: number;
  longest: number;
  /** true si ya estudiaste hoy. */
  studiedToday: boolean;
  activeDays: Set<string>;
}

export function computeStreak(
  sessions: StudySession[],
  now: Date = new Date(),
): StreakInfo {
  const days = studyDaySet(sessions);
  const todayKey = format(now, DAY_KEY);
  const yesterdayKey = format(subDays(now, 1), DAY_KEY);
  const studiedToday = days.has(todayKey);

  // Racha actual: contar hacia atrás desde hoy (o ayer si hoy aún no estudiaste).
  let current = 0;
  if (days.has(todayKey) || days.has(yesterdayKey)) {
    let cursor = days.has(todayKey) ? now : subDays(now, 1);
    while (days.has(format(cursor, DAY_KEY))) {
      current++;
      cursor = subDays(cursor, 1);
    }
  }

  // Racha más larga histórica.
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = parseISO(key);
    if (prev && differenceInCalendarDays(d, prev) === 1) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, studiedToday, activeDays: days };
}

export interface DailyPoint {
  date: string; // ISO yyyy-MM-dd
  label: string; // etiqueta corta
  minutes: number;
}

function bucketByDay(
  sessions: StudySession[],
  start: Date,
  end: Date,
  labelFmt: string,
): DailyPoint[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = format(parseISO(s.startedAt), DAY_KEY);
    totals.set(key, (totals.get(key) ?? 0) + s.minutes);
  }
  return eachDayOfInterval({ start, end }).map((d) => {
    const key = format(d, DAY_KEY);
    return {
      date: key,
      label: format(d, labelFmt, { locale: es }),
      minutes: totals.get(key) ?? 0,
    };
  });
}

export interface PeriodSummary {
  totalMinutes: number;
  points: DailyPoint[];
  /** Promedio diario de minutos sobre los días del período. */
  dailyAverage: number;
  rangeLabel: string;
}

export function weeklySummary(
  sessions: StudySession[],
  now: Date = new Date(),
): PeriodSummary {
  const start = startOfWeek(now, { weekStartsOn: 1, locale: es });
  const end = endOfWeek(now, { weekStartsOn: 1, locale: es });
  const points = bucketByDay(sessions, start, end, "EEEEEE");
  const total = points.reduce((a, p) => a + p.minutes, 0);
  return {
    totalMinutes: total,
    points,
    dailyAverage: total / 7,
    rangeLabel: `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM", { locale: es })}`,
  };
}

export function monthlySummary(
  sessions: StudySession[],
  now: Date = new Date(),
): PeriodSummary {
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const points = bucketByDay(sessions, start, end, "d");
  const total = points.reduce((a, p) => a + p.minutes, 0);
  return {
    totalMinutes: total,
    points,
    dailyAverage: total / points.length,
    rangeLabel: format(now, "MMMM yyyy", { locale: es }),
  };
}

/** Últimos `days` días como puntos diarios (para heatmap/gráfico de barras). */
export function lastNDays(
  sessions: StudySession[],
  days: number,
  now: Date = new Date(),
): DailyPoint[] {
  const start = subDays(now, days - 1);
  return bucketByDay(sessions, start, now, "d MMM");
}
