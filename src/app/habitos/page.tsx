"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/stats";
import { habitDoneInLast, habitStreak, lastNDayKeys } from "@/lib/habits";
import { CORE_IDS } from "@/lib/life";
import { LoadingScreen } from "@/components/loading-screen";
import { DailyStreaks } from "@/components/habits/daily-streaks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAYS = 14;

export default function HabitosPage() {
  const { loaded, habits, habitLog, addHabit, deleteHabit, toggleHabit } = useStore();
  const [name, setName] = useState("");
  const days = useMemo(() => lastNDayKeys(DAYS), []);
  const today = dayKey();

  if (!loaded) return <LoadingScreen />;

  const active = habits.filter((h) => !h.archived);

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="space-y-2">
        <p className="eyebrow">Hábitos</p>
        <h1 className="display text-5xl md:text-6xl">Sos lo que repetís.</h1>
        <p className="max-w-xl text-muted-foreground">
          Tres metas por día. Marcalas y no cortes la racha.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="display text-3xl">Metas diarias</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })} · tocá una meta para marcarla hoy.
          </p>
        </div>
        <DailyStreaks />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-3xl">Historial</h2>
            <p className="text-sm text-muted-foreground">Últimas dos semanas. Tocá un día para corregirlo.</p>
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
                    </p>
                    <span className="order-last w-full font-mono text-[11px] text-muted-foreground tabular-nums sm:order-none sm:w-auto">
                      racha {habitStreak(habitLog, h.id)}d · {done}/{DAYS}
                    </span>
                    {!CORE_IDS.has(h.id) && <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100"
                      onClick={() => deleteHabit(h.id)}
                      aria-label={`Eliminar ${h.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>}
                  </div>
                  <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:gap-1.5">
                    {days.map((d) => {
                      const on = habitLog[d]?.includes(h.id) ?? false;
                      return (
                        <button
                          key={d}
                          type="button"
                          title={format(parseISO(d), "EEE d MMM", { locale: es })}
                          onClick={() => toggleHabit(d, h.id)}
                          className={cn(
                            "aspect-square rounded-[3px] transition-colors",
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
                addHabit(v, "build");
                setName("");
              }}
              className="flex flex-wrap items-center gap-2 border-t pt-5"
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sumar otro hábito (ej. Gimnasio)"
                className="min-w-48 flex-1"
              />
              <Button type="submit" variant="outline">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
