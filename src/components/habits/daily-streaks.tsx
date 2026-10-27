"use client";

import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { habitBestStreak, habitStreak } from "@/lib/habits";
import { CORE_HABITS } from "@/lib/life";
import { dayKey } from "@/lib/stats";
import CountUp from "@/components/react-bits/CountUp";
import { cn } from "@/lib/utils";

/** Rachas de las metas diarias: un toque marca el día de hoy. */
export function DailyStreaks({ compact = false }: { compact?: boolean }) {
  const { habitLog, toggleHabit } = useStore();
  const today = dayKey();
  const done = habitLog[today] ?? [];

  return (
    <div className="grid grid-cols-3 gap-3">
      {CORE_HABITS.map((h) => {
        const checked = done.includes(h.id);
        const streak = habitStreak(habitLog, h.id);
        return (
          <button
            key={h.id}
            type="button"
            onClick={() => toggleHabit(today, h.id)}
            aria-pressed={checked}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              checked ? "border-foreground bg-foreground/5" : "hover:bg-muted/50",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground">{h.name}</span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  checked ? "border-foreground bg-foreground text-background" : "border-foreground/30",
                )}
              >
                {checked && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </span>
            <span className={cn("display tabular-nums", compact ? "text-4xl" : "text-5xl md:text-6xl")}>
              <CountUp to={streak} duration={1} />
              <span className="ml-1 font-sans text-xs text-muted-foreground">días</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {checked ? "hoy ✓" : "falta hoy"} · récord {habitBestStreak(habitLog, h.id)}d
            </span>
          </button>
        );
      })}
    </div>
  );
}
