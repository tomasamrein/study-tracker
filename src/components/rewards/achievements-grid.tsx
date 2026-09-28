"use client";

import { Trophy } from "lucide-react";
import { useAchievements } from "@/lib/use-achievements";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AchievementsGrid() {
  const achievements = useAchievements();
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-foreground" />
              Logros
            </CardTitle>
            <CardDescription>Recompensas por tu constancia</CardDescription>
          </div>
          <span className="rounded-full border px-3 py-1 font-mono text-xs tabular-nums">
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
                "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
                a.unlocked
                  ? "border-foreground/30"
                  : "border-dashed opacity-40",
              )}
              title={a.description}
            >
              <span className="text-2xl leading-none grayscale">{a.emoji}</span>
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
