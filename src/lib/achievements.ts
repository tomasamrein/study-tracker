import { format, getHours, parseISO } from "date-fns";
import { areaOf, computeStreak, totalMinutes } from "./stats";
import { bestClean } from "./habits";
import type { StudySession, Vice } from "./types";

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
  vices?: Vice[];
  goalsDone?: number;
  now?: Date;
}

/** Definiciones de logros + condición de desbloqueo. */
const DEFS: (Achievement & { test: (m: Metrics) => boolean })[] = [
  {
    id: "first-session",
    title: "Primer paso",
    description: "Completá tu primer foco",
    emoji: "🌱",
    test: (m) => m.sessionCount >= 1,
  },
  {
    id: "goal-met",
    title: "Meta cumplida",
    description: "Alcanzá tu meta diaria de enfoque",
    emoji: "🎯",
    test: (m) => m.dailyGoalMinutes > 0 && m.maxDayMinutes >= m.dailyGoalMinutes,
  },
  {
    id: "focus-2h",
    title: "En ritmo",
    description: "2 horas de enfoque en un mismo día",
    emoji: "⏱️",
    test: (m) => m.maxDayMinutes >= 120,
  },
  {
    id: "marathon",
    title: "Maratón",
    description: "4 horas de enfoque en un mismo día",
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
    description: "Acumulá 10 horas de enfoque",
    emoji: "⭐",
    test: (m) => m.totalMin >= 600,
  },
  {
    id: "total-50h",
    title: "Cincuenta horas",
    description: "Acumulá 50 horas de enfoque",
    emoji: "🌟",
    test: (m) => m.totalMin >= 3000,
  },
  {
    id: "total-100h",
    title: "Centenario",
    description: "Acumulá 100 horas de enfoque",
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
    id: "agencia-10h",
    title: "Constructor",
    description: "Acumulá 10 horas de enfoque en la agencia",
    emoji: "🛠️",
    test: (m) => m.agencyMin >= 600,
  },
  {
    id: "clean-7",
    title: "Detox",
    description: "7 días limpio de una fuente de dopamina barata",
    emoji: "🧘",
    test: (m) => m.bestClean >= 7,
  },
  {
    id: "clean-30",
    title: "Mente clara",
    description: "30 días limpio de una fuente de dopamina barata",
    emoji: "🧠",
    test: (m) => m.bestClean >= 30,
  },
  {
    id: "goals-3",
    title: "Cumplidor",
    description: "Cumplí 3 metas",
    emoji: "🎯",
    test: (m) => m.goalsDone >= 3,
  },
  {
    id: "early-bird",
    title: "Madrugador",
    description: "Enfocate antes de las 7 de la mañana",
    emoji: "🌅",
    test: (m) => m.earlyBird,
  },
  {
    id: "night-owl",
    title: "Búho nocturno",
    description: "Enfocate entre la medianoche y las 5 AM",
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
  agencyMin: number;
  bestClean: number;
  goalsDone: number;
}

function metrics({ sessions, dailyGoalMinutes, vices = [], goalsDone = 0, now }: Input): Metrics {
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
    distinctSubjects: new Set(sessions.map((s) => s.subjectId).filter(Boolean)).size,
    earlyBird,
    nightOwl,
    dailyGoalMinutes,
    agencyMin: totalMinutes(sessions.filter((s) => areaOf(s) === "agencia")),
    bestClean: vices.reduce((acc, v) => Math.max(acc, bestClean(v, now)), 0),
    goalsDone,
  };
}

export function computeAchievements(input: Input): AchievementStatus[] {
  const m = metrics(input);
  return DEFS.map(({ test, ...def }) => ({ ...def, unlocked: test(m) }));
}
