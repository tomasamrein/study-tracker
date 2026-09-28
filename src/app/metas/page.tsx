"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { HORIZON_LABEL, goalProgress } from "@/lib/goals";
import { minutesByArea, formatHours } from "@/lib/stats";
import type { GoalHorizon, GoalMetric } from "@/lib/types";
import { LoadingScreen } from "@/components/loading-screen";
import { GoalProgressRow } from "@/components/goals/goal-progress-row";
import { DailyGoalCard } from "@/components/rewards/daily-goal-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HORIZONS: GoalHorizon[] = ["semana", "mes", "trimestre"];
const METRIC_LABEL: Record<GoalMetric, string> = {
  minutes: "Horas de enfoque",
  count: "Cantidad",
  check: "Sí / No",
};
const ALL = "all";

export default function MetasPage() {
  const { loaded, goals, sessions, areas, addGoal, updateGoal, deleteGoal } = useStore();

  if (!loaded) return <LoadingScreen />;

  const areaName = (id?: string | null) =>
    id && id !== ALL ? areas.find((a) => a.id === id)?.name : "Todas las áreas";

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="space-y-2">
        <p className="eyebrow">Metas</p>
        <h1 className="display text-5xl md:text-6xl">Qué querés lograr.</h1>
        <p className="max-w-xl text-muted-foreground">
          Las metas de horas se completan solas con tus focos. Las de cantidad las sumás a mano.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <DailyGoalCard />
        <AreasCard />
      </div>

      {HORIZONS.map((h) => {
        const list = goals.filter((g) => g.horizon === h);
        if (list.length === 0) return null;
        const complete = list.filter((g) => goalProgress(g, sessions).complete).length;
        return (
          <section key={h} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-3xl">{HORIZON_LABEL[h]}</h2>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {complete}/{list.length}
              </span>
            </div>
            <Card>
              <CardContent className="divide-y">
                {list.map((g) => (
                  <GoalProgressRow
                    key={g.id}
                    goal={g}
                    sessions={sessions}
                    areaName={g.metric === "minutes" ? areaName(g.areaId) : undefined}
                    actions={
                      <div className="flex items-center">
                        {g.metric === "count" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateGoal(g.id, { progress: Math.max(0, (g.progress ?? 0) - 1) })}
                              aria-label="Restar"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateGoal(g.id, { progress: (g.progress ?? 0) + 1 })}
                              aria-label="Sumar"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {g.metric === "check" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateGoal(g.id, { done: !g.done })}
                          >
                            {g.done ? "Reabrir" : "Hecha"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => deleteGoal(g.id)}
                          aria-label="Eliminar meta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        );
      })}

      <NewGoalForm onAdd={addGoal} />
    </div>
  );
}

function NewGoalForm({
  onAdd,
}: {
  onAdd: ReturnType<typeof useStore>["addGoal"];
}) {
  const { areas } = useStore();
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizon>("semana");
  const [metric, setMetric] = useState<GoalMetric>("minutes");
  const [areaId, setAreaId] = useState<string>("carrera");
  const [target, setTarget] = useState("10");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const n = Number(target);
    onAdd({
      title: t,
      horizon,
      metric,
      areaId: metric === "minutes" ? areaId : null,
      target: metric === "minutes" ? Math.round(n * 60) : metric === "count" ? Math.round(n) : null,
      progress: 0,
    });
    setTitle("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva meta</CardTitle>
        <CardDescription>Concreta y medible: “8 h de agencia”, “3 simulacros”, “Aprobar Física I”.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-6">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Meta</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. 8 h de agencia" />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Período</Label>
            <Select value={horizon} onValueChange={(v) => setHorizon(v as GoalHorizon)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {HORIZON_LABEL[h]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block text-xs text-muted-foreground">Tipo</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRIC_LABEL) as GoalMetric[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METRIC_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {metric !== "check" && (
            <div className="md:col-span-2">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {metric === "minutes" ? "Horas" : "Objetivo"}
              </Label>
              <Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          )}
          {metric === "minutes" && (
            <div className="md:col-span-3">
              <Label className="mb-1.5 block text-xs text-muted-foreground">Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas las áreas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end md:col-span-6">
            <Button type="submit">
              <Plus className="h-4 w-4" /> Crear meta
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Áreas de enfoque: horas totales y gestión de áreas propias. */
function AreasCard() {
  const { areas, sessions, addArea, updateArea, deleteArea } = useStore();
  const [name, setName] = useState("");
  const totals = new Map(minutesByArea(sessions, areas).map((a) => [a.areaId, a.minutes]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Áreas de enfoque</CardTitle>
        <CardDescription>A qué le dedicás tu tiempo. Renombralas o sumá nuevas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {areas.map((a) => (
            <li key={a.id} className="group flex items-center gap-3 py-2">
              <Input
                defaultValue={a.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== a.name) updateArea(a.id, { name: v });
                }}
                className="h-8 flex-1 border-transparent bg-transparent px-1 shadow-none hover:border-input dark:bg-transparent"
                aria-label={`Nombre del área ${a.name}`}
              />
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatHours(totals.get(a.id) ?? 0)} h
              </span>
              {a.kind === "custom" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => deleteArea(a.id)}
                  aria-label={`Eliminar ${a.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = name.trim();
            if (!v) return;
            addArea(v);
            setName("");
          }}
          className="flex items-center gap-2"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva área (ej. Lectura)" />
          <Button type="submit" variant="outline" size="icon" aria-label="Agregar área">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
