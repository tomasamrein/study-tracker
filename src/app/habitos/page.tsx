"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/stats";
import { habitBestStreak, habitDoneInLast, habitStreak, lastNDayKeys } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { SUGGESTED_HABITS } from "@/lib/life";
import { LoadingScreen } from "@/components/loading-screen";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { ViceCounter } from "@/components/habits/vice-counter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = 35;

export default function HabitosPage() {
  const { loaded, habits, habitLog, vices, addHabit, deleteHabit, toggleHabit, addVice, deleteVice } =
    useStore();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Habit["kind"]>("build");
  const [viceName, setViceName] = useState("");
  const days = useMemo(() => lastNDayKeys(DAYS), []);
  const today = dayKey();

  if (!loaded) return <LoadingScreen />;

  const active = habits.filter((h) => !h.archived);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="space-y-2">
        <p className="eyebrow">Hábitos y detox</p>
        <h1 className="display text-5xl md:text-6xl">Sos lo que repetís.</h1>
        <p className="max-w-xl text-muted-foreground">
          Construí lo que te suma y medí cuántos días llevás limpio: no fap, redes o lo que quieras cortar.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hoy</CardTitle>
            <CardDescription>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</CardDescription>
          </CardHeader>
          <CardContent>
            <HabitChecklist day={today} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Días limpio</CardTitle>
            <CardDescription>Si recaés, registralo: la honestidad es parte del proceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {vices.map((v) => (
              <div key={v.id} className="group relative">
                <ViceCounter vice={v} />
                <button
                  type="button"
                  onClick={() => deleteVice(v.id)}
                  className="absolute -top-1 right-0 text-[11px] text-muted-foreground transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                >
                  quitar
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = viceName.trim();
                if (!v) return;
                addVice(v);
                setViceName("");
              }}
              className="flex items-center gap-2 border-t pt-4"
            >
              <Input
                value={viceName}
                onChange={(e) => setViceName(e.target.value)}
                placeholder="Nuevo contador (ej. Redes sociales)"
              />
              <Button type="submit" variant="outline" size="icon" aria-label="Agregar contador">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-3xl">Historial</h2>
            <p className="text-sm text-muted-foreground">Tocá un cuadrado para marcar o desmarcar ese día.</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-6">
            {active.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sumá tu primer hábito abajo.</p>
            )}
            {active.map((h) => {
              const done = habitDoneInLast(habitLog, h.id, DAYS);
              return (
                <div key={h.id} className="group space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 text-sm">
                      {h.name}
                      <span className="eyebrow ml-2 text-[10px]">
                        {h.kind === "avoid" ? "detox" : "construir"}
                      </span>
                    </p>
                    <span className="order-last w-full font-mono text-[11px] text-muted-foreground tabular-nums sm:order-none sm:w-auto">
                      racha {habitStreak(habitLog, h.id)}d · récord {habitBestStreak(habitLog, h.id)}d ·{" "}
                      {Math.round((done / DAYS) * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => deleteHabit(h.id)}
                      aria-label={`Eliminar ${h.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(35,minmax(0,1fr))] sm:gap-[3px]">
                    {days.map((d, i) => {
                      const on = habitLog[d]?.includes(h.id) ?? false;
                      return (
                        <button
                          key={d}
                          type="button"
                          title={format(parseISO(d), "EEE d MMM", { locale: es })}
                          onClick={() => toggleHabit(d, h.id)}
                          className={cn(
                            "aspect-square rounded-[3px] transition-colors",
                            i < DAYS - 14 && "hidden sm:block",
                            on ? "bg-foreground" : "bg-muted hover:bg-foreground/20",
                            d === today && "ring-1 ring-foreground/50 ring-offset-1 ring-offset-card",
                          )}
                          aria-label={`${h.name} ${d}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const v = name.trim();
                if (!v) return;
                addHabit(v, kind);
                setName("");
              }}
              className="flex flex-wrap items-center gap-2 border-t pt-5"
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nuevo hábito (ej. Meditar 10 min)"
                className="min-w-48 flex-1"
              />
              <div className="flex rounded-md border p-0.5">
                {(["build", "avoid"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs transition-colors",
                      kind === k ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {k === "build" ? "Construir" : "Evitar"}
                  </button>
                ))}
              </div>
              <Button type="submit" variant="outline">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <SuggestedHabits />
    </div>
  );
}

function SuggestedHabits() {
  const { habits, addHabit } = useStore();
  const names = new Set(habits.filter((h) => !h.archived).map((h) => h.name.toLowerCase()));
  const pending = SUGGESTED_HABITS.filter((s) => !names.has(s.name.toLowerCase()));
  if (pending.length === 0) return null;
  return (
    <section className="space-y-4">
      <div>
        <h2 className="display text-3xl">Sugeridos</h2>
        <p className="text-sm text-muted-foreground">Hábitos que suelen tener las personas que rinden alto. Sumalos con un toque.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {pending.map((s) => (
          <Card key={s.name} size="sm">
            <CardContent className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {s.name}
                  <span className="eyebrow ml-2 text-[10px]">{s.kind === "avoid" ? "detox" : "construir"}</span>
                </p>
                <p className="text-xs text-muted-foreground">{s.why}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => addHabit(s.name, s.kind)}>
                <Plus className="h-4 w-4" /> Sumar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
