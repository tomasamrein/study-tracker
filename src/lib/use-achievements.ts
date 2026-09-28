"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { computeAchievements } from "./achievements";
import { goalProgress } from "./goals";

/** Logros calculados con todo el estado (enfoque, detox y metas). */
export function useAchievements() {
  const { sessions, dailyGoalMinutes, vices, goals } = useStore();
  return useMemo(() => {
    const goalsDone = goals.filter((g) => goalProgress(g, sessions).complete).length;
    return computeAchievements({ sessions, dailyGoalMinutes, vices, goalsDone });
  }, [sessions, dailyGoalMinutes, vices, goals]);
}
