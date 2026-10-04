"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, Check, Play, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { usePomodoroContext } from "@/lib/pomodoro-context";
import {
  computeStreak,
  dayKey,
  formatHours,
  formatMinutes,
  todayMinutes,
  weeklySummary,
} from "@/lib/stats";
import { methodOfTheDay } from "@/lib/methods";
import { daysClean } from "@/lib/habits";
import { findNofap } from "@/lib/life";
import { LoadingScreen } from "@/components/loading-screen";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { ViceCounter } from "@/components/habits/vice-counter";
import { GoalProgressRow } from "@/components/goals/goal-progress-row";
import { Spark } from "@/components/spark";
import BlurText from "@/components/react-bits/BlurText";
import CountUp from "@/components/react-bits/CountUp";
import ShinyText from "@/components/react-bits/ShinyText";
import SpotlightCard from "@/components/react-bits/SpotlightCard";
import { TradingSummaryCard } from "@/components/trading/trading-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function greeting(h: number) {
  if (h < 12) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function HoyPage() {
  const store = useStore();
  const { loaded, sessions, dailyGoalMinutes, vices, goals, areas, daily, setDaily } = store;
  const { user } = useAuth();
  const pomo = usePomodoroContext();
  const router = useRouter();
  const firstName = user?.name?.split(" ")[0] ?? null;
  const now = new Date();
  const today = dayKey(now);
  const entry = daily[today] ?? {};

  const data = useMemo(() => {
    const streak = computeStreak(sessions);
    const week = weeklySummary(sessions);
    const todayMin = todayMinutes(sessions);
    // Racha de ritual: días seguidos con intención o cierre registrados.
    let ritual = 0;
    let cursor = daily[dayKey()]?.intention || daily[dayKey()]?.score ? new Date() : subDays(new Date(), 1);
    while (daily[dayKey(cursor)]?.intention || daily[dayKey(cursor)]?.score) {
      ritual++;
      cursor = subDays(cursor, 1);
    }
    return { streak, week, todayMin, ritual };
  }, [sessions, daily]);

  if (!loaded) return <LoadingScreen />;

  const method = methodOfTheDay(now);
  const goalPct = dailyGoalMinutes > 0 ? Math.min(100, (data.todayMin / dailyGoalMinutes) * 100) : 0;
  const weekGoals = goals.filter((g) => g.horizon === "semana").slice(0, 4);
  const nofap = findNofap(vices);
  const areaName = areas.find((a) => a.id === pomo.areaId)?.name ?? "Carrera";

  const startFocus = () => {
    if (!pomo.running && pomo.phase === "focus") pomo.start();
    router.push("/enfoque");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      {/* Encabezado */}
      <header className="space-y-5">
        <p className="eyebrow">{format(now, "EEEE d 'de' MMMM", { locale: es })}</p>
        <BlurText
          text={`${greeting(now.getHours())}${firstName ? `, ${firstName}` : ""}.`}
          className="display text-5xl md:text-7xl"
          delay={80}
          animateBy="words"
        />
        <div className="max-w-xl">
          <IntentionField
            value={entry.intention ?? ""}
            onSave={(intention) => setDaily(today, { intention })}
          />
        </div>
      </header>

      {/* Arranque + números del día */}
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="justify-between">
          <CardContent className="space-y-6">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Deep work de hoy</p>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                meta {formatHours(dailyGoalMinutes)} h
              </p>
            </div>
            <p className="display text-7xl tabular-nums">
              {formatMinutes(data.todayMin)}
            </p>
            <div className="h-px bg-border">
              <div className="h-px bg-foreground transition-[width] duration-700" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={startFocus} className="min-w-44">
                <Play className="h-4 w-4" />
                {pomo.running ? "Volver al foco" : "Empezar deep work"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {areaName} · {pomo.running ? "en curso" : `${store.settings.focusMinutes}′`}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          <Metric label="Racha de enfoque" hint={data.streak.studiedToday ? "hoy sumaste" : "falta el foco de hoy"}>
            <CountUp to={data.streak.current} duration={1} />
            <span className="ml-1 font-sans text-sm text-muted-foreground">d</span>
          </Metric>
          <Metric label="Esta semana" hint={data.week.rangeLabel}>
            {formatHours(data.week.totalMinutes)}
            <span className="ml-1 font-sans text-sm text-muted-foreground">h</span>
          </Metric>
          <Metric
            label="Días de no fap"
            hint={nofap ? `mejor racha ${Math.max(nofap.best, daysClean(nofap))} d` : "creá el contador en Hábitos"}
          >
            <CountUp to={nofap ? daysClean(nofap) : 0} duration={1} />
            <span className="ml-1 font-sans text-sm text-muted-foreground">d</span>
          </Metric>
          <Metric label="Ritual" hint="días con intención o cierre">
            <CountUp to={data.ritual} duration={1} />
            <span className="ml-1 font-sans text-sm text-muted-foreground">d</span>
          </Metric>
        </div>
      </section>

      {data.streak.current >= 2 && (
        <p className="text-center text-sm">
          <ShinyText
            text={`${data.streak.current} días seguidos enfocado. No rompas la cadena.`}
            speed={3}
            color="color-mix(in oklch, var(--foreground) 45%, transparent)"
            shineColor="var(--foreground)"
          />
        </p>
      )}

      {/* Top 3 + hábitos */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 3 del día</CardTitle>
            <CardDescription>Si sólo hacés esto, el día cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopThree day={today} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Hábitos</CardTitle>
              <CardDescription>Marcá lo que ya cumpliste hoy.</CardDescription>
            </div>
            <Link href="/habitos" className="text-xs text-muted-foreground hover:text-foreground">
              Editar
            </Link>
          </CardHeader>
          <CardContent>
            <HabitChecklist day={today} />
          </CardContent>
        </Card>
      </section>

      {/* Método del día */}
      <section>
        <SpotlightCard className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">Método del día</p>
            <p className="text-xs text-muted-foreground">{method.bestFor}</p>
          </div>
          <div className="space-y-2">
            <h2 className="display text-4xl md:text-5xl">{method.name}</h2>
            <p className="max-w-2xl text-muted-foreground">{method.summary}</p>
          </div>
          <ol className="grid gap-3 md:grid-cols-2">
            {method.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <Button
              variant={pomo.methodId === method.id ? "secondary" : "default"}
              onClick={() => pomo.setMethodId(method.id)}
            >
              {pomo.methodId === method.id ? (
                <>
                  <Check className="h-4 w-4" /> Aplicado al próximo foco
                </>
              ) : (
                "Usar en el próximo foco"
              )}
            </Button>
            <Link
              href="/estudio"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Ver todos los métodos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </SpotlightCard>
      </section>

      {/* Metas + detox */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle>Metas de la semana</CardTitle>
              <CardDescription>Se actualizan solas con tus focos.</CardDescription>
            </div>
            <Link href="/metas" className="text-xs text-muted-foreground hover:text-foreground">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="divide-y">
            {weekGoals.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Sin metas semanales. <Link href="/metas" className="underline">Creá una</Link>.
              </p>
            ) : (
              weekGoals.map((g) => (
                <GoalProgressRow
                  key={g.id}
                  goal={g}
                  sessions={sessions}
                  areaName={areas.find((a) => a.id === g.areaId)?.name}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detox de dopamina</CardTitle>
            <CardDescription>Días limpio desde la última recaída.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {vices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin contadores. Sumalos en <Link href="/habitos" className="underline">Hábitos</Link>.
              </p>
            ) : (
              vices.map((v) => <ViceCounter key={v.id} vice={v} />)
            )}
          </CardContent>
        </Card>
      </section>

      <TradingSummaryCard />

      {/* Cierre del día */}
      <section className="space-y-3">
        <Link href="/diario" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          Escribir en el diario <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <DayReview
          hour={now.getHours()}
          score={entry.score}
          note={entry.reviewNote ?? ""}
          onScore={(score) => setDaily(today, { score })}
          onNote={(reviewNote) => setDaily(today, { reviewNote })}
        />
      </section>
    </div>
  );
}

function Metric({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="eyebrow">{label}</p>
        <p className="display text-5xl tabular-nums">{children}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function IntentionField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(!value);

  if (!editing && value) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="group text-left">
        <p className="eyebrow mb-1">Intención</p>
        <p className="text-lg">
          {value}
          <span className="ml-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
            editar
          </span>
        </p>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = draft.trim();
        if (!v) return;
        onSave(v);
        setEditing(false);
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="¿Qué haría que hoy sea un buen día?"
        className="h-10"
        autoFocus={!!value}
      />
      <Button type="submit" variant="outline" className="h-10">
        Fijar
      </Button>
    </form>
  );
}

/** Tareas prioritarias del día (máx. 3). */
function TopThree({ day }: { day: string }) {
  const { todos, addTodo, toggleTodo, updateTodo } = useStore();
  const [text, setText] = useState("");
  const dayTodos = todos.filter((t) => t.day === day);
  const top = dayTodos.filter((t) => t.priority);
  const others = dayTodos.filter((t) => !t.priority && !t.done);

  return (
    <div className="space-y-3">
      <Spark>
        <ul className="divide-y">
          {top.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => toggleTodo(t.id)}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="w-5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    t.done ? "border-foreground bg-foreground text-background" : "border-foreground/30",
                  )}
                >
                  {t.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>
                  {t.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Spark>

      {top.length < 3 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = text.trim();
            if (!v) return;
            addTodo({ text: v, day, priority: true });
            setText("");
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Prioridad ${top.length + 1}…`}
          />
          <Button type="submit" size="icon" variant="outline" aria-label="Agregar prioridad">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}

      {top.length < 3 && others.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {others.slice(0, 5).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateTodo(t.id, { priority: true })}
              className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              + {t.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DayReview({
  hour,
  score,
  note,
  onScore,
  onNote,
}: {
  hour: number;
  score?: number;
  note: string;
  onScore: (n: number) => void;
  onNote: (s: string) => void;
}) {
  const [open, setOpen] = useState(hour >= 18 || !!score);
  const [draft, setDraft] = useState(note);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed py-4 text-sm text-muted-foreground hover:text-foreground"
      >
        Cierre del día — disponible a la noche (o tocá para hacerlo ahora)
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cierre del día</CardTitle>
        <CardDescription>¿Cómo estuvo hoy? Dos minutos de honestidad.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onScore(n)}
              className={cn(
                "h-10 w-10 rounded-md border font-mono text-sm transition-colors",
                score === n ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== note && onNote(draft.trim())}
          placeholder="Qué salió bien, qué te distrajo, qué cambiás mañana."
          rows={3}
        />
      </CardContent>
    </Card>
  );
}
