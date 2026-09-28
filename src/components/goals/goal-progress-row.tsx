"use client";

import { Check } from "lucide-react";
import { formatHours } from "@/lib/stats";
import { goalProgress } from "@/lib/goals";
import type { Goal, StudySession } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Fila de meta con barra de progreso fina. */
export function GoalProgressRow({
  goal,
  sessions,
  areaName,
  actions,
}: {
  goal: Goal;
  sessions: StudySession[];
  areaName?: string;
  actions?: React.ReactNode;
}) {
  const p = goalProgress(goal, sessions);
  const valueLabel =
    goal.metric === "minutes"
      ? `${formatHours(p.value)} / ${formatHours(p.target)} h`
      : goal.metric === "count"
        ? `${p.value} / ${p.target}`
        : p.complete
          ? "Hecha"
          : "Pendiente";

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            p.complete ? "border-foreground bg-foreground text-background" : "border-foreground/30",
          )}
        >
          {p.complete && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm", p.complete && "text-muted-foreground")}>
            {goal.title}
          </p>
          {areaName && <p className="text-[11px] text-muted-foreground">{areaName}</p>}
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{valueLabel}</span>
        {actions}
      </div>
      {goal.metric !== "check" && (
        <div className="ml-7 h-px bg-border">
          <div className="h-px bg-foreground transition-[width] duration-500" style={{ width: `${p.pct}%` }} />
        </div>
      )}
    </div>
  );
}
