"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeAchievements } from "@/lib/achievements";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AchievementsGrid() {
  const { sessions, dailyGoalMinutes } = useStore();

  const achievements = useMemo(
    () => computeAchievements({ sessions, dailyGoalMinutes }),
    [sessions, dailyGoalMinutes],
  );
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Logros
            </CardTitle>
            <CardDescription>Recompensas por tu constancia</CardDescription>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary tabular-nums">
            {unlocked}/{achievements.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
                a.unlocked
                  ? "border-primary/30 bg-primary/5"
                  : "border-dashed opacity-55 grayscale",
              )}
              title={a.description}
            >
              <span className="text-3xl leading-none">{a.emoji}</span>
              <span className="mt-1 text-xs font-semibold leading-tight">
                {a.title}
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {a.description}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
