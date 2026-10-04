"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePomodoroContext } from "@/lib/pomodoro-context";
import { formatMinutes } from "@/lib/stats";
import { STUDY_METHODS, methodOfTheDay, type StudyMethod } from "@/lib/methods";
import { LoadingScreen } from "@/components/loading-screen";
import { PlanView } from "@/components/plan/plan-view";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function EstudioPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Estudio />
    </Suspense>
  );
}

function Estudio() {
  const params = useSearchParams();
  const { loaded } = useStore();
  const [tab, setTab] = useState(params.get("tab") === "plan" ? "plan" : "metodos");

  if (!loaded) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-2">
        <p className="eyebrow">Carrera</p>
        <h1 className="display text-5xl md:text-6xl">Estudiar mejor, no más.</h1>
        <p className="max-w-xl text-muted-foreground">
          Métodos con respaldo para ingeniería y ciencias, y el mapa de tu carrera.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="metodos">Métodos</TabsTrigger>
          <TabsTrigger value="plan">Plan de carrera</TabsTrigger>
        </TabsList>
        <TabsContent value="metodos" className="mt-8">
          <MethodsView />
        </TabsContent>
        <TabsContent value="plan" className="mt-8">
          <PlanView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MethodsView() {
  const { sessions } = useStore();
  const today = methodOfTheDay();

  // Uso y calidad promedio por método: para ver cuál te rinde más.
  const usage = useMemo(() => {
    const map = new Map<string, { minutes: number; count: number; qSum: number; qCount: number }>();
    for (const s of sessions) {
      if (!s.methodId) continue;
      const u = map.get(s.methodId) ?? { minutes: 0, count: 0, qSum: 0, qCount: 0 };
      u.minutes += s.minutes;
      u.count++;
      if (s.quality) {
        u.qSum += s.quality;
        u.qCount++;
      }
      map.set(s.methodId, u);
    }
    return map;
  }, [sessions]);

  const rest = STUDY_METHODS.filter((m) => m.id !== today.id);

  return (
    <div className="space-y-10">
      <MethodCard method={today} featured usage={usage.get(today.id)} />

      <div className="space-y-3">
        <h2 className="display text-3xl">Biblioteca</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rest.map((m) => (
            <MethodCard key={m.id} method={m} usage={usage.get(m.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MethodCard({
  method,
  featured = false,
  usage,
}: {
  method: StudyMethod;
  featured?: boolean;
  usage?: { minutes: number; count: number; qSum: number; qCount: number };
}) {
  const pomo = usePomodoroContext();
  const [open, setOpen] = useState(featured);
  const selected = pomo.methodId === method.id;

  // Llegando desde /estudio#<id> (ej. "Ver pasos" en Enfoque), abrir ese método.
  useEffect(() => {
    if (window.location.hash !== `#${method.id}`) return;
    const t = setTimeout(() => {
      setOpen(true);
      document.getElementById(method.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(t);
  }, [method.id]);

  return (
    <SpotlightCard className={cn("scroll-mt-24 space-y-4", featured && "md:p-8")}>
      <div id={method.id} className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">{featured ? "Método del día" : method.bestFor}</p>
        {usage && (
          <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {usage.count} foco{usage.count === 1 ? "" : "s"} · {formatMinutes(usage.minutes)}
            {usage.qCount > 0 && ` · calidad ${(usage.qSum / usage.qCount).toFixed(1)}/5`}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <h3 className={cn("display", featured ? "text-5xl" : "text-3xl")}>{method.name}</h3>
        <p className="text-sm text-muted-foreground">{method.summary}</p>
        {featured && <p className="text-xs text-muted-foreground">Ideal para: {method.bestFor}</p>}
      </div>

      {open && (
        <div className="space-y-4">
          <ol className={cn("grid gap-3", featured && "md:grid-cols-2")}>
            {method.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="grid gap-3 border-t pt-4 text-sm md:grid-cols-2">
            <p>
              <span className="eyebrow mb-1 block">En el foco</span>
              {method.focusTip}
            </p>
            <p>
              <span className="eyebrow mb-1 block">Por qué funciona</span>
              {method.why}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selected ? "secondary" : featured ? "default" : "outline"}
          onClick={() => pomo.setMethodId(selected ? "" : method.id)}
        >
          {selected ? (
            <>
              <Check className="h-3.5 w-3.5" /> En el próximo foco
            </>
          ) : (
            "Usar en el próximo foco"
          )}
        </Button>
        {!featured && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
            {open ? "Ocultar pasos" : "Ver pasos"}
          </Button>
        )}
      </div>
    </SpotlightCard>
  );
}
