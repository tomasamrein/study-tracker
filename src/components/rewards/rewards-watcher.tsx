"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { computeAchievements } from "@/lib/achievements";
import { formatHours, todayMinutes } from "@/lib/stats";
import { burst, celebrate } from "@/lib/confetti";

/**
 * Observa el progreso y dispara las recompensas:
 * - Confeti + felicitación al cumplir la meta diaria (una vez por día).
 * - Toast + estallido al desbloquear un logro nuevo durante la sesión.
 * No renderiza nada.
 */
export function RewardsWatcher() {
  const {
    loaded,
    sessions,
    dailyGoalMinutes,
    lastGoalCelebrated,
    markGoalCelebrated,
  } = useStore();

  // Meta diaria cumplida.
  useEffect(() => {
    if (!loaded || dailyGoalMinutes <= 0) return;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const done = todayMinutes(sessions);
    if (done >= dailyGoalMinutes && lastGoalCelebrated !== todayKey) {
      celebrate();
      toast.success("¡Meta diaria cumplida! 🎉", {
        description: `Estudiaste ${formatHours(done)} h hoy. ¡Sos un crack, Tomás!`,
        duration: 6000,
      });
      markGoalCelebrated(todayKey);
    }
  }, [loaded, sessions, dailyGoalMinutes, lastGoalCelebrated, markGoalCelebrated]);

  // Logros nuevos (sin notificar los ya desbloqueados al cargar).
  const initRef = useRef(false);
  const prevRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!loaded) return;
    const list = computeAchievements({ sessions, dailyGoalMinutes });
    const unlockedIds = list.filter((a) => a.unlocked).map((a) => a.id);
    if (!initRef.current) {
      prevRef.current = new Set(unlockedIds);
      initRef.current = true;
      return;
    }
    const newly = unlockedIds.filter((id) => !prevRef.current.has(id));
    if (newly.length > 0) {
      prevRef.current = new Set(unlockedIds);
      burst();
      for (const id of newly) {
        const a = list.find((x) => x.id === id);
        if (a)
          toast.success(`🏆 Logro desbloqueado: ${a.title}`, {
            description: a.description,
            duration: 5000,
          });
      }
    }
  }, [loaded, sessions, dailyGoalMinutes]);

  return null;
}
