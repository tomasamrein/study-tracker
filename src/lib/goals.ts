import { horizonRange, minutesInRange } from "./stats";
import type { Goal, GoalHorizon, StudySession } from "./types";

export const HORIZON_LABEL: Record<GoalHorizon, string> = {
  semana: "Esta semana",
  mes: "Este mes",
  trimestre: "Este trimestre",
};

export interface GoalProgress {
  value: number;
  target: number;
  /** 0–100. */
  pct: number;
  complete: boolean;
}

/** Progreso de una meta. Las de minutos se calculan solas con las sesiones. */
export function goalProgress(
  goal: Goal,
  sessions: StudySession[],
  now: Date = new Date(),
): GoalProgress {
  if (goal.metric === "check") {
    return { value: goal.done ? 1 : 0, target: 1, pct: goal.done ? 100 : 0, complete: goal.done };
  }
  const target = Math.max(1, goal.target ?? 1);
  let value = goal.progress ?? 0;
  if (goal.metric === "minutes") {
    const { start, end } = horizonRange(goal.horizon, now);
    value = minutesInRange(sessions, start, end, goal.areaId);
  }
  const pct = Math.min(100, Math.round((value / target) * 100));
  return { value, target, pct, complete: goal.done || value >= target };
}
