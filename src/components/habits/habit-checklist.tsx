"use client";

import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { habitStreak } from "@/lib/habits";
import { dayKey } from "@/lib/stats";
import { Spark } from "@/components/spark";
import { cn } from "@/lib/utils";

/** Lista de hábitos del día con check y racha. */
export function HabitChecklist({ day = dayKey() }: { day?: string }) {
  const { habits, habitLog, toggleHabit } = useStore();
  const active = habits.filter((h) => !h.archived);
  const done = habitLog[day] ?? [];

  if (active.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Todavía no tenés hábitos. Sumalos desde la sección Hábitos.
      </p>
    );
  }

  return (
    <Spark>
      <ul className="divide-y">
        {active.map((h) => {
          const checked = done.includes(h.id);
          const streak = habitStreak(habitLog, h.id);
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => toggleHabit(day, h.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left"
                aria-pressed={checked}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    checked
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/30",
                  )}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    checked && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  {h.name}
                </span>
                {h.kind === "avoid" && (
                  <span className="eyebrow text-[10px]">detox</span>
                )}
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {streak > 0 ? `${streak}d` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Spark>
  );
}
