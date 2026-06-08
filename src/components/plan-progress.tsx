"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  STATE_META,
  SUBJECT_STATES,
  type Subject,
  type SubjectState,
} from "@/lib/types";

export function PlanProgress({ subjects }: { subjects: Subject[] }) {
  const obligatorias = subjects.filter((s) => s.category === "obligatoria");
  const doneObl = obligatorias.filter((s) => STATE_META[s.state].done).length;
  const pct = obligatorias.length
    ? Math.round((doneObl / obligatorias.length) * 100)
    : 0;

  const counts = SUBJECT_STATES.reduce(
    (acc, st) => {
      acc[st] = subjects.filter((s) => s.state === st).length;
      return acc;
    },
    {} as Record<SubjectState, number>,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Avance de la carrera</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Obligatorias aprobadas
            </span>
            <span className="text-sm font-semibold">
              {doneObl}/{obligatorias.length} · {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SUBJECT_STATES.filter((st) => counts[st] > 0).map((st) => (
            <div
              key={st}
              className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATE_META[st].color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">
                  {counts[st]}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {STATE_META[st].label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
