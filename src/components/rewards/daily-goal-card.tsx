"use client";

import { useMemo, useState } from "react";
import { Target, Pencil, Check, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatHours, formatMinutes, todayMinutes } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const QUICK = [60, 120, 180, 240]; // 1h, 2h, 3h, 4h

export function DailyGoalCard() {
  const { sessions, dailyGoalMinutes, setDailyGoal } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(dailyGoalMinutes);

  const doneMin = useMemo(() => todayMinutes(sessions), [sessions]);
  const goal = dailyGoalMinutes;
  const pct = goal > 0 ? Math.min(100, Math.round((doneMin / goal) * 100)) : 0;
  const reached = goal > 0 && doneMin >= goal;
  const remaining = Math.max(0, goal - doneMin);

  // Anillo SVG.
  const R = 54;
  const C = 2 * Math.PI * R;

  const openEdit = () => {
    setDraft(dailyGoalMinutes);
    setOpen(true);
  };
  const save = () => {
    setDailyGoal(draft);
    setOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="11"
            />
            <circle
              cx="64"
              cy="64"
              r={R}
              fill="none"
              stroke={reached ? "#10b981" : "var(--primary)"}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct / 100)}
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {reached ? (
              <Trophy className="h-7 w-7 text-emerald-500" />
            ) : (
              <span className="font-heading text-2xl font-bold tabular-nums">
                {pct}%
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {formatMinutes(doneMin)}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Meta diaria</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Objetivo de hoy:{" "}
            <span className="font-medium text-foreground">
              {formatHours(goal)} h
            </span>
          </p>

          {reached ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              ¡Meta cumplida! Crack 🎉
            </p>
          ) : (
            <p className="mt-2 text-sm">
              Te faltan{" "}
              <span className="font-semibold text-primary">
                {formatMinutes(remaining)}
              </span>{" "}
              para lograrla.
            </p>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tu meta diaria</DialogTitle>
            <DialogDescription>
              ¿Cuántas horas querés estudiar por día?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="text-center">
              <span className="font-heading text-4xl font-bold tabular-nums">
                {formatHours(draft)}
              </span>
              <span className="ml-1 text-lg text-muted-foreground">horas</span>
            </div>

            <Slider
              value={[draft]}
              min={30}
              max={480}
              step={30}
              onValueChange={(v) => setDraft(v[0])}
            />

            <div className="grid grid-cols-4 gap-2">
              {QUICK.map((m) => (
                <Button
                  key={m}
                  variant={draft === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDraft(m)}
                  className={cn("tabular-nums")}
                >
                  {formatHours(m)} h
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar meta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
