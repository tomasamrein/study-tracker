import { format, getHours, parseISO } from "date-fns";
import { computeStreak, totalMinutes } from "./stats";
import type { StudySession } from "./types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export interface AchievementStatus extends Achievement {
  unlocked: boolean;
}

interface Input {
  sessions: StudySession[];
  dailyGoalMinutes: number;
  now?: Date;
}

/** Definiciones de logros + condición de desbloqueo. */
const DEFS: (Achievement & { test: (m: Metrics) => boolean })[] = [
  {
    id: "first-session",
    title: "Primer paso",
    description: "Registrá tu primera sesión de estudio",
    emoji: "🌱",
    test: (m) => m.sessionCount >= 1,
  },
  {
    id: "goal-met",
    title: "Meta cumplida",
    description: "Alcanzá tu meta diaria de horas",
    emoji: "🎯",
    test: (m) => m.dailyGoalMinutes > 0 && m.maxDayMinutes >= m.dailyGoalMinutes,
  },
  {
    id: "focus-2h",
    title: "En ritmo",
    description: "Estudiá 2 horas en un mismo día",
    emoji: "⏱️",
    test: (m) => m.maxDayMinutes >= 120,
  },
  {
    id: "marathon",
    title: "Maratón",
    description: "Estudiá 4 horas en un mismo día",
    emoji: "🔥",
    test: (m) => m.maxDayMinutes >= 240,
  },
  {
    id: "streak-3",
    title: "Constancia",
    description: "Mantené una racha de 3 días",
    emoji: "📅",
    test: (m) => m.longestStreak >= 3,
  },
  {
    id: "streak-7",
    title: "Imparable",
    description: "Mantené una racha de 7 días",
    emoji: "🚀",
    test: (m) => m.longestStreak >= 7,
  },
  {
    id: "streak-30",
    title: "Leyenda",
    description: "Mantené una racha de 30 días",
    emoji: "👑",
    test: (m) => m.longestStreak >= 30,
  },
  {
    id: "total-10h",
    title: "Diez horas",
    description: "Acumulá 10 horas de estudio",
    emoji: "⭐",
    test: (m) => m.totalMin >= 600,
  },
  {
    id: "total-50h",
    title: "Cincuenta horas",
    description: "Acumulá 50 horas de estudio",
    emoji: "🌟",
    test: (m) => m.totalMin >= 3000,
  },
  {
    id: "total-100h",
    title: "Centenario",
    description: "Acumulá 100 horas de estudio",
    emoji: "💯",
    test: (m) => m.totalMin >= 6000,
  },
  {
    id: "multi-5",
    title: "Multidisciplinario",
    description: "Estudiá 5 materias distintas",
    emoji: "📚",
    test: (m) => m.distinctSubjects >= 5,
  },
  {
    id: "early-bird",
    title: "Madrugador",
    description: "Estudiá antes de las 7 de la mañana",
    emoji: "🌅",
    test: (m) => m.earlyBird,
  },
  {
    id: "night-owl",
    title: "Búho nocturno",
    description: "Estudiá entre la medianoche y las 5 AM",
    emoji: "🦉",
    test: (m) => m.nightOwl,
  },
];

interface Metrics {
  sessionCount: number;
  totalMin: number;
  maxDayMinutes: number;
  longestStreak: number;
  distinctSubjects: number;
  earlyBird: boolean;
  nightOwl: boolean;
  dailyGoalMinutes: number;
}

function metrics({ sessions, dailyGoalMinutes, now }: Input): Metrics {
  const byDay = new Map<string, number>();
  let earlyBird = false;
  let nightOwl = false;
  for (const s of sessions) {
    const d = parseISO(s.startedAt);
    const k = format(d, "yyyy-MM-dd");
    byDay.set(k, (byDay.get(k) ?? 0) + s.minutes);
    const h = getHours(d);
    if (h < 7) earlyBird = true;
    if (h < 5) nightOwl = true;
  }
  return {
    sessionCount: sessions.length,
    totalMin: totalMinutes(sessions),
    maxDayMinutes: byDay.size ? Math.max(...byDay.values()) : 0,
    longestStreak: computeStreak(sessions, now).longest,
    distinctSubjects: new Set(sessions.map((s) => s.subjectId)).size,
    earlyBird,
    nightOwl,
    dailyGoalMinutes,
  };
}

export function computeAchievements(input: Input): AchievementStatus[] {
  const m = metrics(input);
  return DEFS.map(({ test, ...def }) => ({ ...def, unlocked: test(m) }));
}
